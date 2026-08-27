from pathlib import Path
import shutil, yaml

src = Path("data/sonar_dataset")
out = Path("data/sonar_clean")

for split in ["train", "val"]:
    (out / split / "images").mkdir(parents=True, exist_ok=True)
    (out / split / "labels").mkdir(parents=True, exist_ok=True)

    for label_file in (src / split / "labels").glob("*.txt"):
        if label_file.stat().st_size == 0:
            continue
        stem = label_file.stem
        for ext in [".png", ".jpg", ".jpeg"]:
            img = src / split / "images" / f"{stem}{ext}"
            if img.exists():
                shutil.copy2(img, out / split / "images" / f"{stem}{ext}")
                shutil.copy2(label_file, out / split / "labels" / f"{stem}.txt")
                break

cfg = {
    "path": str(out.resolve()),
    "train": "train/images",
    "val": "val/images",
    "nc": 4,
    "names": ["Ghost Net", "Metal Drum", "Shipwreck", "Natural Formation"],
}
(out / "sonar_data.yaml").write_text(yaml.dump(cfg, default_flow_style=False))

train_n = len(list((out / "train" / "images").glob("*.*")))
val_n = len(list((out / "val" / "images").glob("*.*")))
print(f"Clean dataset: {train_n} train, {val_n} val")
print(f"Config: {out / 'sonar_data.yaml'}")
