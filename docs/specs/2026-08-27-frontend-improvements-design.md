# OceanScan AI — Frontend Improvements Design

## Goal
Improve the upload→analyze→report flow, add interactive click-to-inspect annotations in the Analyze tab, and make the Dispatch Report metadata dynamic.

## 1. Sequential Flow

### Current
Upload completion → jumps to Analyze tab immediately.

### New
1. User uploads file → modal closes → switches to **Acquire** tab
2. Acquire runs scan animation on the uploaded image (7s sweep)
3. Scan completes → auto-switches to **Analyze** tab
4. User inspects detections → proceeds to **Report** manually

### Gating
- Tabs 2 (Analyze) and 3 (Report) are **dimmed/disabled** until `scanDone === true`
- Step indicator in top bar shows: `1 Acquire` → `2 Analyze` → `3 Report`
- Active step highlighted green, completed steps get a checkmark, future steps are gray

### State changes in `page.tsx`
- `handleDetect()` now sets `pendingUpload` and switches to `"acquire"` (not `"analyze"`)
- `scanDone` gates tab clicks — clicking Analyze/Report before scan completes does nothing
- After scan completes (`onScanComplete`), sets `scanDone = true` and switches to `"analyze"`

---

## 2. Analyze Tab: Click-to-Inspect + Annotations

### New features
- **Click bounding box** → pins that detection, opens detail panel
- **Analyst notes** — text input per detection, stored in state, appears in report
- **Confirm / False Positive toggle** — two buttons per detection
- **Summary bar** at top: "X confirmed · Y false positive · Z pending"
- **Keyboard navigation** — Left/Right arrow keys cycle through detections

### UI layout
```
┌─────────────────────────────────────────────────┐
│  Summary: 3 confirmed · 1 false positive · 2 pending  │
├──────────────────────────────┬──────────────────┤
│                              │  DETAIL PANEL    │
│  Sonar Image + Bounding      │  Class: Ghost Net│
│  Boxes (clickable)           │  Conf: 94.2%     │
│                              │  Depth: 34m      │
│                              │  [✓ Confirm]     │
│                              │  [✗ False +]     │
│                              │  Notes: [...]    │
├──────────────────────────────┴──────────────────┤
│  Detection List (sidebar)                       │
│  ▸ TGT-001 Ghost Net  94%  [Confirmed]         │
│  ▸ TGT-002 Metal Drum 91%  [Pending]           │
└─────────────────────────────────────────────────┘
```

### State additions
- `selectedDetectionId: string | null` — which detection is pinned
- `detectionNotes: Record<string, string>` — analyst notes per detection ID
- `detectionStatus: Record<string, "confirmed" | "false_positive" | "pending">` — per-detection status

### Behavior
- Clicking a bounding box sets `selectedDetectionId`
- Clicking the same box again deselects it
- Arrow keys cycle through `displayTargets` list
- Notes and status persist in `page.tsx` state (no localStorage yet)
- Status badges appear on bounding box labels (green checkmark for confirmed, red X for false positive)

---

## 3. Dispatch Report: Dynamic Metadata

### Currently hardcoded → now dynamic
| Field | Source |
|-------|--------|
| Vessel name | Editable text input (default: `MSV SAGAR-DHWANI`) |
| Sensor type | Editable text input (default: `900 kHz Side-Scan Sonar`) |
| Survey ID | Editable text input (default: `GOA_SURVEY_L04`) |
| Area scanned | Computed: count of uploaded images × estimated coverage |
| Mission time | Computed: elapsed time since first upload |
| Contacts found | Dynamic: `targets.length` (already dynamic) |
| High risk count | Dynamic: already computed |

### Report table additions
- New column: **Status** — shows Confirmed / False Positive / Pending badge per row
- New column: **Analyst Notes** — shows note text (truncated) if present

### Demo targets behavior
- When `apiTargets.length > 0`: show only API targets (real uploads)
- When `apiTargets.length === 0`: show demo `TARGETS[]` as before (demo mode)

---

## Files to modify
- `src/app/page.tsx` — flow gating, state additions
- `src/components/top-bar.tsx` — step indicator, tab gating
- `src/components/analyze-tab.tsx` — click-to-inspect, detail panel, notes, status
- `src/components/report-tab.tsx` — dynamic metadata, status column
- `src/components/upload-modal.tsx` — switch to acquire on upload
- `src/lib/targets.ts` — detection status/notes types

---

## Verification
1. Upload a file → should land on Acquire tab with scan animation
2. Scan completes → auto-switches to Analyze
3. Click a bounding box → detail panel opens with class/confidence
4. Add a note and mark as confirmed → badge appears on box
5. Go to Report → vessel/sensor fields are editable, status column shows confirmed/false positive
6. Tabs are gated until scan completes
