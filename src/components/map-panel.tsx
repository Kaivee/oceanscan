"use client";

import { useEffect, useMemo, useState } from "react";
import { Navigation } from "lucide-react";
import { SonarPingRipple, TechnicalGrid } from "@/components/marine-ui";
import {
  SEVERITY_META,
  TRAJECTORY,
  type SonarTarget,
} from "@/lib/targets";

const W = 800;
const H = 600;
const PAD = 48;
const LAT_MIN = 41.3;
const LAT_MAX = 41.35;
const LON_MIN = -70.605;
const LON_MAX = -70.51;

function proj(lat: number, lon: number) {
  return {
    x: PAD + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (W - 2 * PAD),
    y: H - PAD - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * (H - 2 * PAD),
  };
}

interface MapPanelProps {
  targets: SonarTarget[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function MapPanel({ targets, selectedId, onSelect }: MapPanelProps) {
  const [clock, setClock] = useState("--:--:-- UTC");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" }) + " UTC",
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const trajectoryPts = useMemo(
    () => TRAJECTORY.map(([lat, lon]) => proj(lat, lon)),
    [],
  );
  const pathD = useMemo(
    () =>
      trajectoryPts
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" "),
    [trajectoryPts],
  );

  const lats = [41.31, 41.32, 41.33, 41.34];
  const lons = [-70.59, -70.57, -70.55, -70.53];

  return (
    <section className="overflow-hidden rounded-none border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
      <div className="flex items-center gap-3 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
        <div className="mr-auto min-w-0">
          <h2 className="font-mono text-xs font-bold text-[var(--color-ocean-text)]">MISSION CHART — MARTHA&apos;S VINEYARD</h2>
          <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-ocean-muted)]">
            Every mark is a logged contact · click to inspect
          </p>
        </div>
        <span className="hidden font-mono text-[10px] tracking-widest text-[var(--color-ocean-muted)] md:inline">
          SURVEY L04 · USGS 07011
        </span>
        <span className="border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-2 py-0.5 font-mono text-[10px] tabular-nums text-[var(--color-ocean-sky)]">
          {clock}
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Mission chart">
          <defs>
            <marker id="arrowInk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="rgba(255,255,255,0.4)" />
            </marker>
          </defs>

          <rect width={W} height={H} fill="#080E18" />

          {lats.map((lat) => {
            const p = proj(lat, LON_MIN);
            return (
              <g key={lat}>
                <line x1={PAD} y1={p.y} x2={W - PAD} y2={p.y} stroke="rgba(139,233,253,0.08)" strokeWidth="1" />
                <text x={6} y={p.y + 3} fontSize="8" fill="rgba(139,233,253,0.4)" fontFamily="monospace">
                  {lat.toFixed(2)}°N
                </text>
              </g>
            );
          })}
          {lons.map((lon) => {
            const p = proj(LAT_MIN, lon);
            return (
              <g key={lon}>
                <line x1={p.x} y1={PAD} x2={p.x} y2={H - PAD} stroke="rgba(139,233,253,0.08)" strokeWidth="1" />
                <text x={p.x - 16} y={H - PAD + 12} fontSize="8" fill="rgba(139,233,253,0.4)" fontFamily="monospace">
                  {Math.abs(lon).toFixed(2)}°W
                </text>
              </g>
            );
          })}

          <path
            d={`M${W},${H * 0.28} C ${W * 0.93},${H * 0.22} ${W * 0.88},${H * 0.12} ${W * 0.9},0 L ${W},0 Z`}
            fill="#0D1520"
            stroke="rgba(139,233,253,0.2)"
            strokeWidth="1"
          />
          <text x={W - 60} y={24} fontSize="8" fill="rgba(139,233,253,0.5)" fontFamily="monospace">
            MARTHA&apos;S VINEYARD
          </text>

          <path d="M60,180 C 220,240 420,300 620,330 C 690,342 730,360 750,392" fill="none" stroke="rgba(139,233,253,0.15)" strokeWidth="1" strokeDasharray="6 6" />
          <path d="M50,340 C 240,380 480,430 700,470 C 730,476 745,484 752,496" fill="none" stroke="rgba(139,233,253,0.15)" strokeWidth="1" strokeDasharray="6 6" />
          <text x="66" y="172" fontSize="8" fill="rgba(139,233,253,0.35)" fontFamily="monospace">−40 m</text>
          <text x="56" y="332" fontSize="8" fill="rgba(139,233,253,0.35)" fontFamily="monospace">−80 m</text>

