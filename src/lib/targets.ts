export type Severity = "high" | "medium" | "low";

export type ViewMode = "raw" | "boxes" | "compare";

export type DetectionStatus = "confirmed" | "false_positive" | "pending";

export interface TargetDims {
  length: number;
  width: number;
  height: number;
}

export interface SonarTarget {
  id: string;
  label: string;
  cls: string;
  confidence: number;
  lat: number;
  lon: number;
  depthM: number;
  dims: TargetDims;
  severity: Severity;
  box: { x: number; y: number; w: number; h: number };
  polygon?: { x: number; y: number }[];
  note: string;
  imageUrl?: string;
  sourceFile?: string;
}

export const TARGETS: SonarTarget[] = [
  {
    id: "TGT-001",
    label: "Ghost Net",
    cls: "NET_GHOST",
    confidence: 0.94,
    lat: 41.3081,
    lon: -70.5562,
    depthM: 34,
    dims: { length: 12.6, width: 8.4, height: 1.2 },
    severity: "high",
    box: { x: 58, y: 22, w: 26, h: 20 },
    note: "Tangled trawl net drifting across sand ripple field. High entanglement risk for marine fauna.",
  },
  {
    id: "TGT-002",
    label: "Metal Cylinder",
    cls: "DRUM_STEEL",
    confidence: 0.91,
    lat: 41.3226,
    lon: -70.5721,
    depthM: 41,
    dims: { length: 0.9, width: 0.9, height: 1.2 },
    severity: "high",
    box: { x: 18, y: 55, w: 11, h: 13 },
    note: "Strong specular return consistent with steel drum. Possible chemical container — handle via ROV.",
  },
  {
    id: "TGT-003",
    label: "Sunken Pipe",
    cls: "PIPE_SECTION",
    confidence: 0.88,
    lat: 41.334,
    lon: -70.5586,
    depthM: 29,
    dims: { length: 18.0, width: 1.4, height: 1.4 },
    severity: "medium",
    box: { x: 8, y: 14, w: 34, h: 10 },
    note: "Linear hard target with shadow trough. Likely displaced pipeline segment from coastal works.",
  },
  {
    id: "TGT-004",
    label: "Shipping Container",
    cls: "CONTAINER_LOST",
    confidence: 0.76,
    lat: 41.3419,
    lon: -70.5246,
    depthM: 52,
    dims: { length: 12.19, width: 2.44, height: 2.59 },
    severity: "medium",
    box: { x: 63, y: 62, w: 22, h: 16 },
    note: "Rectangular prism signature near shipping lane. Registered loss event #2026-0417.",
  },
];

