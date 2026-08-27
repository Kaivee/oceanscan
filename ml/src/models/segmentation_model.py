"""
YOLOv8-Seg Model Wrapper
==========================
Wraps Ultralytics YOLO segmentation models with device fallback,
inference timing, and OceanScan-compatible result formatting.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import torch
from ultralytics import YOLO

# Class mapping — order must match training config
CLASS_NAMES = ["Ghost Net", "Metal Drum", "Shipwreck", "Natural Formation"]

RISK_MAP: dict[str, str] = {
    "Ghost Net": "HIGH",
    "Metal Drum": "MEDIUM",
    "Shipwreck": "HIGH",
    "Natural Formation": "LOW",
}


@dataclass
class Detection:
    """Single detection result."""
    class_id: int
    class_name: str
    confidence: float
    bbox: list[int]                     # [x1, y1, x2, y2] in pixels
    polygon: list[list[float]]          # Normalized segmentation vertices [[x, y], ...]
    risk: str


@dataclass
class InferenceResult:
    """Complete inference result for one image."""
    detections: list[Detection]
    latency_ms: float
    device: str
    image_shape: list[int]              # [H, W]
    model_name: str


def _resolve_device() -> str:
    """Select best available device: CUDA > MPS > CPU."""
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


class SonarSegmentationModel:
    """YOLOv8-seg inference wrapper for sonar debris detection.

    Parameters
    ----------
    model_path : str or Path
        Path to the .pt weights file. If the file does not exist,
        the pretrained yolov8s-seg model is downloaded automatically.
    device : str or None
        Force a specific device. None = auto-detect.
    conf_threshold : float
        Default confidence threshold for filtering detections.
    iou_threshold : float
        IoU threshold for NMS.
    """

    def __init__(
        self,
        model_path: str | Path = "yolov8s-seg.pt",
        device: str | None = None,
        conf_threshold: float = 0.5,
        iou_threshold: float = 0.45,
    ) -> None:
        self.model_path = Path(model_path)
        self.device = device or _resolve_device()
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self._model: YOLO | None = None
        self._load_model()

    def _load_model(self) -> None:
        """Load the YOLO model onto the target device."""
        try:
            self._model = YOLO(str(self.model_path))
            self._model.to(self.device)
        except Exception as e:
            # Fallback to CPU if device load fails
            if self.device != "cpu":
                print(f"Warning: Failed to load on {self.device}, falling back to CPU: {e}")
                self.device = "cpu"
                self._model = YOLO(str(self.model_path))
                self._model.to("cpu")
            else:
                raise

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def predict(
        self,
        image: np.ndarray,
        *,
        conf_threshold: float | None = None,
        clahe_enabled: bool = True,
    ) -> InferenceResult:
        """Run segmentation inference on a single image.

        Parameters
        ----------
        image : np.ndarray
            Preprocessed grayscale or BGR image (H, W) or (H, W, 3).
        conf_threshold : float or None
            Override the default confidence threshold.
        clahe_enabled : bool
            Metadata flag indicating whether CLAHE was applied (for logging).

        Returns
        -------
        InferenceResult
            Structured inference results.
        """
        if self._model is None:
            raise RuntimeError("Model not loaded. Call _load_model() first.")

        # Ensure BGR input for YOLO
        if image.ndim == 2:
            img_bgr = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        else:
            img_bgr = image.copy()

        conf = conf_threshold if conf_threshold is not None else self.conf_threshold

        # Run inference with timing
        start = time.perf_counter()
        results = self._model.predict(
            img_bgr,
            conf=conf,
            iou=self.iou_threshold,
            device=self.device,
            verbose=False,
        )
        latency_ms = (time.perf_counter() - start) * 1000

        # Parse results
        detections: list[Detection] = []
        result = results[0]  # Single image

        h, w = img_bgr.shape[:2]

        if result.boxes is not None and len(result.boxes) > 0:
            for i in range(len(result.boxes)):
                cls_id = int(result.boxes.cls[i].item())
                conf_score = float(result.boxes.conf[i].item())

                # Bounding box
                xyxy = result.boxes.xyxy[i].cpu().numpy()
                bbox = [
                    int(xyxy[0]), int(xyxy[1]),
                    int(xyxy[2]), int(xyxy[3]),
                ]

                # Segmentation polygon
                polygon: list[list[float]] = []
                if result.masks is not None and i < len(result.masks):
                    mask_data = result.masks.xy[i]
                    polygon = [
                        [float(pt[0]) / w, float(pt[1]) / h]
                        for pt in mask_data
                    ]
                    # Tighten bbox to the actual mask contour so it hugs the object
                    if len(mask_data) >= 3:
                        xs = [float(pt[0]) for pt in mask_data]
                        ys = [float(pt[1]) for pt in mask_data]
                        bbox = [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))]

                class_name = CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else f"class_{cls_id}"
                risk = RISK_MAP.get(class_name, "UNKNOWN")

                detections.append(Detection(
                    class_id=cls_id,
                    class_name=class_name,
                    confidence=conf_score,
                    bbox=bbox,
                    polygon=polygon,
                    risk=risk,
                ))

        # Cross-class NMS: suppress overlapping boxes across different classes
        if len(detections) > 1:
            detections = self._cross_class_nms(detections, iou_threshold=0.3)

        return InferenceResult(
            detections=detections,
            latency_ms=round(latency_ms, 2),
            device=self.device,
            image_shape=[h, w],
            model_name=self.model_path.stem,
        )

    @staticmethod
    def _cross_class_nms(detections: list[Detection], iou_threshold: float = 0.3) -> list[Detection]:
        """Apply Non-Max Suppression across all classes, keeping highest confidence."""
        if len(detections) <= 1:
            return detections

        # Sort by confidence descending
        sorted_dets = sorted(detections, key=lambda d: d.confidence, reverse=True)
        keep: list[Detection] = []

        for det in sorted_dets:
            is_duplicate = False
            for kept in keep:
                iou = SonarSegmentationModel._compute_iou(det.bbox, kept.bbox)
                if iou >= iou_threshold:
                    is_duplicate = True
                    break
            if not is_duplicate:
                keep.append(det)

        return keep

    @staticmethod
    def _compute_iou(box1: list[int], box2: list[int]) -> float:
        """Compute Intersection over Union for two [x1, y1, x2, y2] boxes."""
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])
        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])

        inter = max(0, x2 - x1) * max(0, y2 - y1)
        area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
        area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
        union = area1 + area2 - inter

        return inter / union if union > 0 else 0.0

    def export_onnx(self, output_path: str | Path = "model.onnx", imgsz: int = 640) -> Path:
        """Export the model to ONNX format.

        Parameters
        ----------
        output_path : str or Path
            Output path for the ONNX file.
        imgsz : int
            Input image size.

        Returns
        -------
        Path
            Path to the exported ONNX file.
        """
        if self._model is None:
            raise RuntimeError("Model not loaded.")

        output_path = Path(output_path)
        self._model.export(format="onnx", imgsz=imgsz, simplify=True)
        print(f"ONNX exported to: {output_path}")
        return output_path
