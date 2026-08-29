# EXIF Geotag Support in AI Detections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI debris detections anchor to the real GPS coordinate baked into an uploaded sonar frame's EXIF (falling back to the real survey start point when no tag exists), replacing the current random lat/lon scatter in `apiDetectionToTarget`.

**Architecture:** The FastAPI `/detect` endpoint extracts EXIF GPS from the uploaded file via a new PIL-based helper and returns `latitude`/`longitude` in response `metadata`. The React `apiDetectionToTarget` uses that position (or the `TRAJECTORY` start point) with a swath-side offset per detection.

**Tech Stack:** Python + PIL (FastAPI), Next.js/React (TypeScript).

## Global Constraints

- Follow existing codebase test convention: plain Python scripts that run with `python`, NOT pytest (there is no pytest and no `tests/` dir; see `ml/test_api.py`, `ml/test_model.py`).
- Keep `requirements.txt` unchanged — PIL (`Pillow`) is already a dependency. Do NOT add piexif.
- Frontend `NEXT_PUBLIC_*` env vars and React Compiler lint rules apply: no ref writes during render, escape apostrophes as `&apos;` in JSX. Run `npm run lint` (via `cmd /c "npm run lint"`) and `npx next build` (via `cmd /c "npx next build"`).
- Latitude range `[-90, 90]`, longitude range `[-180, 180]`. Out-of-range or missing GPS → return `null` (fallback).
- Do not change model class detection, bbox computation, or `SonarTarget` shape.

---

### Task 1: EXIF GPS extraction helper (backend)

**Files:**
- Create: `ml/src/preprocessing/exif.py`
- Test: `ml/test_exif.py`

**Interfaces:**
- Consumes: nothing (standalone); uses PIL (`PIL.Image`, `PIL.ExifTags`).
- Produces:
  - `get_gps_from_bytes(data: bytes) -> dict | None` — returns `{"latitude": float, "longitude": float}` or `None`.
  - `_dms_to_decimal(value: tuple, ref: str) -> float` — DMS rational tuple `((d,dn),(m,mn),(s,sn))` + hemisphere ref `"N"/"S"/"E"/"W"` to decimal degrees; returns `None` if malformed.

- [ ] **Step 1: Write the failing test**

Create `ml/test_exif.py`:

```python
from pathlib import Path
from io import BytesIO
from PIL import Image
from src.preprocessing.exif import get_gps_from_bytes, _dms_to_decimal


def _untagged_png_bytes() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (16, 16)).save(buf, format="PNG")
    return buf.getvalue()


def test_untagged_returns_none():
    data = _untagged_png_bytes()
    assert get_gps_from_bytes(data) is None


def test_real_untagged_aris3k_returns_none():
    p = Path("data/real_sonar/test/images/marine-debris-aris3k-834.png")
    assert get_gps_from_bytes(p.read_bytes()) is None


def test_dms_north_west():
    assert abs(_dms_to_decimal(((41, 1), (18, 1), (19, 1)), "N") - 41.30527777) < 1e-4
    assert abs(_dms_to_decimal(((70, 1), (33, 1), (24, 1)), "W") - -70.55666666) < 1e-4


def test_dms_south_east_negative_positive():
    assert abs(_dms_to_decimal(((10, 1), (0, 1), (0, 1)), "S") - -10.0) < 1e-9
    assert abs(_dms_to_decimal(((10, 1), (0, 1), (0, 1)), "E") - 10.0) < 1e-9


def test_dms_malformed_returns_none():
    assert _dms_to_decimal(((41, 0), (18, 1), (19, 1)), "N") is None  # div by zero
    assert _dms_to_decimal("garbage", "N") is None
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `ml/`): `python test_exif.py`
Expected: `ModuleNotFoundError: No module named 'src.preprocessing.exif'`

- [ ] **Step 3: Write minimal implementation**

Create `ml/src/preprocessing/exif.py`:

```python
"""EXIF GPS geotag extraction for georeferenced sonar frames."""
from __future__ import annotations

import io

from PIL import Image
from PIL.ExifTags import GPSTAGS

GPS_IFD_TAG = 34853


def _dms_to_decimal(value, ref: str):
    """Convert a DMS rational tuple plus hemisphere ref to decimal degrees."""
    try:
        deg = value[0][0] / value[0][1]
        mn = value[1][0] / value[1][1]
        sec = value[2][0] / value[2][1]
    except (TypeError, IndexError, ZeroDivisionError):
        return None
    decimal = deg + mn / 60 + sec / 3600
    return -decimal if ref in ("S", "W") else decimal