// Real navigation track from USGS cruise 07011 (OFR 2008-1288), 1-minute GPS fixes
// along the sidescan-sonar lawnmower survey off the south shore of Martha's Vineyard.
export const TRAJECTORY: Array<[number, number]> = [
  [41.303848, -70.51593],
  [41.303638, -70.526512],
  [41.303627, -70.537758],
  [41.303684, -70.549202],
  [41.303665, -70.558983],
  [41.303692, -70.569603],
  [41.303692, -70.581322],
  [41.303635, -70.594536],
  [41.308701, -70.594696],
  [41.308712, -70.583489],
  [41.308765, -70.572342],
  [41.308689, -70.561012],
  [41.308651, -70.54808],
  [41.308754, -70.536667],
  [41.308685, -70.525154],
  [41.308662, -70.513786],
  [41.313835, -70.595734],
  [41.31385, -70.58419],
  [41.313809, -70.572769],
  [41.313828, -70.561645],
  [41.313881, -70.550346],
  [41.313854, -70.53862],
  [41.31382, -70.526825],
  [41.313824, -70.516571],
  [41.318646, -70.594353],
  [41.318634, -70.583008],
  [41.318611, -70.570732],
  [41.318649, -70.558624],
  [41.318619, -70.548157],
  [41.318638, -70.536247],
  [41.318611, -70.524353],
  [41.318562, -70.514999],
  [41.322666, -70.595962],
  [41.322731, -70.586716],
  [41.322761, -70.575348],
  [41.322742, -70.563408],
  [41.322758, -70.551521],
  [41.322803, -70.539658],
  [41.322765, -70.527824],
  [41.322723, -70.516769],
  [41.326748, -70.595337],
  [41.326683, -70.583992],
  [41.326752, -70.571922],
  [41.326717, -70.559799],
  [41.32666, -70.549141],
  [41.326702, -70.537071],
  [41.326771, -70.52533],
  [41.326763, -70.516014],
  [41.331127, -70.5952],
  [41.330902, -70.585281],
  [41.330856, -70.57383],
  [41.330837, -70.562073],
  [41.33086, -70.550468],
  [41.330856, -70.539062],
  [41.330891, -70.527618],
  [41.330856, -70.517014],
  [41.334835, -70.595505],
  [41.334778, -70.584762],
  [41.334846, -70.573776],
  [41.334846, -70.562309],
  [41.334835, -70.550629],
  [41.334869, -70.53862],
  [41.334801, -70.526718],
  [41.334862, -70.516396],
  [41.338451, -70.595383],
  [41.338413, -70.585365],
  [41.338444, -70.574692],
  [41.338436, -70.563889],
  [41.338409, -70.551376],
  [41.338448, -70.540215],
  [41.338428, -70.528954],
  [41.338455, -70.51651],
  [41.341545, -70.594444],
  [41.341595, -70.578323],
  [41.34158, -70.567657],
  [41.341595, -70.556969],
  [41.341587, -70.546249],
  [41.341583, -70.535515],
  [41.341595, -70.524834],
  [41.341518, -70.516083],
  [41.344986, -70.523048],
  [41.345192, -70.531624],
  [41.345203, -70.541573],
  [41.34515, -70.553261],
  [41.345196, -70.563103],
  [41.345219, -70.574661],
  [41.345173, -70.584732],
  [41.345146, -70.594887],
  [41.346619, -70.594818],
  [41.346626, -70.590614],
  [41.346603, -70.585808],
  [41.346641, -70.580933],
  [41.346634, -70.576042],
  [41.346573, -70.57103],
  [41.346535, -70.565895],
  [41.346386, -70.562958],
];

export const SEVERITY_META: Record<
  Severity,
  { label: string; desc: string; chip: string; stroke: string; fill: string; tint: string; dot: string }
> = {
  high: {
    label: "HIGH",
    desc: "High risk — recover soon (entanglement / navigation hazard)",
    chip: "rounded border border-[var(--color-ocean-red)] bg-[var(--color-ocean-red)]/10 text-[var(--color-ocean-red)]",
    stroke: "#E63946",
    fill: "rgba(230, 57, 70, 0.18)",
    tint: "bg-[var(--color-ocean-red)]/10 text-[var(--color-ocean-red)]",
    dot: "bg-[var(--color-ocean-red)]",
  },
  medium: {
    label: "MEDIUM",
    desc: "Medium risk — schedule retrieval on an upcoming pass",
    chip: "rounded border border-[var(--color-ocean-amber)] bg-[var(--color-ocean-amber)]/10 text-[var(--color-ocean-amber)]",
    stroke: "#C97A12",
    fill: "rgba(201, 122, 18, 0.16)",
    tint: "bg-[var(--color-ocean-amber)]/10 text-[var(--color-ocean-amber)]",
    dot: "bg-[var(--color-ocean-amber)]",
  },
  low: {
    label: "LOW",
    desc: "Low risk — log and continue monitoring",
    chip: "rounded border border-[var(--color-ocean-blue)] bg-[var(--color-ocean-blue)]/10 text-[var(--color-ocean-blue)]",
    stroke: "#0E6BA8",
    fill: "rgba(14, 107, 168, 0.14)",
    tint: "bg-[var(--color-ocean-blue)]/10 text-[var(--color-ocean-blue)]",
    dot: "bg-[var(--color-ocean-blue)]",
  },
};

export const CLASS_COLORS: Record<string, { stroke: string; fill: string }> = {
  "Ghost Net":         { stroke: "#0E6BA8", fill: "rgba(14,107,168,0.16)" },
  "Metal Drum":        { stroke: "#C97A12", fill: "rgba(201,122,18,0.16)" },
  "Shipwreck":         { stroke: "#E63946", fill: "rgba(230,57,70,0.16)" },
  "Natural Formation": { stroke: "#5FD4C4", fill: "rgba(95,212,196,0.16)" },
};

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

