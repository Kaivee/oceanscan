import requests
import json
from pathlib import Path

classNames = ["Ghost Net", "Metal Drum", "Shipwreck", "Natural Formation"]
test_img_dir = Path(r"C:\Users\hikai\Desktop\visual studio\sih\sonar\ml\data\real_sonar\test\images")
test_lbl_dir = Path(r"C:\Users\hikai\Desktop\visual studio\sih\sonar\ml\data\real_sonar\test\labels")

# Pick 10 diverse images
samples = [
    "marine-debris-aris3k-834",  # Metal Drum, Shipwreck, Ghost Net
    "marine-debris-aris3k-839",  # Ghost Net, Metal Drum, Shipwreck
    "marine-debris-aris3k-832",  # Natural Formation, Metal Drum
    "marine-debris-aris3k-837",  # Shipwreck
    "marine-debris-aris3k-838",  # Ghost Net
    "marine-debris-aris3k-84",   # 2x Metal Drum
    "marine-debris-aris3k-833",  # 2x Natural Formation
    "marine-debris-aris3k-835",  # Natural Formation, Metal Drum
    "marine-debris-aris3k-0",    # Wall + Can (Natural Formation + Metal Drum)
    "marine-debris-aris3k-100",  # Metal Drum
]

print(f"{'Image':<35} {'Expected':<40} {'Predicted':<40} {'Match'}")
print("=" * 160)

correct = 0
total = 0

for name in samples:
    img_path = test_img_dir / f"{name}.png"
    lbl_path = test_lbl_dir / f"{name}.txt"
    
    if not img_path.exists():
        continue
    
    # Read ground truth
    expected = []
    if lbl_path.exists():
        with open(lbl_path) as f:
            for line in f:
                parts = line.strip().split()
                if parts:
                    expected.append(classNames[int(parts[0])])
    
    # Run inference
    with open(img_path, "rb") as img_f:
        r = requests.post(
            "http://localhost:8000/api/v1/detect?clahe_enabled=false&confidence_threshold=0.3",
            files={"file": (img_path.name, img_f, "image/png")},
        )
    data = r.json()
    predicted = [d["class_name"] for d in data["detections"]]
    
    # Compare
    exp_sorted = sorted(expected)
    pred_sorted = sorted(predicted)
    match = exp_sorted == pred_sorted
    
    exp_str = ", ".join(f"{c} ({exp_sorted.count(c)})" for c in sorted(set(exp_sorted)))
    pred_str = ", ".join(f"{c} ({pred_sorted.count(c)})" for c in sorted(set(pred_sorted)))
    
    status = "MATCH" if match else "PARTIAL" if set(expected) & set(predicted) else "MISS"
    if match:
        correct += 1
    total += 1
    
    print(f"{name:<35} {exp_str:<40} {pred_str:<40} {status}")

print(f"\nAccuracy: {correct}/{total} exact matches ({correct/total*100:.0f}%)")
