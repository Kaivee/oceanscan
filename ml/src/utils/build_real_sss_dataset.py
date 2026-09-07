"""
Real Side-Scan (SSS) Combined Dataset Builder
===============================================
Merges REAL towed side-scan imagery (SeabedObjects: ship-real-1/2/3,
plane-real — real SSS crops) with the existing real FLS+MFLS set.
SSS objects are labeled Shipwreck (class 2) with full-frame polygons
(the datasets are tight single-object crops).
"""

from __future__ import annotations

import argparse
import random
import shutil
from pathlib import Path

import cv2
import yaml

from prepare_real_data import OCEANSCAN_CLASSES

SSS_ROOTS = [
    "data/raw_downloads/seabedobjects/ship-real-1",
    "data/raw_downloads/seabedobjects/ship-real-2",
    "data/raw_downloads/seabedobjects/ship-real-3",
    "data/raw_downloads/seabedobjects/plane-real/plane-real",
]

EXTS = {".png", ".jpg", ".jpeg", ".bmp"}


def add_sss(source_root: Path, out_root: Path, rng) -> tuple[int, int]:
    files = sorted(p for p in source_root.iterdir() if p.suffix.lower() in EXTS and not p.name.startswith("."))
    source_name = source_root.name
    if "plane" in source_name:
        cls = 2
    else:
        cls = 2
    n_train = n_val = 0
    for i, img in enumerate(files):
        im = cv2.imread(str(img))
        if im is None:
            continue
        split = "train" if rng.random() < 0.8 else "val"
        out_img = out_root / split / "images" / f"sss_{source_name}_{img.stem}.png"
        out_img.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out_img), im)
        out_lbl = out_root / split / "labels" / f"sss_{source_name}_{img.stem}.txt"
        out_lbl.parent.mkdir(parents=True, exist_ok=True)
        out_lbl.write_text("2 0.5 0.5 1.0 1.0 0 0 1 0 1 1 0 1")
        if split == "train":
            n_train += 1
        else:
            n_val += 1
    print(f"  SSS {source_name}: train={n_train} val={n_val} (class={cls})")
    return n_train, n_val


def build(output: str, fls_root: str) -> Path:
    out = Path(output)
    if out.exists():
        shutil.rmtree(out)
    for split in ["train", "val", "test"]:
        (out / split / "images").mkdir(parents=True, exist_ok=True)
        (out / split / "labels").mkdir(parents=True, exist_ok=True)

    rng = random.Random(42)
    for root in SSS_ROOTS:
        if Path(root).exists():
            add_sss(Path(root), out, rng)

    fls = Path(fls_root)
    for split in ["train", "val", "test"]:
        src = fls / split / "images"
        if not src.exists():
            continue
        dst = out / split / "images"
        dlt = out / split / "labels"
        for f in src.iterdir():
            if f.suffix.lower() in EXTS:
                shutil.copy2(f, dst / f.name)
                lbl = fls / split / "labels" / (f.stem + ".txt")
                if lbl.exists():
                    shutil.copy2(lbl, dlt / (f.stem + ".txt"))

    counts = {s: len(list((out / s / "images").iterdir())) for s in ["train", "val", "test"]}
    yaml_path = out / "sonar_data.yaml"
    with open(yaml_path, "w") as f:
        yaml.dump(
            {
                "path": str(out.resolve()),
                "train": "train/images",
                "val": "val/images",
                "test": "test/images",
                "nc": len(OCEANSCAN_CLASSES),
                "names": OCEANSCAN_CLASSES,
            },
            f,
            default_flow_style=False,
            sort_keys=False,
        )
    print(f"\nReal SSS+FLS+MFLS dataset: {out}")
    print(f"  Train: {counts['train']} | Val: {counts['val']} | Test: {counts['test']}")
    return yaml_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build real SSS + FLS combined dataset")
    parser.add_argument("--output", type=str, default="data/sonar_sss")
    parser.add_argument("--fls", type=str, default="data/sonar_real")
    args = parser.parse_args()
    build(args.output, args.fls)