// Hemisphere-aware coordinate formatting (west longitudes are negative).
export function fmtLat(lat: number, dp = 4): string {
  return `${Math.abs(lat).toFixed(dp)}°${lat >= 0 ? "N" : "S"}`;
}

export function fmtLon(lon: number, dp = 4): string {
  return `${Math.abs(lon).toFixed(dp)}°${lon >= 0 ? "E" : "W"}`;
}

// Cross-track acoustic position of a contact inside the swath footprint.
export function swathPosition(t: Pick<SonarTarget, "box">): "left" | "center" | "right" {
  const cx = t.box.x + t.box.w / 2;
  if (cx < 38) return "left";
  if (cx > 62) return "right";
  return "center";
}

// Net surveyed seabed area, extended per processed frame.
export function estimateSurveyAreaSqm(uploadedImageCount: number): number {
  return 50 * (620 + Math.max(0, uploadedImageCount - 1) * 250);
}

export function toGeoJSON(targets: SonarTarget[]) {
  return {
    type: "FeatureCollection",
    name: "oceanscan_hazard_export",
    crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    metadata: {
      generator: "OceanScan AI v3.0.0 (TensorRT INT8 Edge)",
      generated_at: new Date().toISOString(),
      datum: "WGS-84",
      count: targets.length,
    },
    features: targets.map((t) => ({
      type: "Feature",
      id: t.id,
      geometry: { type: "Point", coordinates: [Number(t.lon.toFixed(6)), Number(t.lat.toFixed(6))] },
      properties: {
        target_id: t.id,
        class: t.cls,
        class_label: t.label,
        confidence: t.confidence,
        severity: t.severity,
        depth_m: t.depthM,
        estimated_dimensions_m: {
          length: t.dims.length,
          width: t.dims.width,
          height: t.dims.height,
        },
        notes: t.note,
      },
    })),
  };
}

