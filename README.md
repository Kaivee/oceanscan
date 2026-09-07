# OceanScan AI — Marine Sonar Debris Detection

End-to-end marine sonar debris-detection system: a **YOLOv8-seg** model fine-tuned on real side-scan/forward-look sonar imagery, served by a **FastAPI** inference API, and visualized in a **Next.js** hydrographic survey workstation styled as a vintage admiralty chart office.

Built with **Next.js (App Router) · TypeScript · Tailwind CSS v4 · Lucide React** for the frontend and **Python · Ultralytics YOLOv8-seg · FastAPI · PyTorch · OpenCV** for the ML backend.

## Architecture

```
         ┌───────────────────────────────────────────────────────────────┐
         │  Next.js frontend  (localhost:3000)                            │
         │  upload sonar image → map pins → GeoJSON/CSV → ROV route      │
         └───────────────────────────────┬───────────────────────────────┘
                                         │  POST /api/v1/detect
                                         ▼
         ┌───────────────────────────────────────────────────────────────┐
         │  FastAPI inference server  (localhost:8000,  ml/)              │
         │  EXIF GPS → preprocess (CLAHE/speckle) → YOLOv8-seg →          │
         │  detections + masks + risk → optional Grad-CAM heatmap         │
         └───────────────────────────────────────────────────────────────┘
```

The frontend is **not** mock — the "Ingest Survey Log" flow (`src/components/upload-modal.tsx`) posts the uploaded sonar file to the real inference API. Detections are converted into map pins with GPS coordinates extracted from the image's **EXIF geotag** (`src/lib/targets.ts` → `apiDetectionToTarget`). The only hardcoded data left is the "Load a sample survey" demo shortcut (`SAMPLE_TARGETS`).

## Quick start

### 1. ML backend (Python 3.12)

```bash
cd ml
python -m venv .venv                     # or reuse the existing .venv
.venv\Scripts\activate                    # Windows
pip install -r requirements.txt
uvicorn src.api.main:app --port 8000     # loads best.pt, serves :8000
```

The server auto-loads a trained model (searches `runs/segment/train/weights/best.pt`, `model.pt`, else the pretrained `yolov8s-seg.pt`). Default device is auto-detected (CUDA > MPS > CPU).

- `GET  /api/v1/health` — model/device status
- `POST /api/v1/detect` — multipart `file` (+ `confidence_threshold`, `clahe_enabled`, `generate_heatmap`)

### 2. Frontend

```bash
npm install
# optional — point at a deployed API instead of localhost:8000
# set NEXT_PUBLIC_INFERENCE_URL in .env.local
npm run dev
```

Open http://localhost:3000

## ML model

Trained with `ml/train.py` using **YOLOv8-seg** instance segmentation (boxes + pixel masks) fine-tuned from the COCO-pretrained `yolov8s-seg.pt`.

| | |
|---|---|
| Task | Segmentation — box + mask per object |
| Classes | Ghost Net, Metal Drum, Shipwreck, Natural Formation (+ HIGH/MEDIUM/LOW risk) |
| Base model | `yolov8s-seg.pt`, imgsz 640 |
| Optimizer | AdamW, lr 0.001, 50 epochs, early-stop patience 15 |
| Acoustic-aware aug | fliplr 0.5, mosaic 0.5, mixup 0.1, HSV h/s disabled, v 0.2 (no flipud — breaks sonar geometry) |
| Dataset | `ml/data/sonar_combined/` — cleaned/combined real sonar (UATD + Marine Debris FLS): 1545 train / 197 val / 186 test |

### Measured performance

Best run (`ml/runs/segment/train5/weights/best.pt`):

- **Validation (best epoch):** box mAP50 **0.985**, mAP50-95 **0.841**, precision 0.949, recall 0.970
- **Held-out test set (all 186 images, conf 0.3, exact class-set match):** **87.1%** (162/186), partial 12.9%, miss 0%
- **Per-class recall (test):** Ghost Net 97.7%, Metal Drum 99.4%, Natural Formation 100%, Shipwreck 100%

### Training from scratch

```bash
cd ml
python train.py --prepare-data                 # download real sonar data (~2.5 GB)
python train.py --data data/real_sonar/sonar_data.yaml --epochs 50
python train.py --validate --weights runs/segment/train/weights/best.pt --data <yaml>
python train.py --export --weights runs/segment/train/weights/best.pt --export-formats onnx engine
```

## Preprocessing (`ml/src/preprocessing/acoustic_processor.py`)

Sonar-specific enhancement before inference: **CLAHE** contrast equalization (clip 2.0, 8×8 tiles), **bilateral** speckle reduction (edge-preserving, preferred for acoustic noise), and **backscatter min-max normalization**. 16-bit sonar is scaled to 8-bit; EXIF GPS is read directly from the upload.

---

## Research / presentation notes

OceanScan is a **research-oriented** system, not just a detector. Novel points for a hackathon/research pitch:

1. **Instance segmentation, not just detection** — masks give real object **dimensions (L×W×H)** for recovery planning.
2. **Domain-aware training & augmentation** — trained/validated on real sonar, with augmentations that respect acoustic physics (no vertical flip, no hue shifts).
3. **Multi-class debris + risk ranking** — nets/drums/wrecks/natural formations mapped to recovery priority.
4. **End-to-end geotagged loop** — raw sonar + EXIF GPS → detection → **map placement** → CSV/GeoJSON export → ROV retrieval route.
5. **Edge-deployable** — ONNX/TensorRT export, low-latency inference, runs on the survey vessel.

**Known limitations / future work:** rare classes have small test exposure (Shipwreck = 16 test images); no optical-sensor fusion yet; depth/dimension estimates are approximated from pixel geometry; robustness to heavier acoustic noise untested.

## Structure

```
ml/
  train.py                  training, validation, export, dataset prep
  src/api/main.py           FastAPI inference server (/detect, /health)
  src/models/segmentation_model.py   YOLOv8-seg wrapper (detection→targets)
  src/models/explainability.py       Grad-CAM heatmaps
  src/preprocessing/        acoustic_processor.py (CLAHE/speckle), exif.py (GPS)
  data/sonar_combined/      1545 train / 197 val / 186 test
  runs/segment/train5/      best performing model (best.pt)

src/
  app/                      layout, page (dashboard state + detect wiring)
  components/               upload-modal, map-panel, analyze-tab, report-tab, …
  lib/targets.ts            API contract, detection→map-target mapping, CSV/GeoJSON
```
