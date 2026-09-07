"""
Real Sonar Combined Dataset Builder
=====================================
Builds a PURE-REAL training dataset (no mock/synthetic imagery):
  - Marine Debris FLS (ARIS 3k) — from data/real_sonar (already YOLO-seg)
  - UATD underwater acoustic target frames — from raw_downloads (BMP + VOC XML)
Class names are mapped through the UATD/FLS → OceanScan maps.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path
from xml.etree import ElementTree as ET

import cv2
import numpy as np
import yaml

from prepare_real_data import OCEANSCAN_CLASSES, convert_uatd_class

UATD_CLASS_ALIASES = {
    "cube": "Cube",
    "ball": "Ball",
    "cylinder": "Cylinder",
    "humanbody": "Human Body",
    "plane": "Plane",
    "circle cage": "Circle Cage",
    "circle_cage": "Circle Cage",
    "square cage": "Square Cage",
    "square_cage": "Square Cage",
    "metal bucket": "Metal Bucket",
    "metal_bucket": "Metal Bucket",
    "tyre": "Tyre",
    "tire": "Tyre",
    "rov": "ROV",
}


def map_uatd_name(raw: str) -> int:
    key = raw.strip().lower().replace("-", " ")
    canonical = UATD_CLASS_ALIASES.get(key, raw.strip())
    return convert_uatd_class(canonical)


def parse_voc(xml_path: Path, w: int, h: int) -> list[str]:
    tree = ET.parse(str(xml_path))
    lines = []
    for obj in tree.getroot().findall("object"):
        name_el = obj.find("name")
        bbox = obj.find("bndbox")
        if name_el is None or name_el.text is None or bbox is None:
            continue
        els = {tag: bbox.find(tag) for tag in ["xmin", "ymin", "xmax", "ymax"]}
        if any(v is None or v.text is None for v in els.values()):
            continue
        xmin, ymin = int(els["xmin"].text), int(els["ymin"].text)
        xmax, ymax = int(els["xmax"].text), int(els["ymax"].text)
        cls = map_uatd_name(name_el.text)

        xmin, xmax = max(0, xmin) / w, min(w, xmax) / w
        ymin, ymax = max(0, ymin) / h, min(h, ymax) / h
        if xmax - xmin < 1e-4 or ymax - ymin < 1e-4:
            continue
        cx = (xmin + xmax) / 2
        cy = (ymin + ymax) / 2
        bw = xmax - xmin
        bh = ymax - ymin
        poly = f"{xmin:.6f} {ymin:.6f} {xmax:.6f} {ymin:.6f} {xmax:.6f} {ymax:.6f} {xmin:.6f} {ymax:.6f}"
        lines.append(f"{cls} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f} {poly}")
    return lines


def convert_uatd(source_root: Path, out_root: Path, train_ratio: float, rng) -> tuple[int, int]:
    images_dir = source_root / "images"
    ann_dir = source_root / "annotations"
    files = sorted(images_dir.glob("*.bmp")) or sorted(images_dir.glob("*.png")) or sorted(images_dir.glob("*.jpg"))

    n_train = n_val = 0
    rnd = __import__("random").Random(42)

    for i, img_path in enumerate(files):
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        gh, gw = img.shape[:2]
        xml_path = ann_dir / (img_path.stem + ".xml")
        labels = parse_voc(xml_path, gw, gh) if xml_path.exists() else []

        split = "train" if (rnd.random() < train_ratio) else "val"
        out_img = out_root / split / "images" / f"uatd_{source_root.name}_{img_path.stem}.png"
        out_img.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out_img), img)
        out_lbl = out_root / split / "labels" / f"uatd_{source_root.name}_{img_path.stem}.txt"
        out_lbl.parent.mkdir(parents=True, exist_ok=True)
        out_lbl.write_text("\n".join(labels))

        if split == "train":
            n_train += 1
        else:
            n_val += 1

    return n_train, n_val


def copy_fls(real_root: Path, out_root: Path) -> None:
    for split in ["train", "val", "test"]:
        src_img = real_root / split / "images"
        if not src_img.exists():
            continue
        dst_img = out_root / split / "images"
        dst_lbl = out_root / split / "labels"
        dst_img.mkdir(parents=True, exist_ok=True)
        dst_lbl.mkdir(parents=True, exist_ok=True)
        for f in src_img.iterdir():
            if f.suffix.lower() not in (".png", ".jpg", ".jpeg", ".bmp"):
                continue
            shutil.copy2(f, dst_img / f.name)
            lbl = real_root / split / "labels" / (f.stem + ".txt")
            if lbl.exists():
                shutil.copy2(lbl, dst_lbl / (f.stem + ".txt"))


def build(output: str, uatd_roots: list[str], fls_root: str, train_ratio: float = 0.8) -> Path:
    out = Path(output)
    if out.exists():
        shutil.rmtree(out)

    for split in ["train", "val", "test"]:
        (out / split / "images").mkdir(parents=True, exist_ok=True)
        (out / split / "labels").mkdir(parents=True, exist_ok=True)

    for root in uatd_roots:
        n_tr, n_va = convert_uatd(Path(root), out, train_ratio, None)
        print(f"UATD {Path(root).name}: train={n_tr} val={n_va}")

    copy_fls(Path(fls_root), out)

    counts = {}
    for split in ["train", "val", "test"]:
        counts[split] = len(list((out / split / "images").glob("*.png")))

    yaml_path = out / "sonar_data.yaml"
    config = {
        "path": str(out.resolve()),
        "train": "train/images",
        "val": "val/images",
        "test": "test/images",
        "nc": len(OCEANSCAN_CLASSES),
        "names": OCEANSCAN_CLASSES,
    }
    with open(yaml_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False)

    print(f"\nPure-real dataset: {out}")
    print(f"  Train: {counts['train']} | Val: {counts['val']} | Test: {counts['test']}")
    return yaml_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build pure-real combined sonar dataset")
    parser.add_argument("--output", type=str, default="data/sonar_real", help="Output directory")
    parser.add_argument("--uatd", nargs="+", default=[
        "data/raw_downloads/uatd/UATD_Test_1/UATD_Test_1",
        "data/raw_downloads/uatd/UATD_Test_2/UATD_Test_2",
    ])
    parser.add_argument("--fls", type=str, default="data/real_sonar")
    parser.add_argument("--train-ratio", type=float, default=0.8)
    args = parser.parse_args()

    build(args.output, args.uatd, args.fls, args.train_ratio)