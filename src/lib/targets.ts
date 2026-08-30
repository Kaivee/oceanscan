export type Priority = "P1" | "P2" | "P3";

export type ViewMode = "raw" | "denoised" | "original" | "attention";

export type TabKey = "start" | "frame" | "map" | "brief";

export interface TargetDims {
  length: number;
  width: number;
  height: number;
}

export interface SonarTarget {
  id: string;
  class: string;
  priority: Priority;
  confidence: number;
  lat: number;
  lon: number;
  depthM: number;
  dims: TargetDims;
  box: { x: number; y: number; w: number; h: number };
  polygon?: { x: number; y: number }[];
  note: string;
  imageUrl?: string;
  sourceFile?: string;
  fieldAction: string;
}

export interface SampleSurvey {
  id: string;
  sensor: string;
  file: string;
  area: string;
  coordinates: string;
  generated: string;
  targetCount: number;
}

/* =========================================================================
   Sample survey — the reference "Load a sample survey" dataset.
   Bristol Channel (Severn Estuary), datum WGS-84.
   ========================================================================= */

export const SAMPLE_SURVEY: SampleSurvey = {
  id: "LN-014",
  sensor: "ARIS3K-9",
  file: "marine-debris-aris3k-834_geotagged.jpg",
  area: "Martha's Vineyard � 37.6 kB",
  coordinates: "41.31�N 70.56�W",
  generated: "09:44:12",
  targetCount: 3,
};

export const SAMPLE_TARGETS: SonarTarget[] = [
  {
    id: "SSS-001",
    class: "Ghost Net",
    priority: "P1",
    confidence: 0.93,
    lat: 41.3081,
    lon: -70.5562,
    depthM: 18.2,
    dims: { length: 14.8, width: 11.4, height: 1.2 },
    box: { x: 16, y: 31, w: 37, h: 31 },
    imageUrl: "/sample-original.jpg",
    note: "Ghost net - marine-debris-aris3k-834 (class 0). High entanglement risk.",
    fieldAction: "Retrieve - high entanglement risk for marine fauna.",
  },
  {
    id: "SSS-002",
    class: "Metal Drum",
    priority: "P2",
    confidence: 0.81,
    lat: 41.3080,
    lon: -70.5561,
    depthM: 21.7,
    dims: { length: 9.2, width: 8.9, height: 2.9 },
    box: { x: 42, y: 9, w: 24, h: 7 },
    imageUrl: "/sample-original.jpg",
    note: "Metal drum - marine-debris-aris3k-834 (class 1). Compact specular return.",
    fieldAction: "Schedule recovery - medium risk, compact metallic object.",
  },
  {
    id: "SSS-003",
    class: "Shipwreck",
    priority: "P3",
    confidence: 0.68,
    lat: 41.3082,
    lon: -70.5563,
    depthM: 25.4,
    dims: { length: 12.6, width: 9.8, height: 5.1 },
    box: { x: 83, y: 20, w: 10, h: 14 },
    imageUrl: "/sample-original.jpg",
    note: "Shipwreck - marine-debris-aris3k-834 (class 2). Large structured object.",
    fieldAction: "Confirm identity on next pass - large object, log and monitor.",
  },
];

export const PRIORITY_META: Record<Priority, { label: string; desc: string }> = {
  P1: {
    label: "PRIORITY P1",
    desc: "Immediate recovery — entanglement / navigation hazard",
  },
  P2: {
    label: "PRIORITY P2",
    desc: "Scheduled recovery on next available pass",
  },
  P3: {
    label: "PRIORITY P3",
    desc: "Low confidence — confirm on next pass before dispatch",
  },
};

/* Synthetic lawnmower survey trackline for the Bristol Channel sample (WGS-84). */
export const TRAJECTORY: Array<[number, number]> = [
  [51.4692, -2.2402],
  [51.4692, -2.2366],
  [51.4692, -2.2331],
  [51.4692, -2.2296],
  [51.4717, -2.2299],
  [51.4717, -2.2336],
  [51.4717, -2.2373],
  [51.4717, -2.2409],
  [51.4742, -2.2406],
  [51.4742, -2.2372],
  [51.4742, -2.2334],
  [51.4742, -2.2299],
];

/* =========================================================================
   Formatting + geometry helpers
   ========================================================================= */

export type Severity = "high" | "medium" | "low";

