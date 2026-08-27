#!/usr/bin/env python3
"""Combine real_sonar + sonar_clean into one training dataset."""

import shutil
from pathlib import Path

BASE = Path(r"C:\Users\hikai\Desktop\visual studio\sih\sonar\ml")
REAL = BASE / "data" / "real_sonar"
SYNTH = BASE / "data" / "sonar_clean"
OUT = BASE / "data" / "sonar_combined"

for split in ["train", "val", "test"]:
    for sub in ["images", "labels"]:
        out_dir = OUT / split / sub
        out_dir.mkdir(parents=True, exist_ok=True)

        # Copy real data
        src = REAL / split / sub
        if src.exists():
            for f in src.iterdir():
                shutil.copy2(f, out_dir / f.name)

        # Copy synthetic data (only if not already present from real)
        src_synth = SYNTH / split / sub
        if src_synth.exists():
            for f in src_synth.iterdir():
                dst = out_dir / f.name
                if not dst.exists():
                    shutil.copy2(f, dst)

# Generate YAML
import yaml
yaml_path = OUT / "sonar_data.yaml"
config = {
    "path": str(OUT.resolve()),
    "train": "train/images",
    "val": "val/images",
    "test": "test/images",
    "nc": 4,
    "names": ["Ghost Net", "Metal Drum", "Shipwreck", "Natural Formation"],
}
with open(yaml_path, "w") as f:
    yaml.dump(config, f, default_flow_style=False, sort_keys=False)

# Count
for split in ["train", "val", "test"]:
    imgs = len(list((OUT / split / "images").glob("*")))
    lbls = len(list((OUT / split / "labels").glob("*.txt")))
    nonempty = sum(1 for f in (OUT / split / "labels").iterdir() if f.stat().st_size > 0)
    print(f"{split}: {imgs} images, {lbls} label files, {nonempty} non-empty")

print(f"\nYAML: {yaml_path}")
