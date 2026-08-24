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
const LAT_MIN = 15.32;
const LAT_MAX = 15.48;
const LON_MIN = 73.7;
const LON_MAX = 73.9;

function proj(lat: number, lon: number) {
  return {
    x: PAD + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (W - 2 * PAD),
    y: H - PAD - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * (H - 2 * PAD),
  };
}

function CompassRose({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className}>
      <circle cx="20" cy="20" r="18" fill="none" stroke="#22385c" strokeWidth="1" />
      <circle cx="20" cy="20" r="12" fill="none" stroke="#22385c" strokeWidth="0.5" />
      <path d="M20 2 L23 20 L20 38 L17 20 Z" fill="#22385c" />
      <path d="M2 20 L20 17 L38 20 L20 23 Z" fill="#22385c" opacity="0.7" />
    </svg>
  );
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

  const lats = [15.35, 15.38, 15.41, 15.44];
  const lons = [73.74, 73.78, 73.82, 73.86];

  return (
    <section className="overflow-hidden rounded-md border-2 border-[#22385c] bg-[#fbf7ee] shadow-sm">
      <div className="flex items-center gap-3 border-b-2 border-[#22385c]/30 bg-[#efe6cf]/50 px-4 py-3">
        <div className="mr-auto min-w-0">
          <h2 className="font-serif text-sm font-bold text-[#1b2a4a]">Mission chart — Goa Basin</h2>
          <p className="truncate font-serif text-xs italic text-[#6b5d3f]">
            Every mark is a logged contact · click to inspect
          </p>
        </div>
        <span className="hidden font-mono text-[10px] tracking-widest text-[#8a8574] md:inline">
          MISSION OS-118
        </span>
        <span className="border border-[#22385c]/30 bg-[#f4eddc] px-2 py-0.5 font-mono text-[10px] tabular-nums text-[#33415c]">
          {clock}
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Mission chart">
          <defs>
            <marker id="arrowInk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#22385c" />
            </marker>
          </defs>

          <rect width={W} height={H} fill="#efe6cf" />

          {lats.map((lat) => {
            const p = proj(lat, LON_MIN);
            return (
              <g key={lat}>
                <line x1={PAD} y1={p.y} x2={W - PAD} y2={p.y} stroke="#22385c" strokeOpacity="0.14" strokeWidth="1" />
                <text x={6} y={p.y + 3} fontSize="9" fill="#6b5d3f" fontFamily="var(--font-geist-mono), monospace">
                  {lat.toFixed(2)}°N
                </text>
              </g>
            );
          })}
          {lons.map((lon) => {
            const p = proj(LAT_MIN, lon);
            return (
              <g key={lon}>
                <line x1={p.x} y1={PAD} x2={p.x} y2={H - PAD} stroke="#22385c" strokeOpacity="0.14" strokeWidth="1" />
                <text x={p.x - 18} y={H - PAD + 14} fontSize="9" fill="#6b5d3f" fontFamily="var(--font-geist-mono), monospace">
                  {lon.toFixed(2)}°E
                </text>
              </g>
            );
          })}

          {/* coastline */}
          <path d={`M${W},${H * 0.28} C ${W * 0.93},${H * 0.22} ${W * 0.88},${H * 0.12} ${W * 0.9},0 L ${W},0 Z`} fill="#e3d7ba" stroke="#22385c" strokeWidth="1.2" />
          <text x={W - 62} y={26} fontSize="9" fill="#6b5d3f" fontFamily="var(--font-geist-mono), monospace">
            GOA COAST
          </text>

          {/* depth contours */}
          <path d="M60,180 C 220,240 420,300 620,330 C 690,342 730,360 750,392" fill="none" stroke="#22385c" strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="6 6" />
          <path d="M50,340 C 240,380 480,430 700,470 C 730,476 745,484 752,496" fill="none" stroke="#22385c" strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="6 6" />
          <text x="66" y="172" fontSize="9" fontStyle="italic" fill="#6b5d3f" fontFamily="var(--font-geist-serif), Georgia, serif">
            −40 m
          </text>
          <text x="56" y="332" fontSize="9" fontStyle="italic" fill="#6b5d3f" fontFamily="var(--font-geist-serif), Georgia, serif">
            −80 m
          </text>

          {/* boat track */}
          <path d={pathD} fill="none" stroke="#22385c" strokeWidth="2" strokeDasharray="8 5" markerEnd="url(#arrowInk)" />
          {(() => {
            const s = trajectoryPts[0];
            return (
              <>
                <circle cx={s.x} cy={s.y} r="4.5" fill="#fbf7ee" stroke="#22385c" strokeWidth="2" />
                <text x={s.x - 44} y={s.y - 10} fontSize="11" fontStyle="italic" fill="#22385c" fontFamily="Georgia, serif">
                  Launch · MSV Sagar-Dhwani
                </text>
              </>
            );
          })()}

          {/* contact marks */}
          {targets.map((t) => {
            const p = proj(t.lat, t.lon);
            const meta = SEVERITY_META[t.severity];
            const isSel = t.id === selectedId;
            const flipLabel = p.x > W - 170;
            return (
              <g key={t.id} transform={`translate(${p.x},${p.y})`} onClick={() => onSelect(t.id)} className="cursor-pointer">
                {isSel && <circle r="14" fill="none" stroke="#b03a2e" strokeWidth="1.5" className="pin-pulse" />}
                <line x1="0" y1="4" x2="0" y2="16" stroke="#22385c" strokeWidth="1.2" />
                <circle r={isSel ? 7 : 6} fill={meta.stroke} stroke="#fbf7ee" strokeWidth="1.8" />
                <path d="M-2.4,0 H2.4 M0,-2.4 V2.4" stroke="#ffffff" strokeWidth="1.1" />
                <text
                  x={flipLabel ? -12 : 12}
                  y="5"
                  fontSize="11"
                  fontStyle="italic"
                  textAnchor={flipLabel ? "end" : "start"}
                  fill={isSel ? "#b03a2e" : "#1b2a4a"}
                  fontFamily="Georgia, serif"
                  stroke="#efe6cf"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {t.id} · {Math.round(t.confidence * 100)}%
                </text>
              </g>
            );
          })}

          {/* north arrow */}
          <g transform={`translate(${W - 56},${H - 58})`}>
            <circle r="20" fill="#fbf7ee" stroke="#22385c" strokeWidth="1.2" />
            <path d="M0,-13 L4.5,5 L0,1.5 L-4.5,5 Z" fill="#22385c" />
            <text y="-26" fontSize="11" fontStyle="italic" textAnchor="middle" fill="#22385c" fontFamily="Georgia, serif">N</text>
          </g>
          {/* scale bar */}
          <g transform={`translate(${PAD},${H - 24})`}>
            <line x1="0" y1="0" x2="52" y2="0" stroke="#22385c" strokeWidth="1.5" />
            <line x1="0" y1="-4" x2="0" y2="4" stroke="#22385c" strokeWidth="1.5" />
            <line x1="52" y1="-4" x2="52" y2="4" stroke="#22385c" strokeWidth="1.5" />
            <text x="60" y="4" fontSize="9" fill="#6b5d3f" fontFamily="var(--font-geist-mono), monospace">≈ 500 m</text>
          </g>
        </svg>

        <TechnicalGrid />

        {/* Live AUV position — acoustic ping ripple */}
        {(() => {
          const auv = trajectoryPts[4];
          if (!auv) return null;
          return (
            <div
              className="pointer-events-none absolute z-10 h-28 w-28 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(auv.x / W) * 100}%`, top: `${(auv.y / H) * 100}%` }}
            >
              <SonarPingRipple className="h-full w-full" />
            </div>
          );
        })()}

        <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-sm border border-[#22385c]/30 bg-[#fbf7ee]/95 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wide text-[#33415c] shadow-sm backdrop-blur">
          <Navigation size={10} className="text-[#b03a2e]" /> Boat track · lawnmower sweep · 2 kn
        </div>

        <CompassRose className="pointer-events-none absolute bottom-4 left-16 h-14 w-14 opacity-25 max-md:hidden" />
      </div>

      <figcaption className="flex items-center justify-between border-t-2 border-[#22385c]/30 bg-[#efe6cf]/50 px-4 py-1.5">
        <span className="font-serif text-xs italic text-[#33415c]">Fig. 1 — Survey area with plotted contacts, line L04</span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-[#8a8574]">Datum WGS-84</span>
      </figcaption>
    </section>
  );
}