export function toCsv(targets: SonarTarget[]): string {
  const head = [
    "target_id",
    "class",
    "confidence",
    "latitude",
    "longitude",
    "depth_m",
    "length_m",
    "width_m",
    "height_m",
    "severity",
  ];
  const rows = targets.map((t) =>
    [
      t.id,
      t.cls,
      t.confidence.toFixed(2),
      t.lat.toFixed(6),
      t.lon.toFixed(6),
      t.depthM.toFixed(1),
      t.dims.length.toFixed(2),
      t.dims.width.toFixed(2),
      t.dims.height.toFixed(2),
      t.severity.toUpperCase(),
    ].join(","),
  );
  return [head.join(","), ...rows].join("\n");
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

export function retrievalRoute(start: [number, number], targets: SonarTarget[]) {
  const order: SonarTarget[] = [];
  const pool = [...targets];
  let cur = start;
  while (pool.length > 0) {
    let bi = 0;
    let bd = Infinity;
    pool.forEach((t, i) => {
      const sevPenalty = t.severity === "high" ? 0 : t.severity === "medium" ? 250 : 600;
      const d = distanceM(cur[0], cur[1], t.lat, t.lon) + sevPenalty;
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    const next = pool.splice(bi, 1)[0];
    order.push(next);
    cur = [next.lat, next.lon];
  }
  const legs: Array<{
    from: string;
    to: string;
    distM: number;
    bearing: number;
  }> = [];
  let prev = start;
  for (const t of order) {
    legs.push({
      from: "R/V Megan Miller",
      to: t.id,
      distM: distanceM(prev[0], prev[1], t.lat, t.lon),
      bearing: bearingDeg(prev[0], prev[1], t.lat, t.lon),
    });
    prev = [t.lat, t.lon];
  }
  const totalM = legs.reduce((s, l) => s + l.distM, 0);
  return { order, legs, totalM, estMinutes: totalM / (2 * 0.514) / 60 };
}

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

export function surveyStartPoint(): { lat: number; lon: number } {
  const lats = TRAJECTORY.map(([lat]) => lat);
  const lons = TRAJECTORY.map(([, lon]) => lon);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lon = (Math.min(...lons) + Math.max(...lons)) / 2;
  return { lat, lon };
}

export function apiDetectionToTarget(
  det: ApiDetection,
  index: number,
  metadata: ApiResponse["metadata"],
  imageUrl?: string,
  sourceFile?: string,
): SonarTarget {
  const [x1, y1, x2, y2] = det.bbox;
  const w = x2 - x1;
  const h = y2 - y1;
  const [imgH, imgW] = metadata.image_shape;
  const severity: Severity =
    det.risk_level === "high" ? "high" : det.risk_level === "medium" ? "medium" : "low";
  const classMap: Record<string, string> = {
    "Ghost Net": "NET_GHOST",
    "Metal Drum": "DRUM_STEEL",
    "Shipwreck": "SHIPWRECK",
    "Natural Formation": "ROCK_SEABED",
  };
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
  return {
    id: `API-${String(index + 1).padStart(3, "0")}`,
    label: det.class_name,
    cls: classMap[det.class_name] ?? det.class_name.toUpperCase().replace(/\s+/g, "_"),
    confidence: det.confidence,
    lat: frame.lat + lateral,
    lon: frame.lon + along,
    depthM: 30 + Math.round(Math.random() * 30),
    dims: {
      length: Math.round((w / imgW) * 20 * 10) / 10,
      width: Math.round((h / imgH) * 10 * 10) / 10,
      height: 1.0,
    },
    severity,
    box,
    polygon: det.polygon
      ? det.polygon.map(([px, py]) => ({ x: Math.round(px * 10000) / 100, y: Math.round(py * 10000) / 100 }))
      : undefined,
    note: `Auto-detected by ${metadata.model} on ${metadata.device} (${metadata.latency_ms.toFixed(0)}ms). Confidence: ${(det.confidence * 100).toFixed(1)}%.`,
    imageUrl,
    sourceFile,
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

const SEV_LABEL: Record<Severity, string> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

export function printSurveySheet(
  targets: SonarTarget[],
  opts: { vessel: string; surveyId: string; sensor: string },
) {
  const rows = targets
    .map(
      (t) => `
      <tr>
        <td>${t.id}</td>
        <td>${t.label} (${t.cls})</td>
        <td>${(t.confidence * 100).toFixed(1)}%</td>
        <td>${t.lat.toFixed(6)}°N</td>
        <td>${Math.abs(t.lon).toFixed(6)}°W</td>
        <td>${t.depthM} m</td>
        <td class="sev sev-${t.severity}">${SEV_LABEL[t.severity]}</td>
        <td>${t.dims.length.toFixed(2)} × ${t.dims.width.toFixed(2)} × ${t.dims.height.toFixed(2)} m</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>OceanScan Survey Sheet</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', monospace; color: #10202E; padding: 32px; font-size: 12px; }
  header { border-bottom: 2px solid #10202E; padding-bottom: 12px; margin-bottom: 20px; }
  h1 { font-size: 20px; letter-spacing: 0.05em; }
  .meta { display: flex; gap: 32px; margin-top: 8px; color: #45566A; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #D3DEE3; padding: 7px 9px; text-align: left; font-size: 11px; }
  th { background: #E6EDF1; text-transform: uppercase; letter-spacing: 0.08em; font-size: 9px; }
  .sev { font-weight: 700; }
  .sev-high { color: #E63946; }
  .sev-medium { color: #C97A12; }
  .sev-low { color: #0E6BA8; }
  .foot { margin-top: 24px; color: #45566A; font-size: 10px; }
</style>
</head>
<body>
  <header>
    <h1>OceanScan AI — HAZARD FINDINGS SURVEY SHEET</h1>
    <div class="meta">
      <span>Vessel: <strong>${opts.vessel}</strong></span>
      <span>Survey: <strong>${opts.surveyId}</strong></span>
      <span>Sensor: <strong>${opts.sensor}</strong></span>
      <span>Datum: <strong>WGS-84</strong></span>
      <span>Generated: <strong>${new Date().toISOString()}</strong></span>
    </div>
  </header>
  <table>
    <thead>
      <tr>
        <th>ID</th><th>Class</th><th>Conf</th><th>Latitude</th>
        <th>Longitude</th><th>Depth</th><th>Severity</th><th>Est. Dims (m)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="foot">
    AI model v3.0.0 · TensorRT INT8 edge inference. High-severity contacts must be verified by ROV before recovery operations.
  </p>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 350);
}
