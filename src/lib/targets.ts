export type Severity = "high" | "medium" | "low";

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
  note: string;
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
    label: "High",
    desc: "High risk — recover soon (entanglement / navigation hazard)",
    chip: "rounded-sm border border-[#b03a2e] bg-[#b03a2e]/[0.07] text-[#b03a2e] -rotate-1",
    stroke: "#dc2626",
    fill: "rgba(220,38,38,0.16)",
    tint: "bg-[#b03a2e]/10 text-[#b03a2e]",
    dot: "bg-[#b03a2e]",
  },
  medium: {
    label: "Med",
    desc: "Medium risk — schedule retrieval on an upcoming pass",
    chip: "rounded-sm border border-[#8a6d1f] bg-[#8a6d1f]/[0.08] text-[#8a6d1f] -rotate-1",
    stroke: "#d97706",
    fill: "rgba(217,119,6,0.16)",
    tint: "bg-[#8a6d1f]/10 text-[#8a6d1f]",
    dot: "bg-[#8a6d1f]",
  },
  low: {
    label: "Low",
    desc: "Low risk — log and continue monitoring",
    chip: "rounded-sm border border-[#3e6b4f] bg-[#3e6b4f]/[0.08] text-[#3e6b4f] -rotate-1",
    stroke: "#059669",
    fill: "rgba(5,150,105,0.16)",
    tint: "bg-[#3e6b4f]/10 text-[#3e6b4f]",
    dot: "bg-[#3e6b4f]",
  },
};

export function toGeoJSON(targets: SonarTarget[]) {
  return {
    type: "FeatureCollection",
    name: "oceanscan_hazard_export",
    crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    metadata: {
      generator: "OceanScan AI v2.4.1 (INT8 Edge)",
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

export function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