def get_gps_from_bytes(data: bytes):
    """Extract {latitude, longitude} from image EXIF GPS, or None.

    Returns None for untagged images, missing GPS, malformed values, or
    out-of-range coordinates (lat not in [-90,90], lon not in [-180,180]).
    """
    try:
        image = Image.open(io.BytesIO(data))
        exif = image.getexif()
        if not exif or GPS_IFD_TAG not in exif:
            return None
        gps = exif.get_ifd(GPS_IFD_TAG)
        lat_ref = gps.get(1)
        lat_val = gps.get(2)
        lon_ref = gps.get(3)
        lon_val = gps.get(4)
        if lat_ref is None or lon_ref is None or lat_val is None or lon_val is None:
            return None
        lat = _dms_to_decimal(lat_val, lat_ref)
        lon = _dms_to_decimal(lon_val, lon_ref)
        if lat is None or lon is None:
            return None
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            return None
        return {"latitude": round(lat, 6), "longitude": round(lon, 6)}
    except Exception:
        return None
```

- [ ] **Step 4: Run test to verify it passes**

Run (from `ml/`): `python test_exif.py`
Expected: no assertion errors, "OK" or silent success.

- [ ] **Step 5: Commit**

```bash
git add ml/src/preprocessing/exif.py ml/test_exif.py
git commit -m "feat(ml): add EXIF GPS extraction helper for geotagged frames"
```

---

### Task 2: Wire EXIF geotag into the /detect endpoint metadata

**Files:**
- Modify: `ml/src/api/main.py:166-176` (file read) and `ml/src/api/main.py:229-240` (response metadata)
- Test: `ml/test_api_geotag.py`

**Interfaces:**
- Consumes: `get_gps_from_bytes(data: bytes) -> dict | None` from Task 1.
- Produces: `ApiResponse["metadata"]` gains `latitude: float | null`, `longitude: float | null`, `geotag_source: "exif" | "none"`.

- [ ] **Step 1: Write the failing test**

Create `ml/test_api_geotag.py` — a plain script that validates the endpoint returns the new metadata fields (requires a running server, mirroring `test_api.py`; start server separately):

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Start server (from `ml/`): `uvicorn src.api.main:app --port 8000`
Then run (from `ml/`): `python test_api_geotag.py`
Expected: `KeyError: 'latitude'` (fields not yet present).

- [ ] **Step 3: Write minimal implementation**

In `ml/src/api/main.py`:

Add import near top (with other preprocessing imports):
```python
from src.preprocessing.exif import get_gps_from_bytes
```

After decoding the file into `contents` (existing line ~168, before `cv2.imdecode`):
```python
        geotag = get_gps_from_bytes(contents)
```

In the response dict (`response["metadata"]`, existing line ~229):
```python
        "latitude": geotag["latitude"] if geotag else None,
        "longitude": geotag["longitude"] if geotag else None,
        "geotag_source": "exif" if geotag else "none",
```

- [ ] **Step 4: Run test to verify it passes**

Server still running; run: `python test_api_geotag.py`
Expected: `PASS: metadata has latitude, longitude, geotag_source: ...`

- [ ] **Step 5: Commit**

```bash
git add ml/src/api/main.py ml/test_api_geotag.py
git commit -m "feat(ml): return EXIF geotag in /detect metadata"
```

---

### Task 3: Frontend — survey start point + position-aware detection placement

**Files:**
- Modify: `src/lib/targets.ts` — add `surveyStartPoint()`, change `apiDetectionToTarget` signature and body, extend `ApiResponse["metadata"]` type.

**Interfaces:**
- Consumes: `TRAJECTORY` (`targets.ts:87`), `swathPosition(t: Pick<SonarTarget, "box">): "left"|"center"|"right"` (`targets.ts:243`), `ApiResponse["metadata"]` with new `latitude`/`longitude` fields.
- Produces:
  - `surveyStartPoint(): { lat: number; lon: number }` — midpoint of the min/max lat and min/max lon across `TRAJECTORY`.
  - `apiDetectionToTarget(det, index, metadata, imageUrl?, sourceFile?)` now places targets at `metadata.latitude`/`metadata.longitude` (or `surveyStartPoint()` fallback), plus a deterministic per-index swath offset.

- [ ] **Step 1: Write the failing test (frontend)**

Frontend has no test runner configured. Verification for this task is via `npm run lint` + `npx next build` (compile-time) plus a manual runtime check. No new test file.

- [ ] **Step 2: Run to verify current behavior**

Run: `cmd /c "npm run lint"` — expected clean baseline before edits.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/targets.ts`:

