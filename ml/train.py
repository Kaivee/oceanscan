#!/usr/bin/env python3
"""
OceanScan AI — Training, Validation & Export Script
=====================================================
YOLOv8-seg training pipeline for side-scan sonar debris segmentation.

Usage:
  # ── Real data (recommended) ─────────────────────────────────────────────
  python train.py --prepare-data                  # downloads UATD + FLS (~2.5 GB)
  python train.py --data data/real_sonar/sonar_data.yaml --epochs 50

  # ── Quick demo with synthetic data ──────────────────────────────────────
  python train.py --generate-data --epochs 10

  # ── Full pipeline (real data) ───────────────────────────────────────────
  python train.py --prepare-data --epochs 50 --export --export-formats onnx engine
"""

from __future__ import annotations

import argparse
import logging
import math
import os
import sys
import time
from pathlib import Path

import yaml

logger = logging.getLogger("oceanscan.train")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# ─── Hardware detection ─────────────────────────────────────────────────────

def detect_device() -> str:
    """Detect best available device."""
    try:
        import torch
        if torch.cuda.is_available():
            name = torch.cuda.get_device_name(0)
            vram = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
            logger.info(f"CUDA device detected: {name} ({vram:.1f} GB VRAM)")
            return "0"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            logger.info("Apple MPS device detected")
            return "mps"
    except ImportError:
        pass
    logger.info("No GPU detected — using CPU (will be slow)")
    return "cpu"


def auto_batch_size(device: str, imgsz: int = 640, model_name: str = "yolov8s-seg.pt") -> int:
    """Estimate optimal batch size based on available VRAM.

    Guidelines (YOLOv8s-seg, imgsz=640):
      4 GB VRAM  → batch  4
      6 GB VRAM  → batch  8
      8 GB VRAM  → batch 12
     12 GB VRAM  → batch 16
     16 GB VRAM  → batch 24
     24 GB VRAM  → batch 32
    """
    if device == "cpu":
        return 4
    if device == "mps":
        return 8

    try:
        import torch
        vram = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        # Scale based on VRAM
        if vram >= 24:
            batch = 32
        elif vram >= 16:
            batch = 24
        elif vram >= 12:
            batch = 16
        elif vram >= 8:
            batch = 12
        elif vram >= 6:
            batch = 8
        else:
            batch = 4
        logger.info(f"Auto batch size: {batch} (based on {vram:.1f} GB VRAM)")
        return batch
    except Exception:
        return 8


