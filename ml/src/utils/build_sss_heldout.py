"""
Real Side-Scan (SSS) + FLS Combined Dataset — held-out test build
==================================================================
- SSS (SeabedObjects): 70% train / 15% val / 15% test, REAL crops.
- FLS/MFLS (data/sonar_real): copied with their existing train/val/test
  splits (FLS test was already a real held-out test set).
Nothing is folded across the test boundary.
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
SSS_TEST_IMG = "2 0.5 0.5 1.0 1.0 0 0 1 0 1 1 0 1"


def add_sss(source_root: Path, out_root: Path, rng) -> tuple[int, int, int]:
    files = sorted(p for p in source_root.iterdir() if p.suffix.lower() in EXTS and not p.name.startswith("."))
    name = source_root.name.replace("-", "_")
    n_tr = n_va = n_te = 0
    for img in files:
        im = cv2.imread(str(img))
        if im is None:
            continue
        r = rng.random()
        if r < 0.7:
            split = "train"
            n_tr += 1
        elif r < 0.85:
            split = "val"
            n_va += 1
        else:
            split = "test"
            n_te += 1
        out_img = out_root / split / "images" / f"sss_{name}_{img.stem}.png"
        out_img.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out_img), im)
        out_lbl = out_root / split / "labels" / f"sss_{name}_{img.stem}.txt"
        out_lbl.parent.mkdir(parents=True, exist_ok=True)
        out_lbl.write_text(SSS_TEST_IMG)
    print(f"  SSS {name}: train={n_tr} val={n_va} test={n_te}")
    return n_tr, n_va, n_te


def copy_fls(fls_root: Path, out_root: Path) -> None:
    for split in ["train", "val", "test"]:
        src = fls_root / split / "images"
        if not src.exists():
            continue
        dst = out_root / split / "images"
        dlt = out_root / split / "labels"
        dst.mkdir(parents=True, exist_ok=True)
        dlt.mkdir(parents=True, exist_ok=True)
        for f in src.iterdir():
            if f.suffix.lower() in EXTS:
                shutil.copy2(f, dst / f.name)
                lbl = fls_root / split / "labels" / (f.stem + ".txt")
                if lbl.exists():
                    shutil.copy2(lbl, dlt / (f.stem + ".txt"))


def build(output: str, fls_root: str) -> Path:
    out = Path(output)
    if out.exists():
        shutil.rmtree(out)
    for split in ["train", "val", "test"]:
        (out / split / "images").mkdir(parents=True, exist_ok=True)
        (out / split / "labels").mkdir(parents=True, exist_ok=True)

    rng = random.Random(7)
    for root in SSS_ROOTS:
        if Path(root).exists():
            add_sss(Path(root), out, rng)

    copy_fls(Path(fls_root), out)

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
    print(f"\nDataset (held-out SSS test): {out}")
    print(f"  Train: {counts['train']} | Val: {counts['val']} | Test: {counts['test']}")
    return yaml_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build real SSS+FLS dataset with held-out test")
    parser.add_argument("--output", type=str, default="data/sonar_sss2")
    parser.add_argument("--fls", type=str, default="data/sonar_real")
    args = parser.parse_args()
    build(args.output, args.fls)