export const SEVERITY_META: Record<Severity, { label: string }> = {
  high: { label: "HIGH" },
  medium: { label: "MEDIUM" },
  low: { label: "LOW" },
};

export const CLASS_COLORS: Record<string, { stroke: string; fill: string }> = {
  "Entangled Net":   { stroke: "#FF5A1F", fill: "rgba(255,90,31,0.14)" },
  "Cylindrical Pipe":{ stroke: "#E0912C", fill: "rgba(224,145,44,0.14)" },
  "Debris Field":    { stroke: "#8A8A84", fill: "rgba(138,138,132,0.12)" },
};

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export function fmtLat(lat: number, dp = 4): string {
  return `${Math.abs(lat).toFixed(dp)}°${lat >= 0 ? "N" : "S"}`;
}

export function fmtLon(lon: number, dp = 4): string {
  return `${Math.abs(lon).toFixed(dp)}°${lon >= 0 ? "E" : "W"}`;
}

export function swathPosition(t: Pick<SonarTarget, "box">): "left" | "center" | "right" {
  const cx = t.box.x + t.box.w / 2;
  if (cx < 38) return "left";
  if (cx > 62) return "right";
  return "center";
}

export function estimateSurveyAreaSqm(uploadedImageCount: number): number {
  return 50 * (620 + Math.max(0, uploadedImageCount - 1) * 250);
}

const R_EARTH = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(s));
}

