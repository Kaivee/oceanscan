import requests
from pathlib import Path

# Test exactly what the frontend does
img = Path("data/sonar_clean/val/images/sonar_0000.png")
with open(img, "rb") as f:
    r = requests.post(
        "http://localhost:8000/api/v1/detect?clahe_enabled=false",
        files={"file": ("sonar_0000.png", f, "image/png")}
    )
print(f"Status: {r.status_code}")
data = r.json()
print(f"Total detections: {data['metadata']['total_detections']}")
print(f"Model: {data['metadata']['model']}")
for d in data["detections"]:
    print(f"  {d['class_name']} {d['confidence']:.0%} bbox={d['bbox']}")
