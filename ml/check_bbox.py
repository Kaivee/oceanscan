import requests
import json

img_path = r"C:\Users\hikai\Desktop\visual studio\sih\sonar\ml\data\sonar_clean\val\images\sonar_0001.png"
with open(img_path, "rb") as f:
    r = requests.post(
        "http://localhost:8000/api/v1/detect?clahe_enabled=false",
        files={"file": ("sonar_0001.png", f, "image/png")},
    )
data = r.json()
print(f"image_shape: {data['metadata']['image_shape']}")
print(f"Detections: {data['metadata']['total_detections']}")
for d in data["detections"]:
    x1, y1, x2, y2 = d["bbox"]
    print(f"  {d['class_name']:20s} conf={d['confidence']:.2f}  bbox=[{x1},{y1},{x2},{y2}]  risk={d['risk_level']}")
