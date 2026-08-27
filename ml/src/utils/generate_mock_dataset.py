"""
Synthetic Sonar Dataset Generator
===================================
Generates mock side-scan sonar imagery with acoustic shadows, backscatter
highlights, and YOLO-segmentation format labels for training.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import cv2
import numpy as np
import yaml

CLASS_NAMES = ["Ghost Net", "Metal Drum", "Shipwreck", "Natural Formation"]
CLASS_COLORS = [
    (0, 200, 255),    # Ghost Net — cyan
    (0, 100, 255),    # Metal Drum — orange
    (50, 50, 255),    # Shipwreck — red
    (0, 180, 60),     # Natural Formation — green
]

IMG_W, IMG_H = 640, 640


def _mulberry32(seed: int):
    """Deterministic PRNG for reproducible synthetic data."""
    import random
    rng = random.Random(seed)

    def _next():
        return rng.random()

    return _next


def generate_seabed(width: int, height: int, rng) -> np.ndarray:
    """Generate a realistic dark seabed texture with sand ripple patterns."""
    img = np.zeros((height, width), dtype=np.float32)

    # Base gradient
    for y in range(height):
        for x in range(width):
            img[y, x] = 20 + 15 * np.sin(x / 120.0) * np.cos(y / 90.0)

    # Sand ripple waves
    for _ in range(25):
        y0 = rng() * height
        amp = 3 + rng() * 8
        wl = 60 + rng() * 100
        phase = rng() * 2 * np.pi
        freq = 2 * np.pi / wl
        for x in range(width):
            y = int(y0 + amp * np.sin(freq * x + phase))
            if 0 <= y < height:
                img[y, x] += 12

    # Speckle noise
    noise = np.random.normal(0, 12, (height, width)).astype(np.float32)
    img += noise

    img = np.clip(img, 0, 255)
    return img.astype(np.uint8)


def place_object(
    img: np.ndarray,
    cls_id: int,
    rng,
) -> tuple[int, int, int, int, np.ndarray]:
    """Place a synthetic object on the seabed and return its bounding box + mask."""
    h, w = img.shape[:2]

    # Random size based on class
    size_ranges = {
        0: (30, 80),   # Ghost Net — wide, flat
        1: (20, 40),   # Metal Drum — small, round
        2: (60, 140),  # Shipwreck — large
        3: (40, 100),  # Natural Formation — medium-large
    }
    min_s, max_s = size_ranges[cls_id]
    bw = int(min_s + rng() * (max_s - min_s))
    bh = int(min_s * 0.5 + rng() * (max_s - min_s) * 0.7)

    # Random position with margin
    margin = 40
    cx = int(margin + rng() * (w - 2 * margin))
    cy = int(margin + rng() * (h - 2 * margin))

    x1 = max(0, cx - bw // 2)
    y1 = max(0, cy - bh // 2)
    x2 = min(w, cx + bw // 2)
    y2 = min(h, cy + bh // 2)
    actual_w = x2 - x1
    actual_h = y2 - y1

    # Create mask
    mask = np.zeros((h, w), dtype=np.uint8)

    if cls_id == 0:  # Ghost Net — irregular polygon
        pts = []
        n_corners = 5 + int(rng() * 4)
        for i in range(n_corners):
            angle = 2 * np.pi * i / n_corners
            r_x = actual_w / 2 * (0.6 + 0.4 * rng())
            r_y = actual_h / 2 * (0.6 + 0.4 * rng())
            px = int(cx + r_x * np.cos(angle))
            py = int(cy + r_y * np.sin(angle))
            pts.append([px, py])
        cv2.fillPoly(mask, [np.array(pts, dtype=np.int32)], 255)

    elif cls_id == 1:  # Metal Drum — circle
        radius = min(actual_w, actual_h) // 2
        cv2.circle(mask, (cx, cy), radius, 255, -1)

    elif cls_id == 2:  # Shipwreck — elongated polygon
        pts = np.array([
            [x1, cy - actual_h // 4],
            [x1 + actual_w // 4, y1],
            [x2 - actual_w // 6, y1 + actual_h // 6],
            [x2, cy],
            [x2 - actual_w // 6, y2 - actual_h // 6],
            [x1 + actual_w // 4, y2],
            [x1, cy + actual_h // 4],
        ], dtype=np.int32)
        cv2.fillPoly(mask, [pts], 255)

    else:  # Natural Formation — ellipse
        angle = int(rng() * 180)
        cv2.ellipse(mask, (cx, cy), (actual_w // 2, actual_h // 2), angle, 0, 360, 255, -1)

    # Apply backscatter highlight on object area
    color = CLASS_COLORS[cls_id]
    intensity = 80 + int(rng() * 100)
    obj_region = mask > 0
    if img.ndim == 3:
        for c in range(3):
            img[:, :, c][obj_region] = np.clip(
                img[:, :, c][obj_region].astype(np.int32) + int(color[c] * intensity / 255), 0, 255
            ).astype(np.uint8)
    else:
        img[obj_region] = np.clip(
            img[obj_region].astype(np.int32) + intensity // 2, 0, 255
        ).astype(np.uint8)

    # Acoustic shadow (offset to the right)
    shadow_offset = int(actual_w * 0.3)
    shadow_mask = np.zeros_like(mask)
    M = np.float32([[1, 0, shadow_offset], [0, 1, 2]])
    shadow_mask = cv2.warpAffine(mask, M, (w, h))
    shadow_region = shadow_mask > 0
    if img.ndim == 3:
        for c in range(3):
            img[:, :, c][shadow_region] = np.clip(
                img[:, :, c][shadow_region].astype(np.int32) - 30, 0, 255
            ).astype(np.uint8)
    else:
        img[shadow_region] = np.clip(
            img[shadow_region].astype(np.int32) - 30, 0, 255
        ).astype(np.uint8)

    return x1, y1, x2, y2, mask


def generate_sample(
    sample_idx: int,
    output_dir: Path,
    rng,
) -> None:
    """Generate one synthetic sonar sample with YOLO-segmentation labels."""
    # Generate seabed
    seabed = generate_seabed(IMG_W, IMG_H, rng)

    # Create RGB version
    img_rgb = cv2.cvtColor(seabed, cv2.COLOR_GRAY2BGR)

    # Place 1-3 objects
    n_objects = 1 + int(rng() * 3)
    labels = []

    for _ in range(n_objects):
        cls_id = int(rng() * len(CLASS_NAMES))
        x1, y1, x2, y2, mask = place_object(img_rgb, cls_id, rng)

        # YOLO segmentation format: class cx cy w h polygon_points...
        cx_norm = ((x1 + x2) / 2) / IMG_W
        cy_norm = ((y1 + y2) / 2) / IMG_H
        w_norm = (x2 - x1) / IMG_W
        h_norm = (y2 - y1) / IMG_H

        # Extract contour for polygon
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue

        largest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest) < 50:
            continue

        # Simplify contour
        epsilon = 0.005 * cv2.arcLength(largest, True)
        approx = cv2.approxPolyDP(largest, epsilon, True)

        # Normalize polygon points
        poly_str = " ".join(
            f"{pt[0][0] / IMG_W:.6f} {pt[0][1] / IMG_H:.6f}"
            for pt in approx
        )

        labels.append(f"{cls_id} {cx_norm:.6f} {cy_norm:.6f} {w_norm:.6f} {h_norm:.6f} {poly_str}")

    # Save image
    img_name = f"sonar_{sample_idx:04d}.png"
    cv2.imwrite(str(output_dir / "images" / img_name), img_rgb)

    # Save label
    label_name = f"sonar_{sample_idx:04d}.txt"
    with open(output_dir / "labels" / label_name, "w") as f:
        f.write("\n".join(labels))


def generate_dataset(
    output_root: str | Path,
    n_train: int = 50,
    n_val: int = 10,
    seed: int = 42,
) -> Path:
    """Generate complete synthetic sonar dataset with YOLO config.

    Parameters
    ----------
    output_root : str or Path
        Root directory for the dataset.
    n_train : int
        Number of training samples.
    n_val : int
        Number of validation samples.
    seed : int
        Random seed for reproducibility.

    Returns
    -------
    Path
        Path to the generated sonar_data.yaml config.
    """
    root = Path(output_root)
    rng = _mulberry32(seed)

    for split, count in [("train", n_train), ("val", n_val)]:
        split_dir = root / split
        (split_dir / "images").mkdir(parents=True, exist_ok=True)
        (split_dir / "labels").mkdir(parents=True, exist_ok=True)

        for i in range(count):
            generate_sample(i, split_dir, rng)
            print(f"  [{split}] Generated sample {i + 1}/{count}")

    # Write YAML config
    yaml_path = root / "sonar_data.yaml"
    config = {
        "path": str(root.resolve()),
        "train": "train/images",
        "val": "val/images",
        "nc": len(CLASS_NAMES),
        "names": CLASS_NAMES,
    }
    with open(yaml_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False)

    print(f"\nDataset generated at: {root}")
    print(f"  Train: {n_train} samples")
    print(f"  Val:   {n_val} samples")
    print(f"  Config: {yaml_path}")

    return yaml_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic sonar dataset")
    parser.add_argument("--output", type=str, default="data/sonar_dataset", help="Output directory")
    parser.add_argument("--train", type=int, default=50, help="Number of training samples")
    parser.add_argument("--val", type=int, default=10, help="Number of validation samples")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    generate_dataset(args.output, n_train=args.train, n_val=args.val, seed=args.seed)
