"""Verifies /api/v1/detect returns geotag metadata fields.

Requires the API server running on http://localhost:8000
(start with: uvicorn src.api.main:app --port 8000)
"""
import requests
from pathlib import Path

img = Path("data/real_sonar/test/images/marine-debris-aris3k-834.png")
with open(img, "rb") as f:
    r = requests.post(
        "http://localhost:8000/api/v1/detect?clahe_enabled=false",
        files={"file": (img.name, f, "image/png")},
    )
assert r.status_code == 200, r.status_code
data = r.json()
meta = data["metadata"]
assert "latitude" in meta, meta
assert "longitude" in meta, meta
assert meta["geotag_source"] in ("exif", "none"), meta
print("PASS: metadata has latitude, longitude, geotag_source:", meta)