Add `surveyStartPoint()` (place near `TRAJECTORY` or above `apiDetectionToTarget`):

```ts
export function surveyStartPoint(): { lat: number; lon: number } {
  const lats = TRAJECTORY.map(([lat]) => lat);
  const lons = TRAJECTORY.map(([, lon]) => lon);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lon = (Math.min(...lons) + Math.max(...lons)) / 2;
  return { lat, lon };
}
```

Extend `ApiResponse["metadata"]` type (in the `ApiResponse` interface, around `targets.ts:386`):

```ts
  metadata: {
    image_shape: [number, number];
    model: string;
    device: string;
    latency_ms: number;
    confidence_threshold: number;
    clahe_enabled: boolean;
    total_detections: number;
    latitude?: number | null;
    longitude?: number | null;
  };
```

Change the coordinate assignment in `apiDetectionToTarget` (currently `targets.ts:423-424`). Replace these two lines:

```ts
    lat: 41.3250 + Math.random() * 0.02,
    lon: -70.5565 + Math.random() * 0.04,
```

with position-aware placement. The `box` used by `swathPosition` must be the **0-100 normalized** viewport box (matching existing `box` semantics), so compute it up front:

```ts
  const box = {
    x: Math.round((x1 / imgW) * 100),
    y: Math.round((y1 / imgH) * 100),
    w: Math.round((w / imgW) * 100),
    h: Math.round((h / imgH) * 100),
  };
  const frame =
    metadata.latitude != null && metadata.longitude != null
      ? { lat: metadata.latitude, lon: metadata.longitude }
      : surveyStartPoint();
  const swath = swathPosition({ box });
  const spread = index % 5; // deterministic, not random
  const lateral = swath === "left" ? -0.0012 : swath === "right" ? 0.0012 : 0;
  const along = (spread - 2) * 0.0008;
```

...use that same `box` in the return object (replace the inline `box` computed at what is currently line 432):

```ts
    box,
```

...and set the return object's lat/lon to:

```ts
    lat: frame.lat + lateral,
    lon: frame.lon + along,
```

This reuses the precomputed `box` constant for both the swath spread and the returned `SonarTarget.box`, keeping the 0-100 scale consistent with `swathPosition`'s expectation.

- [ ] **Step 4: Run to verify it compiles & lints**

Run: `cmd /c "npm run lint"` — expected 0 errors, 0 warnings.
Run: `cmd /c "npx next build"` — expected successful build.

- [ ] **Step 5: Manual runtime check**

At `http://localhost:3000`, upload `ml/data/real_sonar/test/images/marine-debris-aris3k-834.png` (untagged). Confirm detected targets cluster near the survey start point instead of scattering randomly. (Requires the local FastAPI on :8000, or mock fallback — mock path should still not show random spread.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/targets.ts
git commit -m "feat: anchor AI detections to EXIF geotag or survey start point"
```

---

### Task 4: Frontend — pass-through and cleanup (no-op guard)

**Files:**
- Modify: `src/app/page.tsx` — confirm `handleDetect` (line 48) passes `response.metadata` into `apiDetectionToTarget`; it already does. No code change expected unless Task 3 type change surfaces an error.

**Interfaces:**
- Consumes: `apiDetectionToTarget` new signature from Task 3.
- Produces: nothing new.

- [ ] **Step 1: Verify no residual random lat/lon remains**

Run from project root: `cmd /c "findstr /s /n /c:'Math.random()*0.02' src\*.ts src\*.tsx"`
Expected: no matches.

- [ ] **Step 2: Type-check page.tsx**

Run: `cmd /c "npm run lint"` then `cmd /c "npx next build"`.
Expected: both pass; if any type error appears in `page.tsx` due to metadata fields, update the call site to satisfy typecheck (fields are optional, so usually none needed).

- [ ] **Step 3: Commit (if changes made)**

```bash
git add src/app/page.tsx
git commit -m "chore: ensure detection call passes geotag metadata"
```
(If no changes needed, skip the commit and note that in the summary.)
