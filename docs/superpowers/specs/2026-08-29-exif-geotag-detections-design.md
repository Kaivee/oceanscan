# Design: EXIF Geotag Support for AI Detections

**Date:** 2026-08-29
**Status:** Proposed

## Problem

When a user uploads a sonar frame and the AI detects debris, the resulting map targets are placed at **random** coordinates (`apiDetectionToTarget` in `src/lib/targets.ts` uses `Math.random()` for lat/lon). The user wants detections to appear at **real, meaningful coordinates** rather than random scatter.

## Goal

- If an uploaded sonar frame carries a baked-in GPS/EXIF geotag, AI detections anchor to that real coordinate (with a realistic swath offset per object so multiple detections fan out).
- If the frame has **no** geotag, detections fall back to the **real survey start point** (center of `TRAJECTORY`), replacing random scatter with a stable, real anchor.

## Non-goals

- No change to how the model detects object classes (Ghost Net, Metal Drum, Shipwreck, Natural Formation) or computes bounding boxes/sizes.
- No new UI fields for manually entering coordinates (user rejected manual-entry in favor of EXIF auto-read).

## Current data flow

1. `upload-modal.tsx` → `POST /api/v1/detect` with the file → receives `ApiResponse` (`detections` + `metadata`).
2. `page.tsx` `handleDetect` → maps each detection through `apiDetectionToTarget(det, index, metadata, imageUrl, fileName)`.
3. `apiDetectionToTarget` builds a `SonarTarget`, assigning `lat: 41.3250 + Math.random()*0.02`, `lon: -70.5565 + Math.random()*0.04` (`targets.ts:423-424`).

## Design

### Backend — `ml/src/api/main.py` (FastAPI `/detect` endpoint)

- After reading the uploaded file bytes, extract any EXIF GPS geotag from the image using `PIL` (`Image.open(io.BytesIO(contents))._getexif()` + GPS IFD).
- Produce an optional `latitude`/`longitude` (decimal degrees, floats).
- Append to the returned `metadata`:
  - `latitude: float | null`
  - `longitude: float | null`
  - `geotag_source: "exif" | "none"`
- `PIL` is already a dependency (`Pillow>=10.2.0,<13`) and available in the ML venv.
- The model wrapper (`segmentation_model.py`) is unchanged — geotag is frame metadata, not per-detection.

### Frontend — `src/lib/targets.ts`

- `SonarTarget` unchanged (already has `lat`/`lon`).
- Add a helper `surveyStartPoint(): { lat: number; lon: number }` returning the center/start of `TRAJECTORY` (e.g., `TRAJECTORY[0]` or the longitude-span midpoint).
- Change `apiDetectionToTarget(det, index, metadata, imageUrl?, sourceFile?)`:
  - Read frame position from `metadata.latitude` / `metadata.longitude` (fall back to `surveyStartPoint()` when null).
  - Use the existing `swathPosition(box): "left"|"center"|"right"` helper to give each detection a small lateral offset from the frame position (realistic spread across the swath).
  - Add a small per-index longitudinal jitter so multiple detections don't stack exactly; keep this deterministic, not `Math.random()`-based.
  - Result: every detection lands near the real frame position (or survey start), spread by swath side.

### Frontend — `src/app/page.tsx`

- `handleDetect` already passes `response.metadata` into `apiDetectionToTarget`; no signature change required beyond what `targets.ts` exposes. `ApiResponse["metadata"]` in `targets.ts` gains optional `latitude`/`longitude` fields.

## Data flow (after change)

1. Upload geotagged frame → API extracts EXIF GPS → `metadata.latitude`/`longitude` populated.
2. `handleDetect` → `apiDetectionToTarget(det, i, metadata, ...)` → uses frame position (or survey start fallback).
3. Detections now land at real coordinates, spread by swath side.

## Error handling

- EXIF extraction failures (corrupt EXIF, no GPS IFD) → return `null` lat/lon, trigger start-point fallback. Never crash the endpoint.
- Garbage lat/lon values from EXIF → validate range (`lat` in `[-90,90]`, `lon` in `[-180,180]`); invalid → treat as null.
- No EXIF geotag → `geotag_source: "none"`, metadata lat/lon null → start-point fallback.

## Testing

- Backend: unit-test EXIF extraction on a synthetic geotagged PNG (PIL can write EXIF GPS); confirm metadata returns the expected lat/lon; confirm an untagged image returns null.
- Verify the `/detect` endpoint returns the new metadata fields on both a tagged and untagged image.
- Frontend: build (`npm run build`) and lint (`npm run lint`) pass; `apiDetectionToTarget` places targets at the supplied position (start-point fallback when metadata null).
- Manual: upload `marine-debris-aris3k-834.png` (untagged) → targets cluster at survey start instead of random scatter.

## Files touched

- `ml/src/api/main.py` — EXIF extraction + metadata fields.
- `ml/src/preprocessing/` (optional) — add a small `exif.py` util for clean separation of EXIF GPS parsing.
- `src/lib/targets.ts` — `surveyStartPoint()`, `apiDetectionToTarget` changes, `ApiResponse["metadata"]` type.
- `src/app/page.tsx` — pass-through (likely no change beyond type compliance).
