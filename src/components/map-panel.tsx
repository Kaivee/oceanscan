"use client";

import { useMemo } from "react";
import { TRAJECTORY, type Priority, type SonarTarget } from "@/lib/targets";

const W = 940;
const H = 620;
const PAD = 56;

// Light chart palette that reads as open water + shoreline within the Mono-Signal system.
const WATER = "#E3EBEE";
const WATER_DEEP = "#D6E1E5";
const LAND = "#E8E2D3";
const LAND_LINE = "#9A8F78";

function priorityOpacity(p: Priority) {
  return p === "P1" ? 1 : p === "P2" ? 0.66 : 0.36;
}

function PinThumb({ id }: { id: string }) {
  return (
    <svg width="74" height="52" viewBox="0 0 74 52" aria-hidden="true">
      <defs>
        <pattern id={`hatch-${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#F4F4F1" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#C9C9C2" strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect width="74" height="52" fill={`url(#hatch-${id})`} />
      <rect x="8" y="10" width="22" height="10" fill="#141414" opacity="0.6" />
      <rect x="40" y="28" width="16" height="9" fill="#FF5A1F" opacity="0.55" />
    </svg>
  );
}

interface MapPanelProps {
  targets: SonarTarget[];
}

export default function MapPanel({ targets }: MapPanelProps) {
  // Projection is anchored to the actual target positions (so the three objects
  // stay separated on the chart instead of collapsing to one dot). The vessel
  // track is drawn as context only when it falls inside the chart — it must not
  // define the viewport bounds.
  const { proj, lats, lons } = useMemo(() => {
    const tlats = targets.map((t) => t.lat);
    const tlons = targets.map((t) => t.lon);
    const centerLat = targets.length ? (Math.min(...tlats) + Math.max(...tlats)) / 2 : TRAJECTORY[0][0];
    const centerLon = targets.length ? (Math.min(...tlons) + Math.max(...tlons)) / 2 : TRAJECTORY[0][1];
    const rawSpanLat = targets.length ? Math.max(...tlats) - Math.min(...tlats) : 0;
    const rawSpanLon = targets.length ? Math.max(...tlons) - Math.min(...tlons) : 0;
    // Keep a sane minimum viewport even for a single (or coincident) detection.
    const halfLat = Math.max(rawSpanLat * 0.6, 0.0012);
    const halfLon = Math.max(rawSpanLon * 0.6, 0.0012);
    const minLat = centerLat - halfLat;
    const maxLat = centerLat + halfLat;
    const minLon = centerLon - halfLon;
    const maxLon = centerLon + halfLon;
    const p = (lat: number, lon: number) => ({
      x: PAD + ((lon - minLon) / (maxLon - minLon)) * (W - 2 * PAD),
      y: PAD + ((maxLat - lat) / (maxLat - minLat)) * (H - 2 * PAD),
    });
    return { proj: p, lats: tlats, lons: tlons };
  }, [targets]);

  const minL = Math.min(...lats);
  const maxL = Math.max(...lats);
  const minO = Math.min(...lons);
  const maxO = Math.max(...lons);

  const pathD = useMemo(
    () =>
      TRAJECTORY.map(([la, lo], i) => {
        const pt = proj(la, lo);
        return `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      }).join(" "),
    [proj],
  );

  const points = useMemo(() => targets.map((t) => ({ t, p: proj(t.lat, t.lon) })), [targets, proj]);

  // Shoreline: land mass hugging the western/north edge, water to the south-east.
  const shoreline = useMemo(() => {
    const c = proj(maxL + 0.001, minO);
    return [
      [0, 0],
      [c.x * 0.9, 0],
      [c.x * 0.62, c.y * 0.34],
      [c.x * 0.85, c.y * 0.5],
      [c.x * 0.58, c.y * 0.72],
      [c.x * 0.78, c.y * 0.9],
      [c.x * 0.5, H],
      [0, H],
    ];
  }, [proj, maxL, minO]);

  // Bathymetry depth contours (seabed relief below the water line).
  const bathy = useMemo(() => {
    const seedPts = [
      [W * 0.42, H * 0.3],
      [W * 0.62, H * 0.4],
      [W * 0.78, H * 0.62],
      [W * 0.6, H * 0.78],
    ];
    return [0, 1, 2, 3].map((k) => {
      const [bx, by] = seedPts[k % seedPts.length];
      const r = 90 + k * 40;
      let d = "";
      for (let a = 0; a <= 360; a += 15) {
        const rad = (a * Math.PI) / 180;
        const wob = 1 + Math.sin(rad * 3 + k) * 0.12;
        const x = bx + Math.cos(rad) * r * wob;
        const y = by + Math.sin(rad) * r * (0.7 + Math.sin(rad) * 0.2);
        d += `${a === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      }
      return `${d}Z`;
    });
  }, []);

  const graticuleLats = useMemo(() => {
    const lo = minO;
    return Array.from({ length: 6 }, (_, i) => {
      const la = minL + ((maxL - minL) * i) / 5;
      return { la, p: proj(la, lo) };
    });
  }, [minL, maxL, minO, proj]);
  const graticuleLons = useMemo(() => {
    const la = minL;
    return Array.from({ length: 6 }, (_, i) => {
      const lo = minO + ((maxO - minO) * i) / 5;
      return { lo, p: proj(la, lo) };
    });
  }, [minL, minO, maxO, proj]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--ink)" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--ink)" }}>
          <div>
            <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "15px", color: "var(--ink)" }}>
              Survey Map
            </h3>
            <p style={{ fontFamily: "var(--f-mono)", fontSize: "10px", color: "var(--ink-soft)" }}>
              Bristol Channel · datum WGS-84
            </p>
          </div>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: "10px", color: "var(--ink-soft)" }}>
            {targets.length} geotagged target{targets.length !== 1 ? "s" : ""}
          </span>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Survey map">
          <defs>
            <pattern id="graticule" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M60 0H0V60" fill="none" stroke="#5A6A70" strokeWidth="0.4" opacity="0.14" />
            </pattern>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#141414" />
            </marker>
          </defs>

          {/* Water bed */}
          <rect width={W} height={H} fill={WATER} />
          <rect width={W} height={H} fill="url(#graticule)" />
          <path d={`M0 ${H * 0.55} L${W} ${H * 0.5} L${W} ${H * 0.6} L0 ${H * 0.66} Z`} fill={WATER_DEEP} opacity="0.4" />

          {/* Seabed depth contours */}
          {bathy.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#7A8C93" strokeWidth="1" opacity="0.35" />
          ))}

          {/* Land mass */}
          <polygon points={shoreline.map(([x, y]) => `${x},${y}`).join(" ")} fill={LAND} stroke={LAND_LINE} strokeWidth="1.2" />

          {/* Graticule labels */}
          {graticuleLats.map(({ la, p }) => (
            <text key={`la-${la}`} x={8} y={p.y + 3} fontSize="9" fill="#5A6A70" style={{ fontFamily: "var(--f-mono)" }}>
              {la.toFixed(4)}°N
            </text>
          ))}
          {graticuleLons.map(({ lo, p }) => (
            <text key={`lo-${lo}`} x={p.x - 4} y={H - 8} fontSize="9" fill="#5A6A70" style={{ fontFamily: "var(--f-mono)" }}>
              {Math.abs(lo).toFixed(4)}°W
            </text>
          ))}

          {/* Survey vessel trackline + animated marker */}
          <path id="surveypath" d={pathD} fill="none" stroke="#141414" strokeWidth="1.6" markerEnd="url(#arrow)" />
          <g>
            <polygon points="0,-9 7,6 0,1 -7,6" fill="#FF5A1F">
              <animateMotion dur="14s" repeatCount="indefinite" rotate="auto">
                <mpath href="#surveypath" />
              </animateMotion>
            </polygon>
          </g>

          {/* Waypoint circles + IDs */}
          {points.map(({ t, p }) => (
            <g key={t.id} opacity={priorityOpacity(t.priority)}>
              <circle cx={p.x} cy={p.y} r={t.priority === "P1" ? 8 : 6} fill="var(--signal)" stroke="#141414" strokeWidth="1.4" />
              <text x={p.x + 11} y={p.y + 3} fontSize="10" fontWeight="700" fill="#141414" style={{ fontFamily: "var(--f-mono)" }}>
                {t.id}
              </text>
            </g>
          ))}

          {/* Scale + compass */}
          <g>
            <line x1={W - 170} y1={H - 34} x2={W - 60} y2={H - 34} stroke="#141414" strokeWidth="1.4" />
            <text x={W - 115} y={H - 21} textAnchor="middle" fontSize="8" fill="#5A6A70" style={{ fontFamily: "var(--f-mono)" }}>
              250 M
            </text>
            <g transform={`translate(${W - 34} 60)`}>
              <path d="M0 18 L0 -18 M-7 -9 L0 -20 L7 -9" fill="none" stroke="#141414" strokeWidth="1.2" />
              <text x="0" y="-24" textAnchor="middle" fontSize="9" fill="#141414" style={{ fontFamily: "var(--f-mono)", fontWeight: 700 }}>
                N
              </text>
            </g>
          </g>
        </svg>

        {/* Pin cards anchored to waypoints */}
        <div className="pointer-events-none absolute inset-0">
          {points.map(({ t, p }) => (
            <div
              key={t.id}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-[120%]"
              style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
            >
              <div style={{ background: "var(--surface)", border: "1px solid var(--line-strong)", boxShadow: "0 6px 18px rgba(20,20,20,0.14)" }}>
                <div className="flex gap-2 p-2 items-center">
                  <PinThumb id={t.id} />
                  <div>
                    <p style={{ fontFamily: "var(--f-mono)", fontSize: "11px", fontWeight: 700, color: "var(--ink)" }}>{t.id}</p>
                    <p style={{ fontFamily: "var(--f-mono)", fontSize: "10px", color: "var(--ink-soft)" }}>{t.class}</p>
                    <p style={{ fontFamily: "var(--f-mono)", fontSize: "10px", color: "var(--ink)" }}>
                      {Math.round(t.confidence * 100)}% · <b style={{ color: "var(--signal)" }}>{t.priority}</b>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
