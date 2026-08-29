"""Verifies /api/v1/detect returns geotag metadata fields.

Requires the API server running on http://localhost:8000
(start with: uvicorn src.api.main:app --port 8000)
"""
import requests
from pathlib import Path


def detect(path, query="clahe_enabled=false"):
    with open(path, "rb") as f:
        return requests.post(
            f"http://localhost:8000/api/v1/detect?{query}",
            files={"file": (path.name, f, "image/jpeg" if path.suffix == ".jpg" else "image/png")},
        )


img = Path("data/real_sonar/test/images/marine-debris-aris3k-834.png")
r = detect(img)
assert r.status_code == 200, r.status_code
data = r.json()
meta = data["metadata"]
assert "latitude" in meta, meta
assert "longitude" in meta, meta
assert meta["geotag_source"] in ("exif", "none"), meta
print("PASS untagged ->", meta["latitude"], meta["longitude"], meta["geotag_source"])

geo = Path("data/geotagged/marine-debris-aris3k-834_geotagged.jpg")
rg = detect(geo)
assert rg.status_code == 200, rg.status_code
gmeta = rg.json()["metadata"]
print("PASS geotagged ->", gmeta["latitude"], gmeta["longitude"], gmeta["geotag_source"])
assert gmeta["geotag_source"] == "exif", gmeta
assert gmeta["latitude"] is not None and gmeta["longitude"] is not None, gmeta

