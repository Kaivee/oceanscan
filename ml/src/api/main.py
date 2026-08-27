"""
OceanScan AI — FastAPI Inference Server
=========================================
POST /api/v1/detect — Sonar debris detection with segmentation masks,
                       risk classification, and Grad-CAM explainability.
GET  /api/v1/health  — System and model status.
"""

from __future__ import annotations

import base64
import io
import logging
import sys
import time
from contextlib import asynccontextmanager
from dataclasses import asdict
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from src.models.segmentation_model import SonarSegmentationModel, InferenceResult
from src.models.explainability import GradCAMGenerator
from src.preprocessing.acoustic_processor import (
    apply_clahe,
    load_sonar_image,
    normalize_backscatter,
    preprocess_pipeline,
    reduce_speckle,
    SUPPORTED_EXTENSIONS,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("oceanscan.api")

# Global state
_model: SonarSegmentationModel | None = None
_gradcam: GradCAMGenerator | None = None
_model_path: str = "yolov8s-seg.pt"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup, clean up on shutdown."""
    global _model, _gradcam, _model_path

    model_path = Path(_model_path)
    # Try to find a trained model first
    for candidate in ["runs/segment/train/weights/best.pt", "model.pt", "yolov8s-seg.pt"]:
        if Path(candidate).exists():
            model_path = Path(candidate)
            break

    logger.info(f"Loading model from: {model_path}")
    try:
        _model = SonarSegmentationModel(model_path=model_path)
        logger.info(f"Model loaded on device: {_model.device}")

        # Initialize Grad-CAM
        if _model._model is not None:
            try:
                _gradcam = GradCAMGenerator(_model._model.model)
                logger.info("Grad-CAM explainability module initialized")
            except Exception as e:
                logger.warning(f"Grad-CAM init failed (non-fatal): {e}")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        logger.warning("Server will start without model — inference endpoints will return 503")

    yield

    # Cleanup
    if _gradcam:
        _gradcam.remove_hooks()
    logger.info("Server shutdown complete")


app = FastAPI(
    title="OceanScan AI — Inference API",
    description="Marine hydrographic debris detection and segmentation",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
async def health_check():
    """Return system and model status."""
    device = "none"
    model_status = "not_loaded"

    if _model and _model.is_loaded:
        model_status = "loaded"
        device = _model.device

    gpu_info: dict[str, Any] = {}
    if torch.cuda.is_available():
        gpu_info = {
            "gpu_name": torch.cuda.get_device_name(0),
            "gpu_memory_total_mb": round(torch.cuda.get_device_properties(0).total_memory / 1024**2),
            "gpu_memory_allocated_mb": round(torch.cuda.memory_allocated(0) / 1024**2),
        }

    return {
        "status": "healthy" if model_status == "loaded" else "degraded",
        "model": {
            "status": model_status,
            "device": device,
            "path": _model.model_path.name if _model else None,
        },
        "system": {
            "python": sys.version.split()[0],
            "torch": torch.__version__,
            "opencv": cv2.__version__,
            **gpu_info,
        },
        "timestamp": time.time(),
    }


@app.post("/api/v1/detect")
async def detect(
    file: UploadFile = File(..., description="Sonar image (.png, .jpg, .tiff)"),
    confidence_threshold: float = Query(0.25, ge=0.01, le=1.0, description="Minimum detection confidence"),
    clahe_enabled: bool = Query(False, description="Apply CLAHE preprocessing"),
    generate_heatmap: bool = Query(False, description="Include Grad-CAM heatmap in response"),
):
    """Detect and classify marine debris in side-scan sonar imagery.

    Returns bounding boxes, segmentation polygons, confidence scores,
    risk classifications, and optionally a Grad-CAM heatmap.
    """
    if _model is None or not _model.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Ensure model weights are available and restart the server.",
        )

    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = Path(file.filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported format '{ext}'. Accepted: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

    # Read file
    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded.")

        nparr = np.frombuffer(contents, np.uint8)
        raw_image = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
        if raw_image is None:
            raise HTTPException(status_code=422, detail="Failed to decode image. File may be corrupted.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading upload: {str(e)}")

    # Convert to grayscale if needed
    if raw_image.ndim == 3:
        if raw_image.shape[2] == 4:
            gray = cv2.cvtColor(raw_image, cv2.COLOR_BGRA2GRAY)
        else:
            gray = cv2.cvtColor(raw_image, cv2.COLOR_BGR2GRAY)
    else:
        gray = raw_image.copy()

    # Normalize 16-bit if needed
    if gray.dtype == np.uint16:
        gray = (gray / 256).astype(np.uint8)

    # Preprocess — if CLAHE is off, send raw BGR to YOLO (it handles its own preprocessing)
    if clahe_enabled:
        processed = preprocess_pipeline(gray, clahe_enabled=True)
    else:
        if raw_image.ndim == 2:
            processed = cv2.cvtColor(raw_image, cv2.COLOR_GRAY2BGR)
        elif raw_image.shape[2] == 4:
            processed = cv2.cvtColor(raw_image, cv2.COLOR_BGRA2BGR)
        else:
            processed = raw_image.copy()

    # Run inference
    try:
        result: InferenceResult = _model.predict(
            processed,
            conf_threshold=confidence_threshold,
            clahe_enabled=clahe_enabled,
        )
    except Exception as e:
        import traceback
        logger.error(f"Inference failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

    # Build response
    detections = []
    for det in result.detections:
        detections.append({
            "class_id": det.class_id,
            "class_name": det.class_name,
            "confidence": round(det.confidence, 4),
            "bbox": det.bbox,
            "polygon": det.polygon,
            "risk_level": det.risk,
        })

    response: dict[str, Any] = {
        "detections": detections,
        "metadata": {
            "image_shape": result.image_shape,
            "model": result.model_name,
            "device": result.device,
            "latency_ms": result.latency_ms,
            "confidence_threshold": confidence_threshold,
            "clahe_enabled": clahe_enabled,
            "total_detections": len(detections),
        },
    }

    # Generate heatmap if requested
    if generate_heatmap and _gradcam is not None:
        try:
            heatmap_img, overlay = _gradcam.generate(processed)

            # Encode as base64
            _, heatmap_buf = cv2.imencode(".png", heatmap_img)
            _, overlay_buf = cv2.imencode(".png", overlay)

            response["heatmap"] = {
                "raw": base64.b64encode(heatmap_buf).decode("utf-8"),
                "overlay": base64.b64encode(overlay_buf).decode("utf-8"),
                "format": "png",
                "colormap": "jet",
            }
        except Exception as e:
            logger.warning(f"Grad-CAM generation failed: {e}")
            response["heatmap"] = None

    return JSONResponse(content=response)
