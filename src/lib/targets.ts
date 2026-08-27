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
    lat: 15.4182,
    lon: 73.7965,
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
    lat: 15.3731,
    lon: 73.8412,
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
    lat: 15.4423,
    lon: 73.7538,
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
    lat: 15.3564,
    lon: 73.8091,
    depthM: 52,
    dims: { length: 12.19, width: 2.44, height: 2.59 },
    severity: "medium",
    box: { x: 63, y: 62, w: 22, h: 16 },
    note: "Rectangular prism signature near shipping lane. Registered loss event INDSAR #2026-0417.",
  },
];

export const TRAJECTORY: Array<[number, number]> = [
  [15.468, 73.724],
  [15.452, 73.751],
  [15.4423, 73.7538],
  [15.428, 73.782],
  [15.4182, 73.7965],
  [15.401, 73.821],
  [15.388, 73.83],
  [15.3731, 73.8412],
  [15.362, 73.805],
  [15.3564, 73.8091],
  [15.339, 73.776],
];

export const SEVERITY_META: Record<
  Severity,
  { label: string; desc: string; chip: string; stroke: string; fill: string; tint: string; dot: string }
> = {
  high: {
    label: "HIGH",
    desc: "High risk — recover soon (entanglement / navigation hazard)",
    chip: "rounded border border-[var(--color-ocean-red)] bg-[var(--color-ocean-red)]/10 text-[var(--color-ocean-red)]",
    stroke: "#EF4444",
    fill: "rgba(239, 68, 68, 0.18)",
    tint: "bg-[var(--color-ocean-red)]/10 text-[var(--color-ocean-red)]",
    dot: "bg-[var(--color-ocean-red)]",
  },
  medium: {
    label: "MEDIUM",
    desc: "Medium risk — schedule retrieval on an upcoming pass",
    chip: "rounded border border-[var(--color-ocean-amber)] bg-[var(--color-ocean-amber)]/10 text-[var(--color-ocean-amber)]",
    stroke: "#F59E0B",
    fill: "rgba(245, 158, 11, 0.18)",
    tint: "bg-[var(--color-ocean-amber)]/10 text-[var(--color-ocean-amber)]",
    dot: "bg-[var(--color-ocean-amber)]",
  },
  low: {
    label: "LOW",
    desc: "Low risk — log and continue monitoring",
    chip: "rounded border border-[var(--color-ocean-blue)] bg-[var(--color-ocean-blue)]/10 text-[var(--color-ocean-blue)]",
    stroke: "#3B82F6",
    fill: "rgba(59, 130, 246, 0.18)",
    tint: "bg-[var(--color-ocean-blue)]/10 text-[var(--color-ocean-blue)]",
    dot: "bg-[var(--color-ocean-blue)]",
  },
};

export const CLASS_COLORS: Record<string, { stroke: string; fill: string }> = {
  "Ghost Net":         { stroke: "#a855f7", fill: "rgba(168,85,247,0.18)" },
  "Metal Drum":        { stroke: "#f97316", fill: "rgba(249,115,22,0.18)" },
  "Shipwreck":         { stroke: "#ef4444", fill: "rgba(239,68,68,0.18)" },
  "Natural Formation": { stroke: "#22d3ee", fill: "rgba(34,211,238,0.18)" },
};

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
      from: "MSV SAGAR-DHWANI",
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
  };
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
  return {
    id: `API-${String(index + 1).padStart(3, "0")}`,
    label: det.class_name,
    cls: classMap[det.class_name] ?? det.class_name.toUpperCase().replace(/\s+/g, "_"),
    confidence: det.confidence,
    lat: 15.4000 + Math.random() * 0.05,
    lon: 73.8000 + Math.random() * 0.05,
    depthM: 30 + Math.round(Math.random() * 30),
    dims: {
      length: Math.round((w / imgW) * 20 * 10) / 10,
      width: Math.round((h / imgH) * 10 * 10) / 10,
      height: 1.0,
    },
    severity,
    box: { x: Math.round((x1 / imgW) * 100), y: Math.round((y1 / imgH) * 100), w: Math.round((w / imgW) * 100), h: Math.round((h / imgH) * 100) },
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