          <path d={pathD} fill="none" stroke="rgba(139,233,253,0.5)" strokeWidth="1.5" strokeDasharray="8 5" markerEnd="url(#arrowInk)" />
          {(() => {
            const s = trajectoryPts[0];
            return (
              <>
                <circle cx={s.x} cy={s.y} r="4" fill="#080E18" stroke="rgba(139,233,253,0.6)" strokeWidth="1.5" />
                <text x={s.x - 50} y={s.y - 10} fontSize="9" fill="rgba(139,233,253,0.6)" fontFamily="monospace">
                  Launch · R/V Megan Miller
                </text>
              </>
            );
          })()}

          {targets.map((t) => {
            const p = proj(t.lat, t.lon);
            const meta = SEVERITY_META[t.severity];
            const isSel = t.id === selectedId;
            const flipLabel = p.x > W - 170;
            return (
              <g key={t.id} transform={`translate(${p.x},${p.y})`} onClick={() => onSelect(t.id)} className="cursor-pointer">
                {isSel && <circle r="14" fill="none" stroke={meta.stroke} strokeWidth="1.5" className="pin-pulse" />}
                <line x1="0" y1="4" x2="0" y2="16" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                <circle r={isSel ? 6 : 5} fill={meta.stroke} stroke="#080E18" strokeWidth="1.5" />
                <path d="M-2,0 H2 M0,-2 V2" stroke="#ffffff" strokeWidth="1" />
                <text
                  x={flipLabel ? -10 : 10}
                  y="4"
                  fontSize="9"
                  textAnchor={flipLabel ? "end" : "start"}
                  fill={isSel ? meta.stroke : "rgba(255,255,255,0.7)"}
                  fontFamily="monospace"
                  fontWeight={isSel ? "bold" : "normal"}
                  stroke="#080E18"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {t.id} · {Math.round(t.confidence * 100)}%
                </text>
              </g>
            );
          })}

          <g transform={`translate(${W - 52},${H - 56})`}>
            <circle r="18" fill="rgba(8,14,24,0.8)" stroke="rgba(139,233,253,0.3)" strokeWidth="1" />
            <path d="M0,-12 L4,4 L0,1 L-4,4 Z" fill="rgba(139,233,253,0.6)" />
            <text y="-24" fontSize="9" textAnchor="middle" fill="rgba(139,233,253,0.6)" fontFamily="monospace" fontWeight="bold">N</text>
          </g>
          <g transform={`translate(${PAD},${H - 22})`}>
            <line x1="0" y1="0" x2="48" y2="0" stroke="rgba(139,233,253,0.4)" strokeWidth="1.2" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="rgba(139,233,253,0.4)" strokeWidth="1.2" />
            <line x1="48" y1="-3" x2="48" y2="3" stroke="rgba(139,233,253,0.4)" strokeWidth="1.2" />
            <text x="56" y="3" fontSize="8" fill="rgba(139,233,253,0.4)" fontFamily="monospace">≈ 500 m</text>
          </g>
        </svg>

        <TechnicalGrid />

        {(() => {
          const auv = trajectoryPts[4];
          if (!auv) return null;
          return (
            <div
              className="pointer-events-none absolute z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(auv.x / W) * 100}%`, top: `${(auv.y / H) * 100}%` }}
            >
              <SonarPingRipple className="h-full w-full" />
            </div>
          );
        })()}

        <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-none border border-[var(--color-ocean-border)] bg-[var(--color-ocean-slate)]/90 px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-[var(--color-ocean-muted)] backdrop-blur">
          <Navigation size={9} className="text-[var(--color-ocean-sky)]" /> Boat track · lawnmower sweep · 2 kn
        </div>
      </div>

      <figcaption className="flex items-center justify-between border-t border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-1.5">
        <span className="font-mono text-[10px] text-[var(--color-ocean-muted)]">Survey area with plotted contacts, line L04</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ocean-muted)]">Datum WGS-84</span>
      </figcaption>
    </section>
  );
}
