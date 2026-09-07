"""
Synthetic Side-Scan Sonar (SSS) Waterfall Dataset Generator
=============================================================
Renders true side-scan "waterfall" frames: a dark nadir gap down the
center, port/stbd swaths with slant-range backscatter falloff, sand
ripples and speckle, plus debris objects with acoustic highlight and
shadow cast away from nadir. Emits YOLO-segmentation labels.

Optionally merges with an existing YOLO-format dataset (e.g. real_sonar)
so the model keeps its real-sonar classes while learning the SSS domain.
"""

from __future__ import annotations

import argparse
import random
import shutil
from pathlib import Path

import cv2
import numpy as np
import yaml

CLASS_NAMES = ["Ghost Net", "Metal Drum", "Shipwreck", "Natural Formation"]
CLASS_COLORS = [
    (46, 210, 255),   # Ghost Net — cyan
    (30, 120, 255),   # Metal Drum — orange
    (60, 60, 255),    # Shipwreck — red
    (30, 200, 90),    # Natural Formation — green
]

IMG_W, IMG_H = 640, 640
GAP_HALF = 30          # half-width of the nadir gap in pixels
MIN_SWATH_MARGIN = 14  # min pixels an object must stay away from swath edges


def _mulberry32(seed: int):
    rng = random.Random(seed)

    def _next():
        return rng.random()

    return _next


def _make_seabed(rng):
    """Vectorized side-scan seabed: specular falloff, ripples, speckle."""
    xs = np.arange(IMG_W, dtype=np.float32)[None, :]
    ys = np.arange(IMG_H, dtype=np.float32)[:, None]
    cx = IMG_W / 2.0

    d = np.abs(xs - cx) / cx
    base = 150.0 - 120.0 * np.power(d, 1.35)

    ripple = 1.0 + 0.22 * np.sin(ys / 27.0 + xs / 55.0 + rng() * 6.283)
    banding = 1.0 + 0.30 * np.sin(ys / 31.0 + rng() * 6.283)
    speckle = 1.0 + 0.28 * np.random.RandomState(int(rng() * 1e6)).randn(IMG_H, IMG_W)

    img = base * ripple * banding * speckle
    img = np.clip(img, 4, 255)

    cx_i = int(cx)
    gap = np.zeros_like(img)
    gap_lo, gap_hi = cx_i - GAP_HALF, cx_i + GAP_HALF
    gap[:, gap_lo:gap_hi] = 5.0 + 5.0 * np.random.RandomState(int(rng() * 1e6)).rand(IMG_H, gap_hi - gap_lo)
    img[:, gap_lo:gap_hi] = gap[:, gap_lo:gap_hi]

    return img.astype(np.uint8)


def _size_range(cls_id: int) -> tuple[int, int]:
    return {
        0: (34, 84),   # Ghost Net — wide, flat
        1: (22, 42),   # Metal Drum — small, round
        2: (64, 140),  # Shipwreck — large
        3: (40, 100),  # Natural Formation — medium-large
    }[cls_id]


