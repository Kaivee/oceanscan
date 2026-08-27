"""Quick model verification — run from ml/ directory:
    python test_model.py
"""
from pathlib import Path
from ultralytics import YOLO

WEIGHTS = Path("runs/segment/train/weights/best.pt")
VAL_IMGS = Path("data/sonar_dataset/val/images")

model = YOLO(str(WEIGHTS))
print(f"Model loaded: {WEIGHTS}")
print(f"Class names: {model.names}")
print()

# Test on synthetic images (known to have objects)
print("=== SYNTHETIC IMAGES (expect detections) ===")
synth = sorted(VAL_IMGS.glob("sonar_*.png"))[:5]
for p in synth:
    r = model(str(p), conf=0.25, verbose=False)[0]
    n = len(r.boxes)
    tag = "OK" if n > 0 else "EMPTY"
    print(f"  [{tag}] {p.name} -> {n} detections")
    for i, b in enumerate(r.boxes):
        print(f"       cls={r.names[int(b.cls[0])]}  conf={b.conf[0]:.3f}")

# Test on real FLS images (labels were empty during training)
print("\n=== REAL FLS IMAGES ===")
fls = sorted(VAL_IMGS.glob("marine-debris-*.png"))[:3]
for p in fls:
    r = model(str(p), conf=0.25, verbose=False)[0]
    n = len(r.boxes)
    tag = "OK" if n > 0 else "EMPTY"
    print(f"  [{tag}] {p.name} -> {n} detections")
    for i, b in enumerate(r.boxes):
        print(f"       cls={r.names[int(b.cls[0])]}  conf={b.conf[0]:.3f}")

# Also test with very low confidence to see if there are any weak detections
print("\n=== SYNTHETIC @ conf=0.05 (low threshold) ===")
for p in synth[:2]:
    r = model(str(p), conf=0.05, verbose=False)[0]
    n = len(r.boxes)
    print(f"  {p.name} -> {n} detections")
    for i, b in enumerate(r.boxes):
        print(f"       cls={r.names[int(b.cls[0])]}  conf={b.conf[0]:.3f}")
