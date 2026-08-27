#!/usr/bin/env python3
"""
Real Sonar Dataset Download & Preparation
===========================================
Downloads real sonar datasets (UATD + Marine Debris FLS) and converts
them to YOLO segmentation format for OceanScan AI training.

Datasets used:
  - UATD: 9000 images, 10 classes, YOLO bounding boxes
    Source: https://figshare.com/articles/dataset/UATD_Dataset/21331143/
  - Marine Debris FLS: 1868 images, 11 classes, COCO XML annotations
    Source: https://github.com/mvaldenegro/marine-debris-fls-datasets

Output: data/real_sonar/ with YOLO-seg format labels and sonar_data.yaml
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tarfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

import cv2
import numpy as np
import yaml

# ─── OceanScan class mapping ───────────────────────────────────────────────
# Maps source dataset classes → our 4 target classes
# Index 0-3 are the OceanScan classes

OCEANSCAN_CLASSES = [
    "Ghost Net",       # 0 — tangled nets, ropes, chains
    "Metal Drum",      # 1 — drums, cans, metal containers
    "Shipwreck",       # 2 — large structures, debris, hulls
    "Natural Formation", # 3 — rocks, coral, seabed features
]

# UATD class name → OceanScan class index
# UATD classes: Cube, Ball, Cylinder, Human Body, Plane, Circle Cage,
#               Square Cage, Metal Bucket, Tyre, ROV
UATD_CLASS_MAP: dict[str, int] = {
    "Cube":            2,  # Shipwreck (large artificial object)
    "Ball":            3,  # Natural Formation (round, rock-like)
    "Cylinder":        1,  # Metal Drum (cylindrical metal)
    "Human Body":      2,  # Shipwreck (large anomaly)
    "Plane":           2,  # Shipwreck (large structure)
    "Circle Cage":     2,  # Shipwreck (large structure)
    "Square Cage":     2,  # Shipwreck (large structure)
    "Metal Bucket":    1,  # Metal Drum (metal container)
    "Tyre":            1,  # Metal Drum (round metal/rubber)
    "ROV":             2,  # Shipwreck (large equipment)
}

# Marine Debris FLS class name → OceanScan class index
# Classes: bottle, can, drink carton, hook, propeller, shampoo bottle,
#          tire, chain, valve, wall, standing bottle
FLS_CLASS_MAP: dict[str, int] = {
    "bottle":          1,  # Metal Drum (small debris)
    "can":             1,  # Metal Drum
    "drink carton":    1,  # Metal Drum (container)
    "hook":            0,  # Ghost Net (metal hardware, entanglement)
    "propeller":       2,  # Shipwreck (ship part)
    "shampoo bottle":  1,  # Metal Drum (container)
    "tire":            1,  # Metal Drum
    "chain":           0,  # Ghost Net (entanglement hazard)
    "valve":           1,  # Metal Drum (metal fitting)
    "wall":            3,  # Natural Formation (structural)
    "standing bottle": 1,  # Metal Drum (container)
}


def download_file(url: str, dest: Path, desc: str = "") -> None:
    """Download a file with progress indication."""
    if dest.exists():
        print(f"  Already exists: {dest.name}")
        return

    print(f"  Downloading {desc or dest.name}...")
    dest.parent.mkdir(parents=True, exist_ok=True)

    # Try wget first, then curl
    for cmd in [["wget", "-q", "--show-progress", "-O", str(dest), url],
                ["curl", "-L", "-o", str(dest), url]]:
        try:
            subprocess.run(cmd, check=True)
            return
        except (subprocess.CalledProcessError, FileNotFoundError):
            continue

    raise RuntimeError(f"Failed to download {url}. Install wget or curl.")


def convert_uatd_class(class_name: str) -> int:
    """Map a UATD class name to OceanScan class index."""
    # Try exact match first
    if class_name in UATD_CLASS_MAP:
        return UATD_CLASS_MAP[class_name]

    # Try case-insensitive
    lower = class_name.lower().strip()
    for key, val in UATD_CLASS_MAP.items():
        if key.lower() == lower:
            return val

    # Fallback: unknown → Natural Formation
    print(f"  Warning: Unknown UATD class '{class_name}', mapping to Natural Formation")
    return 3


def convert_fls_class(class_name: str) -> int:
    """Map a Marine Debris FLS class name to OceanScan class index."""
    # Normalize: lowercase, strip, replace hyphens with spaces
    lower = class_name.lower().strip().replace("-", " ")
    for key, val in FLS_CLASS_MAP.items():
        if key.lower() == lower:
            return val

    print(f"  Warning: Unknown FLS class '{class_name}', mapping to Natural Formation")
    return 3


def prepare_uatd(
    raw_dir: Path,
    output_dir: Path,
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
) -> int:
    """Convert UATD dataset to YOLO segmentation format.

    UATD structure:
      images/  → *.png files
      labels/  → *.txt files (YOLO bbox format: class cx cy w h)

    We convert bounding boxes to pseudo-polygon segmentation labels.
    """
    images_dir = raw_dir / "images"
    labels_dir = raw_dir / "labels"

    if not images_dir.exists() or not labels_dir.exists():
        print(f"  UATD structure not found at {raw_dir}")
        print(f"  Expected: {raw_dir}/images/*.png and {raw_dir}/labels/*.txt")
        return 0

    # Collect all images
    images = sorted(images_dir.glob("*.png"))
    if not images:
        images = sorted(images_dir.glob("*.jpg"))

    print(f"  Found {len(images)} UATD images")

    count = 0
    for i, img_path in enumerate(images):
        # Determine split
        ratio = i / max(len(images), 1)
        if ratio < train_ratio:
            split = "train"
        elif ratio < train_ratio + val_ratio:
            split = "val"
        else:
            split = "test"

        # Read image
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        h, w = img.shape[:2]

        # Copy image
        out_img = output_dir / split / "images" / img_path.name
        out_img.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out_img), img)

        # Convert label
        label_path = labels_dir / (img_path.stem + ".txt")
        out_label = output_dir / split / "labels" / (img_path.stem + ".txt")
        out_label.parent.mkdir(parents=True, exist_ok=True)

        if not label_path.exists():
            # Empty label file (no objects)
            out_label.touch()
            count += 1
            continue

        new_lines = []
        with open(label_path) as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) < 5:
                    continue

                cls_id_raw = int(parts[0])
                cx, cy, bw, bh = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])

                # Map class name (we need the class name, but UATD uses numeric IDs)
                # Map numeric class IDs based on UATD class order
                uatd_class_names = [
                    "Cube", "Ball", "Cylinder", "Human Body", "Plane",
                    "Circle Cage", "Square Cage", "Metal Bucket", "Tyre", "ROV"
                ]
                if cls_id_raw < len(uatd_class_names):
                    ocean_cls = convert_uatd_class(uatd_class_names[cls_id_raw])
                else:
                    ocean_cls = 3

                # Convert bbox to polygon (rectangle → 4 points → YOLO seg format)
                x1 = (cx - bw / 2)
                y1 = (cy - bh / 2)
                x2 = (cx + bw / 2)
                y2 = (cy + bh / 2)

                # Clamp to [0, 1]
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(1, x2), min(1, y2)

                # 4-point polygon
                poly = f"{x1:.6f} {y1:.6f} {x2:.6f} {y1:.6f} {x2:.6f} {y2:.6f} {x1:.6f} {y2:.6f}"
                new_lines.append(f"{ocean_cls} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f} {poly}")

        with open(out_label, "w") as f:
            f.write("\n".join(new_lines))

        count += 1
        if (i + 1) % 500 == 0:
            print(f"    Processed {i + 1}/{len(images)}")

    return count


def prepare_marine_debris_fls(
    raw_dir: Path,
    output_dir: Path,
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
) -> int:
    """Convert Marine Debris FLS dataset to YOLO segmentation format.

    The watertank-segmentation sub-dataset has COCO XML annotations
    with polygon segmentation masks.
    """
    # Check for COCO XML annotations
    ann_dir = raw_dir / "annotations"
    img_dir = raw_dir / "images"

    if not ann_dir.exists():
        # Try common alternative structures
        for candidate in ["Annotations", "BoxAnnotations", "ann", "labels", "data"]:
            if (raw_dir / candidate).exists():
                ann_dir = raw_dir / candidate
                break

    if not img_dir.exists():
        for candidate in ["Images", "img", "data"]:
            if (raw_dir / candidate).exists():
                img_dir = raw_dir / candidate
                break

    if not img_dir.exists():
        print(f"  Marine Debris FLS images not found at {raw_dir}")
        return 0

    # Collect images
    images = sorted(
        list(img_dir.glob("*.png")) + list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.ppm"))
    )
    print(f"  Found {len(images)} Marine Debris FLS images")

    count = 0
    for i, img_path in enumerate(images):
        ratio = i / max(len(images), 1)
        if ratio < train_ratio:
            split = "train"
        elif ratio < train_ratio + val_ratio:
            split = "val"
        else:
            split = "test"

        img = cv2.imread(str(img_path))
        if img is None:
            continue
        h, w = img.shape[:2]

        out_img = output_dir / split / "images" / img_path.name
        out_img.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out_img), img)

        out_label = output_dir / split / "labels" / (img_path.stem + ".txt")
        out_label.parent.mkdir(parents=True, exist_ok=True)

        # Try to find matching annotation
        new_lines = []

        # Check for COCO XML annotation
        xml_path = ann_dir / (img_path.stem + ".xml")
        if xml_path.exists():
            try:
                tree = ET.parse(str(xml_path))
                root = tree.getroot()
                for obj in root.findall("object"):
                    name_el = obj.find("name")
                    if name_el is None or name_el.text is None:
                        continue
                    cls_name = name_el.text.strip()
                    ocean_cls = convert_fls_class(cls_name)

                    bbox = obj.find("bndbox")
                    if bbox is None:
                        continue

                    # Support both COCO-style (x, y, w, h) and Pascal-VOC (xmin, ymin, xmax, ymax)
                    x_el = bbox.find("x")
                    y_el = bbox.find("y")
                    w_el = bbox.find("w")
                    h_el = bbox.find("h")

                    if x_el is not None and y_el is not None and w_el is not None and h_el is not None:
                        # COCO format: x, y, w, h in pixels
                        bx = float(x_el.text)
                        by = float(y_el.text)
                        bw_px = float(w_el.text)
                        bh_px = float(h_el.text)
                        xmin = bx / w
                        ymin = by / h
                        xmax = (bx + bw_px) / w
                        ymax = (by + bh_px) / h
                    else:
                        # Pascal-VOC format: xmin, ymin, xmax, ymax in pixels
                        xmin_el = bbox.find("xmin")
                        ymin_el = bbox.find("ymin")
                        xmax_el = bbox.find("xmax")
                        ymax_el = bbox.find("ymax")
                        if xmin_el is None or ymin_el is None or xmax_el is None or ymax_el is None:
                            continue
                        xmin = float(xmin_el.text) / w
                        ymin = float(ymin_el.text) / h
                        xmax = float(xmax_el.text) / w
                        ymax = float(ymax_el.text) / h

                    cx = (xmin + xmax) / 2
                    cy = (ymin + ymax) / 2
                    bw = xmax - xmin
                    bh = ymax - ymin

                    poly = f"{xmin:.6f} {ymin:.6f} {xmax:.6f} {ymin:.6f} {xmax:.6f} {ymax:.6f} {xmin:.6f} {ymax:.6f}"
                    new_lines.append(f"{ocean_cls} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f} {poly}")
            except Exception as e:
                print(f"  Warning: Failed to parse {xml_path.name}: {e}")

        # Check for YOLO txt label
        txt_path = ann_dir / (img_path.stem + ".txt")
        if txt_path.exists() and not new_lines:
            with open(txt_path) as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        new_lines.append(line.strip())

        with open(out_label, "w") as f:
            f.write("\n".join(new_lines))

        count += 1
        if (i + 1) % 200 == 0:
            print(f"    Processed {i + 1}/{len(images)}")

    return count


def generate_sonar_data_yaml(output_dir: Path) -> Path:
    """Generate sonar_data.yaml config for YOLO training."""
    yaml_path = output_dir / "sonar_data.yaml"
    config = {
        "path": str(output_dir.resolve()),
        "train": "train/images",
        "val": "val/images",
        "test": "test/images",
        "nc": len(OCEANSCAN_CLASSES),
        "names": OCEANSCAN_CLASSES,
    }
    with open(yaml_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False)
    return yaml_path


def main():
    parser = argparse.ArgumentParser(description="Download and prepare real sonar datasets")
    parser.add_argument(
        "--datasets", nargs="+", choices=["uatd", "fls", "all"], default=["all"],
        help="Which datasets to download and prepare"
    )
    parser.add_argument("--output", type=str, default="data/real_sonar", help="Output directory")
    parser.add_argument("--download-dir", type=str, default="data/raw_downloads", help="Temp download dir")
    args = parser.parse_args()

    output_dir = Path(args.output)
    download_dir = Path(args.download_dir)
    download_dir.mkdir(parents=True, exist_ok=True)

    datasets = ["uatd", "fls"] if "all" in args.datasets else args.datasets
    total = 0

    # ── UATD ──────────────────────────────────────────────────────────────
    if "uatd" in datasets:
        print("\n" + "=" * 60)
        print("UATD — Underwater Acoustic Target Detection Dataset")
        print("9000 real sonar images, 10 classes")
        print("=" * 60)

        uatd_dir = download_dir / "uatd"

        # UATD is on Figshare — download the zip
        uatd_url = "https://figshare.com/ndownloader/articles/21331143/versions/3"
        uatd_zip = uatd_dir / "UATD_Dataset.zip"

        if not uatd_dir.exists():
            print("\n  Downloading UATD dataset (~500MB)...")
            download_file(uatd_url, uatd_zip, "UATD Dataset")

            # Extract
            print("  Extracting...")
            try:
                with zipfile.ZipFile(str(uatd_zip), "r") as z:
                    z.extractall(str(uatd_dir))
            except zipfile.BadZipFile:
                # Maybe it's a tar.gz
                try:
                    with tarfile.open(str(uatd_zip), "r:gz") as t:
                        t.extractall(str(uatd_dir))
                except Exception as e:
                    print(f"  Error extracting: {e}")
                    print("  Please download manually from:")
                    print("  https://figshare.com/articles/dataset/UATD_Dataset/21331143/")
                    print(f"  Extract to: {uatd_dir}")
                    return

        # Find the actual image/label directories
        # UATD might be nested in subdirectories
        uatd_root = uatd_dir
        for candidate in [uatd_dir / "UATD_Dataset", uatd_dir / "UATD", uatd_dir]:
            if (candidate / "images").exists() or (candidate / "data").exists():
                uatd_root = candidate
                break

        # If images are in a flat structure, create the expected layout
        if not (uatd_root / "images").exists():
            # Search for .png files recursively
            png_files = list(uatd_root.rglob("*.png"))[:10]
            if png_files:
                # Found images, create proper structure
                imgs = uatd_root / "images"
                lbls = uatd_root / "labels"
                imgs.mkdir(exist_ok=True)
                lbls.mkdir(exist_ok=True)

                all_pngs = list(uatd_root.rglob("*.png"))
                for p in all_pngs:
                    shutil.move(str(p), str(imgs / p.name))
                    # Move corresponding label if exists
                    lbl = p.with_suffix(".txt")
                    if lbl.exists():
                        shutil.move(str(lbl), str(lbls / lbl.name))

        print("\n  Converting to YOLO segmentation format...")
        n = prepare_uatd(uatd_root, output_dir)
        total += n
        print(f"  UATD: {n} images converted")

    # ── Marine Debris FLS ─────────────────────────────────────────────────
    if "fls" in datasets:
        print("\n" + "=" * 60)
        print("Marine Debris FLS — Forward-Looking Sonar Dataset")
        print("1868 images, 11 classes (watertank scenario)")
        print("=" * 60)

        fls_dir = download_dir / "marine_debris_fls"

        # Clone the GitHub repo (small, has labels)
        if not fls_dir.exists():
            print("\n  Cloning Marine Debris FLS repository...")
            try:
                subprocess.run(
                    ["git", "clone", "--depth", "1",
                     "https://github.com/mvaldenegro/marine-debris-fls-datasets.git",
                     str(fls_dir)],
                    check=True,
                )
            except subprocess.CalledProcessError as e:
                print(f"  Git clone failed: {e}")
                print("  Manual download: https://github.com/mvaldenegro/marine-debris-fls-datasets")
                return

        # Find watertank images and annotations
        watertank_seg = fls_dir / "md_fls_dataset" / "data" / "watertank-segmentation"
        watertank_det = fls_dir / "md_fls_dataset" / "data" / "watertank-detection"

        fls_source = None
        for candidate in [watertank_seg, watertank_det, fls_dir / "md_fls_dataset" / "data"]:
            if candidate.exists():
                fls_source = candidate
                break

        if fls_source is None:
            print("  Could not find watertank data in the repo")
            return

        print(f"\n  Using data from: {fls_source}")
        n = prepare_marine_debris_fls(fls_source, output_dir)
        total += n
        print(f"  Marine Debris FLS: {n} images converted")

    # ── Generate YAML config ──────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("Generating sonar_data.yaml")
    print("=" * 60)

    yaml_path = generate_sonar_data_yaml(output_dir)
    print(f"  Config written to: {yaml_path}")

    # Print summary
    print("\n" + "=" * 60)
    print("DATASET PREPARATION COMPLETE")
    print("=" * 60)
    print(f"\n  Total images prepared: {total}")
    print(f"  Output directory:      {output_dir}")
    print(f"  Config file:           {yaml_path}")
    print(f"\n  Classes: {OCEANSCAN_CLASSES}")
    print(f"\n  To train:")
    print(f"    python train.py --data {yaml_path} --epochs 50")
    print()


if __name__ == "__main__":
    main()