def estimate_training_time(
    n_images: int,
    epochs: int,
    batch: int,
    imgsz: int,
    device: str,
) -> dict:
    """Estimate training time based on hardware and dataset size.

    Returns dict with hours/minutes/seconds estimates.
    """
    # Seconds per image per epoch (empirical estimates)
    if device == "cpu":
        sec_per_img = 0.35  # ~3 images/sec on modern CPU
    elif device == "mps":
        sec_per_img = 0.08  # ~12 images/sec on M1/M2
    else:
        try:
            import torch
            vram = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
            # Ampere+ GPUs are faster
            if vram >= 16:
                sec_per_img = 0.012  # ~80 images/sec (RTX 3080/4080)
            elif vram >= 8:
                sec_per_img = 0.020  # ~50 images/sec (RTX 3060/4060)
            elif vram >= 6:
                sec_per_img = 0.030  # ~33 images/sec (GTX 1660)
            else:
                sec_per_img = 0.050  # ~20 images/sec (MX/RX 5xx)
        except Exception:
            sec_per_img = 0.025

    # Adjust for image size relative to 640
    size_factor = (imgsz / 640) ** 2

    images_per_epoch = n_images / batch
    sec_per_epoch = images_per_epoch * batch * sec_per_img * size_factor
    total_sec = sec_per_epoch * epochs

    # Add 15% overhead for validation, saving, etc.
    total_sec *= 1.15

    hours = int(total_sec // 3600)
    minutes = int((total_sec % 3600) // 60)
    seconds = int(total_sec % 60)

    return {
        "total_seconds": round(total_sec),
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds,
        "per_epoch_sec": round(sec_per_epoch),
    }


# ─── Core training functions ───────────────────────────────────────────────

def train(
    data_yaml: str | Path,
    model_name: str = "yolov8s-seg.pt",
    epochs: int = 30,
    imgsz: int = 640,
    batch: int = 8,
    lr0: float = 0.001,
    optimizer: str = "AdamW",
    augment: bool = True,
    project: str = "runs/segment",
    name: str = "train",
    exist_ok: bool = False,
    patience: int = 15,
    device: str | None = None,
    workers: int = 4,
    seed: int = 42,
    **kwargs,
) -> Path:
    """Train a YOLOv8-seg model on sonar data.

    Parameters
    ----------
    data_yaml : str or Path
        Path to the YOLO dataset config (sonar_data.yaml).
    model_name : str
        Pretrained model to start from.
    epochs : int
        Number of training epochs.
    imgsz : int
        Input image size.
    batch : int
        Batch size.
    lr0 : float
        Initial learning rate.
    optimizer : str
        Optimizer type.
    augment : bool
        Enable data augmentation.
    project : str
        Output project directory.
    name : str
        Experiment name.
    exist_ok : bool
        Overwrite existing experiment.
    patience : int
        Early stopping patience (epochs).
    device : str or None
        Force device (None = auto).
    workers : int
        Data loader workers.
    seed : int
        Random seed.

    Returns
    -------
    Path
        Path to the best trained weights.
    """
    from ultralytics import YOLO

    data_yaml = Path(data_yaml)
    if not data_yaml.exists():
        raise FileNotFoundError(f"Dataset config not found: {data_yaml}")

    # Auto-detect device
    if device is None:
        device = detect_device()

    # Auto-detect batch size if not overridden
    if batch <= 0:
        batch = auto_batch_size(device, imgsz, model_name)

    model = YOLO(model_name)

    # Acoustic-optimized augmentation
    augment_kwargs = {}
    if augment:
        augment_kwargs = {
            "fliplr": 0.5,        # Horizontal flip (symmetric in sonar swaths)
            "flipud": 0.0,        # No vertical flip (breaks acoustic geometry)
            "mosaic": 0.5,        # Moderate mosaic
            "mixup": 0.1,         # Light mixup
            "copy_paste": 0.1,    # Copy-paste augmentation
            "hsv_h": 0.0,         # No hue shift (acoustic images are grayscale-derived)
            "hsv_s": 0.0,         # No saturation shift
            "hsv_v": 0.2,         # Light brightness variation (simulates gain changes)
        }

    # Count images for time estimation
    try:
        train_imgs = len(list((data_yaml.parent / "train" / "images").glob("*.*")))
    except Exception:
        train_imgs = 100

    est = estimate_training_time(train_imgs, epochs, batch, imgsz, device)
    logger.info(f"Starting training: {model_name} → {epochs} epochs @ imgsz={imgsz}, batch={batch}")
    logger.info(f"Optimizer: {optimizer}, LR: {lr0}, Augmentation: {augment}")
    logger.info(f"Estimated time: {est['hours']}h {est['minutes']}m {est['seconds']}s "
                f"(~{est['per_epoch_sec']}s/epoch)")

    results = model.train(
        data=str(data_yaml),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        lr0=lr0,
        optimizer=optimizer,
        augment=augment,
        project=project,
        name=name,
        exist_ok=exist_ok,
        patience=patience,
        device=device,
        workers=workers,
        seed=seed,
        **augment_kwargs,
        **kwargs,
    )

    best_weights = Path(project) / name / "weights" / "best.pt"
    logger.info(f"Training complete. Best weights: {best_weights}")

    return best_weights


def validate(weights_path: str | Path, data_yaml: str | Path) -> dict:
    """Run validation on the trained model.

    Returns
    -------
    dict
        Validation metrics (mAP50, mAP50-95, precision, recall).
    """
    from ultralytics import YOLO

    model = YOLO(weights_path)
    results = model.val(data=str(data_yaml))

    metrics = {
        "mAP50": round(results.box.map50, 4),
        "mAP50-95": round(results.box.map, 4),
        "precision": round(results.box.mp, 4),
        "recall": round(results.box.mr, 4),
    }

    logger.info(f"Validation results: {metrics}")
    return metrics


def export_model(weights_path: str | Path, formats: list[str] | None = None) -> dict[str, Path]:
    """Export trained weights to multiple formats.

    Parameters
    ----------
    weights_path : str or Path
        Path to the .pt weights file.
    formats : list[str] or None
        Export formats. Default: ['onnx']. For TensorRT, see commands below.

    Returns
    -------
    dict[str, Path]
        Mapping of format → exported file path.
    """
    from ultralytics import YOLO

    if formats is None:
        formats = ["onnx"]

    model = YOLO(weights_path)
    exports: dict[str, Path] = {}

    for fmt in formats:
        try:
            output = model.export(format=fmt, simplify=True)
            exports[fmt] = Path(output)
            logger.info(f"Exported [{fmt}]: {output}")
        except Exception as e:
            logger.error(f"Export [{fmt}] failed: {e}")

    return exports


def print_tensorrt_commands(weights_path: str | Path) -> None:
    """Print TensorRT export commands for manual execution."""
    print("\n" + "=" * 60)
    print("TensorRT Export Commands (run manually):")
    print("=" * 60)
    print(f"\n# FP32 TensorRT engine:")
    print(f"yolo export model={weights_path} format=engine imgsz=640")
    print(f"\n# FP16 TensorRT engine (half precision, ~2x faster on Ampere+):")
    print(f"yolo export model={weights_path} format=engine half=True imgsz=640")
    print(f"\n# INT8 TensorRT engine (TensorRT INT8 edge deployment):")
    print(f"yolo export model={weights_path} format=engine int8=True data=sonar_data.yaml imgsz=640")
    print("=" * 60 + "\n")


# ─── Dataset preparation ───────────────────────────────────────────────────

def prepare_real_data(output: str = "data/real_sonar") -> Path:
    """Download and prepare real sonar datasets (UATD + Marine Debris FLS)."""
    from src.utils.prepare_real_data import main as prepare_main
    import sys as _sys

    # Simulate CLI args for the preparation script
    old_argv = _sys.argv
    _sys.argv = ["prepare_real_data.py", "--output", output, "--datasets", "all"]
    try:
        prepare_main()
    finally:
        _sys.argv = old_argv

    return Path(output) / "sonar_data.yaml"


def generate_mock_data(output: str = "data/sonar_dataset", n_train: int = 50, n_val: int = 10) -> Path:
    """Generate synthetic sonar dataset for quick testing."""
    from src.utils.generate_mock_dataset import generate_dataset

    return Path(generate_dataset(output, n_train=n_train, n_val=n_val))


# ─── CLI ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="OceanScan AI — Train, Validate & Export Sonar Segmentation Model",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # ── Real data pipeline (recommended) ────────────────────────────────────
  python train.py --prepare-data                    # download real sonar data (~2.5 GB)
  python train.py --data data/real_sonar/sonar_data.yaml --epochs 50 --batch 0
    (batch=0 = auto-detect optimal batch size from GPU VRAM)

  # ── Quick demo with synthetic data ──────────────────────────────────────
  python train.py --generate-data --epochs 10

  # ── Validate trained model ──────────────────────────────────────────────
  python train.py --validate --weights runs/segment/train/weights/best.pt \
                  --data data/real_sonar/sonar_data.yaml

  # ── Export to ONNX + TensorRT ───────────────────────────────────────────
  python train.py --export --weights runs/segment/train/weights/best.pt \
                  --export-formats onnx engine

  # ── GPU info ────────────────────────────────────────────────────────────
  python train.py --gpu-info
        """,
    )

    # Dataset preparation
    parser.add_argument("--prepare-data", action="store_true",
                        help="Download & prepare real sonar datasets (UATD + Marine Debris FLS)")
    parser.add_argument("--generate-data", action="store_true",
                        help="Generate synthetic dataset (for quick demo only)")
    parser.add_argument("--data-output", type=str, default="data/sonar_dataset",
                        help="Dataset output dir (for synthetic data)")
    parser.add_argument("--train-samples", type=int, default=50,
                        help="Training samples to generate (synthetic)")
    parser.add_argument("--val-samples", type=int, default=10,
                        help="Validation samples to generate (synthetic)")

    # Training
    parser.add_argument("--data", type=str, default=None, help="Path to sonar_data.yaml")
    parser.add_argument("--model", type=str, default="yolov8s-seg.pt", help="Base model")
    parser.add_argument("--epochs", type=int, default=30, help="Training epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--batch", type=int, default=0,
                        help="Batch size (0 = auto-detect from GPU VRAM)")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    parser.add_argument("--optimizer", type=str, default="AdamW", help="Optimizer")
    parser.add_argument("--device", type=str, default=None, help="Force device (cpu/0/mps)")
    parser.add_argument("--patience", type=int, default=15, help="Early stopping patience")
    parser.add_argument("--no-augment", action="store_true", help="Disable augmentation")

    # Validation
    parser.add_argument("--validate", action="store_true", help="Run validation")
    parser.add_argument("--weights", type=str, default=None, help="Weights path for validate/export")

    # Export
    parser.add_argument("--export", action="store_true", help="Export model")
    parser.add_argument("--export-formats", nargs="+", default=["onnx"], help="Export formats")

    # Info
    parser.add_argument("--gpu-info", action="store_true", help="Show GPU info and exit")

    # Time estimate
    parser.add_argument("--estimate-time", action="store_true",
                        help="Show training time estimate and exit")

    args = parser.parse_args()

    # ── GPU info ──────────────────────────────────────────────────────
    if args.gpu_info:
        device = detect_device()
        if device not in ("cpu", "mps"):
            try:
                import torch
                props = torch.cuda.get_device_properties(0)
                vram = props.total_memory / (1024 ** 3)
                print(f"\nGPU:              {props.name}")
                print(f"VRAM:             {vram:.1f} GB")
                print(f"Compute Cap:      {props.major}.{props.minor}")
                print(f"CUDA Cores:       {props.multi_processor_count}")
                print(f"Optimal batch:    {auto_batch_size(device, 640)}")
            except Exception as e:
                print(f"GPU detection error: {e}")
        else:
            print(f"\nDevice: {device}")
            print("No NVIDIA GPU detected — CPU/MPS training will be significantly slower.")
        return

    # ── Prepare real data ─────────────────────────────────────────────
    if args.prepare_data:
        print("\n" + "=" * 60)
        print("PREPARING REAL SONAR DATASETS")
        print("=" * 60)
        print("Downloading UATD (9000 images) + Marine Debris FLS (1868 images)")
        print("This may take 5-15 minutes depending on internet speed.\n")

        yaml_path = prepare_real_data(args.data_output)
        args.data = str(yaml_path)
        print(f"\nDataset ready: {yaml_path}")

    # ── Generate synthetic data ───────────────────────────────────────
    if args.generate_data:
        yaml_path = generate_mock_data(args.data_output, args.train_samples, args.val_samples)
        args.data = str(yaml_path)

    if args.data is None:
        if not args.estimate_time:
            parser.error("--data is required (or use --prepare-data / --generate-data)")

    # ── Time estimation ───────────────────────────────────────────────
    if args.estimate_time:
        device = detect_device()
        if args.data:
            with open(args.data) as f:
                cfg = yaml.safe_load(f)
            train_dir = Path(cfg.get("path", "")) / cfg.get("train", "train/images")
            n_images = len(list(train_dir.glob("*.*"))) if train_dir.exists() else 100
        else:
            n_images = 1000  # default estimate

        batch = args.batch if args.batch > 0 else auto_batch_size(device, args.imgsz)
        est = estimate_training_time(n_images, args.epochs, batch, args.imgsz, device)
        print(f"\n{'=' * 60}")
        print(f"TRAINING TIME ESTIMATE")
        print(f"{'=' * 60}")
        print(f"  Dataset:     {n_images} images")
        print(f"  Epochs:      {args.epochs}")
        print(f"  Batch size:  {batch}")
        print(f"  Image size:  {args.imgsz}")
        print(f"  Device:      {device}")
        print(f"  Per epoch:   ~{est['per_epoch_sec']}s")
        print(f"  Total:       {est['hours']}h {est['minutes']}m {est['seconds']}s")
        print(f"{'=' * 60}")
        return

    # ── Training ──────────────────────────────────────────────────────
    weights_path = args.weights

    if not args.validate and not args.export:
        device = args.device or detect_device()
        batch = args.batch if args.batch > 0 else auto_batch_size(device, args.imgsz, args.model)

        weights_path = str(
            train(
                data_yaml=args.data,
                model_name=args.model,
                epochs=args.epochs,
                imgsz=args.imgsz,
                batch=batch,
                lr0=args.lr,
                optimizer=args.optimizer,
                augment=not args.no_augment,
                patience=args.patience,
                device=device,
            )
        )

    if weights_path is None:
        parser.error("--weights is required for --validate or --export (or run training first)")

    # ── Validation ────────────────────────────────────────────────────
    if args.validate:
        metrics = validate(weights_path, args.data)
        print(f"\nValidation Metrics:")
        for k, v in metrics.items():
            print(f"  {k}: {v}")

    # ── Export ────────────────────────────────────────────────────────
    if args.export:
        exports = export_model(weights_path, formats=args.export_formats)
        print(f"\nExported files:")
        for fmt, path in exports.items():
            print(f"  [{fmt}] {path}")

        print_tensorrt_commands(weights_path)


if __name__ == "__main__":
    main()