export function bearingDeg(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const y = Math.sin(rad(bLon - aLon)) * Math.cos(rad(bLat));
  const x =
    Math.cos(rad(aLat)) * Math.sin(rad(bLat)) -
    Math.sin(rad(aLat)) * Math.cos(rad(bLat)) * Math.cos(rad(bLon - aLon));
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

export function retrievalOrder(start: [number, number], targets: SonarTarget[]): SonarTarget[] {
  const penalty: Record<Priority, number> = { P1: 0, P2: 250, P3: 600 };
  const order: SonarTarget[] = [];
  const pool = [...targets];
  let cur = start;
  while (pool.length > 0) {
    let bi = 0;
    let bd = Infinity;
    pool.forEach((t, i) => {
      const d = distanceM(cur[0], cur[1], t.lat, t.lon) + penalty[t.priority];
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    const next = pool.splice(bi, 1)[0];
    order.push(next);
    cur = [next.lat, next.lon];
  }
  return order;
}

/* =========================================================================
   Backend contract — preserved YOLOv8-seg inference API (FastAPI/Render).
   POST /api/v1/detect — multipart "file", query: confidence_threshold,
   clahe_enabled, generate_heatmap.
   ========================================================================= */

export interface ApiDetection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
  polygon: number[][];
  risk_level: string;
}

export interface ApiResponse {
  detections: ApiDetection[];
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
}

function riskToPriority(risk: string): Priority {
  if (risk === "high") return "P1";
  if (risk === "medium") return "P2";
  return "P3";
}

function classToLabel(cls: string): string {
  const map: Record<string, string> = {
    "Ghost Net": "Entangled Net",
    "Metal Drum": "Metal Drum",
    "Shipwreck": "Shipwreck",
    "Natural Formation": "Debris Field",
  };
  return map[cls] ?? cls;
}

export function surveyStartPoint(): { lat: number; lon: number } {
  const lats = TRAJECTORY.map(([lat]) => lat);
  const lons = TRAJECTORY.map(([, lon]) => lon);
  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lon: (Math.min(...lons) + Math.max(...lons)) / 2,
  };
}

export function apiDetectionToTarget(
  det: ApiDetection,
  index: number,
  metadata: ApiResponse["metadata"],
  imageUrl?: string,
  sourceFile?: string,
): SonarTarget {
  const [a, b, c, d] = det.bbox;
  const isCorners = c > a && d > b;
  const x1 = a;
  const y1 = b;
  const x2 = isCorners ? c : a + c;
  const y2 = isCorners ? d : b + d;
  const w = x2 - x1;
  const h = y2 - y1;
  const [imgH, imgW] = metadata.image_shape;
  const priority = riskToPriority(det.risk_level);
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
  const spread = index % 5;
  const lateral = swath === "left" ? -0.0012 : swath === "right" ? 0.0012 : 0;
  const along = (spread - 2) * 0.0008;
  const label = classToLabel(det.class_name);
  return {
    id: `SSS-${String(index + 1).padStart(3, "0")}`,
    class: label,
    priority,
    confidence: det.confidence,
    lat: frame.lat + lateral,
    lon: frame.lon + along,
    depthM: 30 + Math.round(Math.random() * 30),
    dims: {
      length: Math.round((w / imgW) * 20 * 10) / 10,
      width: Math.round((h / imgH) * 10 * 10) / 10,
      height: 1.0,
    },
    box,
    polygon: det.polygon
      ? det.polygon.map(([px, py]) => ({ x: Math.round(px * 10000) / 100, y: Math.round(py * 10000) / 100 }))
      : undefined,
    note: `Auto-detected by ${metadata.model} on ${metadata.device} (${metadata.latency_ms.toFixed(0)}ms). Confidence: ${(det.confidence * 100).toFixed(1)}%.`,
    imageUrl,
    sourceFile,
    fieldAction: `Recover — auto-flagged ${priority} by edge inference. Verify with ROV before recovery.`,
  };
}

/* =========================================================================
   Exports
   ========================================================================= */

export function toCsv(targets: SonarTarget[]): string {
  const head = [
    "target_id",
    "class",
    "confidence",
    "priority",
    "latitude",
    "longitude",
    "depth_m",
    "length_m",
    "width_m",
    "height_m",
  ];
  const rows = targets.map((t) =>
    [
      t.id,
      t.class,
      t.confidence.toFixed(2),
      t.priority,
      t.lat.toFixed(6),
      t.lon.toFixed(6),
      t.depthM.toFixed(1),
      t.dims.length.toFixed(2),
      t.dims.width.toFixed(2),
      t.dims.height.toFixed(2),
    ].join(","),
  );
  return [head.join(","), ...rows].join("\n");
}

export function toGeoJSON(targets: SonarTarget[]) {
  return {
    type: "FeatureCollection",
    name: "oceanscan_hazard_export",
    crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    features: targets.map((t) => ({
      type: "Feature",
      id: t.id,
      geometry: { type: "Point", coordinates: [Number(t.lon.toFixed(6)), Number(t.lat.toFixed(6))] },
      properties: {
        target_id: t.id,
        class: t.class,
        priority: t.priority,
        confidence: t.confidence,
        depth_m: t.depthM,
        action: t.fieldAction,
      },
    })),
  };
}

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printBrief(targets: SonarTarget[], survey: SampleSurvey) {
  const items = targets
    .map(
      (t, i) => `
    <section style="border-top:1px solid #141414;margin-top:16px;padding-top:12px">
      <h3 style="color:var(--signal);font-family:Archivo,monospace;font-size:20px;font-weight:700;margin:0 0 8px">${String(i + 1).padStart(2, "0")} · ${t.class}</h3>
      <table style="border-collapse:collapse;font-size:12px">
        <tr><th style="text-align:left;padding:3px 12px 3px 0">Confidence</th><td style="font-weight:600">${(t.confidence * 100).toFixed(0)}%</td></tr>
        <tr><th style="text-align:left;padding:3px 12px 3px 0">Coordinates</th><td style="font-weight:600">${t.lat.toFixed(4)}, ${t.lon.toFixed(4)}</td></tr>
        <tr><th style="text-align:left;padding:3px 12px 3px 0">Dims (L×W)</th><td style="font-weight:600">${t.dims.length.toFixed(1)} × ${t.dims.width.toFixed(1)} m</td></tr>
        <tr><th style="text-align:left;padding:3px 12px 3px 0">Priority</th><td style="font-weight:700;color:${t.priority === "P1" ? "#FF5A1F" : "#141414"}">${t.priority}</td></tr>
      </table>
      <p style="border-left:2px solid #FF5A1F;padding-left:12px;margin:10px 0 0;font-size:12px">${t.fieldAction}</p>
    </section>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>OceanScan Mission Brief</title>
<style>
 :root{--signal:#FF5A1F}
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:'IBM Plex Mono',monospace;color:#141414;background:#fff;padding:40px 44px}
 h1{font-family:Archivo,monospace;font-size:28px;font-weight:800;letter-spacing:-0.01em}
 .meta{margin-top:8px;font-size:11px;color:#6B6B67}
</style></head>
<body>
  <h1>Cleanup Mission Brief</h1>
  <p class="meta">SURVEY ${survey.id} · ${survey.file} · GENERATED ${survey.generated}</p>
  ${items}
</body></html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}