def _draw_mask(mask: np.ndarray, cls_id: int, cx: int, cy: int, bw: int, bh: int, rng) -> None:
    x1, y1 = cx - bw // 2, cy - bh // 2
    x2, y2 = cx + bw // 2, cy + bh // 2
    x1 = max(0, x1); y1 = max(0, y1)
    x2 = min(IMG_W - 1, x2); y2 = min(IMG_H - 1, y2)

    if cls_id == 0:
        pts = []
        n_corners = 5 + int(rng() * 4)
        for i in range(n_corners):
            angle = 2 * np.pi * i / n_corners
            rx = (bw / 2) * (0.6 + 0.4 * rng())
            ry = (bh / 2) * (0.6 + 0.4 * rng())
            pts.append([int(cx + rx * np.cos(angle)), int(cy + ry * np.sin(angle))])
        cv2.fillPoly(mask, [np.array(pts, dtype=np.int32)], 255)
    elif cls_id == 1:
        radius = max(2, min(bw, bh) // 2)
        cv2.circle(mask, (cx, cy), radius, 255, -1)
    elif cls_id == 2:
        pts = np.array(
            [
                [x1, cy - bh // 4],
                [x1 + bw // 4, y1],
                [x2 - bw // 6, y1 + bh // 6],
                [x2, cy],
                [x2 - bw // 6, y2 - bh // 6],
                [x1 + bw // 4, y2],
                [x1, cy + bh // 4],
            ],
            dtype=np.int32,
        )
        cv2.fillPoly(mask, [pts], 255)
    else:
        angle = int(rng() * 180)
        cv2.ellipse(mask, (cx, cy), (max(2, bw // 2), max(2, bh // 2)), angle, 0, 360, 255, -1)


def _generate_sample(idx: int, out_dir: Path, rng) -> None:
    img = _make_seabed(rng)
    img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    cx_center = IMG_W // 2
    labels = []
    n_objects = 1 + int(rng() * 3)

    for _ in range(n_objects):
        cls_id = int(rng() * len(CLASS_NAMES))
        side = -1 if rng() < 0.5 else 1

        lo, hi = GAP_HALF + MIN_SWATH_MARGIN, IMG_W // 2 - MIN_SWATH_MARGIN - GAP_HALF
        if side == 1:
            xc = cx_center + GAP_HALF + MIN_SWATH_MARGIN + int(rng() * (IMG_W // 2 - GAP_HALF - 2 * MIN_SWATH_MARGIN))
        else:
            xc = cx_center - GAP_HALF - MIN_SWATH_MARGIN - int(rng() * (IMG_W // 2 - GAP_HALF - 2 * MIN_SWATH_MARGIN))

        yc = 32 + int(rng() * (IMG_H - 64))

        d_norm = abs(xc - cx_center) / (IMG_W // 2)
        slant = 1.45 - 0.75 * d_norm  # near-nadir → horizontally stretched

        min_s, max_s = _size_range(cls_id)
        bw = int((min_s + rng() * (max_s - min_s)) * (0.8 + 0.4 * rng()))
        bh = int(bw * (0.45 + 0.45 * rng()))

        mask = np.zeros((IMG_H, IMG_W), dtype=np.uint8)
        _draw_mask(mask, cls_id, xc, yc, int(bw * slant), bh, rng)

        obj_region = mask > 0
        if not obj_region.any():
            continue

        color = CLASS_COLORS[cls_id]
        boost = 90 + int(rng() * 70)
        for c in range(3):
            img[:, :, c][obj_region] = np.clip(
                img[:, :, c][obj_region].astype(np.int32) + int(color[c] * boost / 255.0) + 25, 0, 255
            ).astype(np.uint8)

        M = np.float32([[1, 0, side * int(16 * slant)], [0, 1, 12]])
        shadow = cv2.warpAffine(mask, M, (IMG_W, IMG_H))
        shadow_region = (shadow > 0) & (mask == 0)
        if shadow_region.any():
            for c in range(3):
                img[:, :, c][shadow_region] = np.clip(
                    img[:, :, c][shadow_region].astype(np.int32) - 55, 0, 255
                ).astype(np.uint8)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue
        largest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest) < 60:
            continue
        approx = cv2.approxPolyDP(largest, 0.005 * cv2.arcLength(largest, True), True)

        pts = approx.reshape(-1, 2).astype(np.float32)
        x_min, y_min = pts.min(axis=0)
        x_max, y_max = pts.max(axis=0)
        cx_b, cy_b = (x_min + x_max) / 2 / IMG_W, (y_min + y_max) / 2 / IMG_H
        w_b, h_b = (x_max - x_min) / IMG_W, (y_max - y_min) / IMG_H
        poly = " ".join(f"{px / IMG_W:.6f} {py / IMG_H:.6f}" for px, py in pts)
        labels.append(f"{cls_id} {cx_b:.6f} {cy_b:.6f} {w_b:.6f} {h_b:.6f} {poly}")

    name = f"sss_{idx:05d}"
    cv2.imwrite(str(out_dir / "images" / f"{name}.png"), img)
    with open(out_dir / "labels" / f"{name}.txt", "w") as f:
        f.write("\n".join(labels))


def _build_split(out_dir: Path, count: int, rng, tag: str) -> None:
    (out_dir / "images").mkdir(parents=True, exist_ok=True)
    (out_dir / "labels").mkdir(parents=True, exist_ok=True)
    for i in range(count):
        _generate_sample(i, out_dir, rng)
        print(f"  [{tag}] {i + 1}/{count}")


def generate(
    output: str,
    n_train: int = 400,
    n_val: int = 50,
    n_test: int = 30,
    seed: int = 7,
    merge_real: str | None = None,
) -> Path:
    root = Path(output)
    synth_root = root / "_synthetic"
    if synth_root.exists():
        shutil.rmtree(synth_root)

    rng = _mulberry32(seed)
    for split, count in [("train", n_train), ("val", n_val), ("test", n_test)]:
        _build_split(synth_root / split, count, rng, split)

    splits = ["train", "val", "test"]
    if merge_real:
        real_root = Path(merge_real)
        for split in splits:
            dest = root / split
            (dest / "images").mkdir(parents=True, exist_ok=True)
            (dest / "labels").mkdir(parents=True, exist_ok=True)
            src_img = real_root / split / "images"
            if src_img.exists():
                for f in src_img.iterdir():
                    if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".bmp"):
                        shutil.copy2(f, dest / "images" / f.name)
                        lbl = real_root / split / "labels" / (f.stem + ".txt")
                        if lbl.exists():
                            shutil.copy2(lbl, dest / "labels" / (f.stem + ".txt"))
            for f in (synth_root / split / "images").iterdir():
                if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".bmp"):
                    shutil.copy2(f, dest / "images" / f.name)
                    lbl = synth_root / split / "labels" / (f.stem + ".txt")
                    if lbl.exists():
                        shutil.copy2(lbl, dest / "labels" / (f.stem + ".txt"))
        print(f"Merged real data from: {merge_real}")
    else:
        r2 = root / "_synthetic"
        for split in splits:
            dest = root / split
            (dest / "images").mkdir(parents=True, exist_ok=True)
            (dest / "labels").mkdir(parents=True, exist_ok=True)
            for f in (r2 / split / "images").iterdir():
                if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".bmp"):
                    shutil.copy2(f, dest / "images" / f.name)
                    lbl = r2 / split / "labels" / (f.stem + ".txt")
                    if lbl.exists():
                        shutil.copy2(lbl, dest / "labels" / (f.stem + ".txt"))
        shutil.rmtree(r2)

    if (root / "test" / "images").exists() is False:
        (root / "test" / "images").mkdir(parents=True, exist_ok=True)
        (root / "test" / "labels").mkdir(parents=True, exist_ok=True)

    counts = {}
    for split in splits:
        counts[split] = len(list((root / split / "images").glob("*.*")))

    yaml_path = root / "sonar_data.yaml"
    config = {
        "path": str(root.resolve()),
        "train": "train/images",
        "val": "val/images",
        "test": "test/images",
        "nc": len(CLASS_NAMES),
        "names": CLASS_NAMES,
    }
    with open(yaml_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False)

    print(f"\nDataset ready at: {root}")
    print(f"  Train: {counts['train']} | Val: {counts['val']} | Test: {counts['test']}")
    print(f"  Config: {yaml_path}")
    return yaml_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic side-scan (waterfall) dataset")
    parser.add_argument("--output", type=str, default="data/sonar_sss", help="Output directory")
    parser.add_argument("--train", type=int, default=400, help="Synthetic training samples")
    parser.add_argument("--val", type=int, default=50, help="Synthetic validation samples")
    parser.add_argument("--test", type=int, default=30, help="Synthetic test samples")
    parser.add_argument("--seed", type=int, default=7, help="Random seed")
    parser.add_argument("--merge-real", type=str, default="data/real_sonar",
                        help="Existing YOLO dataset to merge (real FLS/UATD data)")
    parser.add_argument("--skip-real", action="store_true", help="Do not merge real data")
    args = parser.parse_args()

    generate(
        args.output,
        n_train=args.train,
        n_val=args.val,
        n_test=args.test,
        seed=args.seed,
        merge_real=None if args.skip_real else args.merge_real,
    )