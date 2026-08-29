"use client";

import { useMemo } from "react";
import type { SonarTarget } from "@/lib/targets";

const W = 720;
const H = 96;
const DB_MIN = -60;
const DB_MAX = 30;
const PAD_X = 42;
const PAD_T = 8;
const PAD_B = 20;

interface HoverPoint {
  x: number | null;
  y: number | null;
}

interface AcousticIntensityProfileProps {
  hover: HoverPoint; // x/y as 0..100 percent across the sonar viewport
  targets: (SonarTarget & { detectionStatus: string })[];
}

function dbToY(db: number) {
  const t = (db - DB_MIN) / (DB_MAX - DB_MIN);
  return PAD_T + t * (H - PAD_T - PAD_B);
}

export default function AcousticIntensityProfile({ hover, targets }: AcousticIntensityProfileProps) {
  const zones = useMemo(
    () =>
      targets.map((t) => ({
        id: t.id,
        label: t.label,
        x0: t.box.x,
        x1: t.box.x + t.box.w,
        y0: t.box.y,
        y1: t.box.y + t.box.h,
      })),
    [targets],
  );

  // The cross-section is only "on target" when the hover point is actually inside
  // a detection's bounding box in BOTH axes — vertical position matters.
  const hoverX = hover.x;
  const hoverY = hover.y;
  const inside = useMemo(() => {
    if (hoverX === null || hoverY === null) return undefined;
    return zones.find(
      (z) => hoverX >= z.x0 && hoverX <= z.x1 && hoverY >= z.y0 && hoverY <= z.y1,
    );
  }, [hoverX, hoverY, zones]);

  // Baseline backscatter profile across the full range, with an injected spike+trough
  // at the target's cross-track position whenever the cursor is hovering over it.
  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const focusX = inside ? inside.x0 + (inside.x1 - inside.x0) / 2 : null;
    const noise = (n: number) => {
      const v = Math.sin(n * 12.9898 + (focusX ?? 0)) * 43758.5453;
      return v - Math.floor(v);
    };

    for (let i = 0; i <= 100; i += 1) {
      let db = -38 + Math.sin(i / 9) * 6 - (noise(i) - 0.5) * 9;
      // Long-range roll-off (attenuation with slant range)
      db -= (i / 100) * 12;

      if (focusX !== null) {
        const d = Math.abs(i - focusX);
        // Intense backscatter spike then immediate acoustic-shadow trough
        const spike = Math.max(0, 6 - d);
        db += spike * 6; // up to +18dB at the face
        if (i > focusX && i < focusX + 8) db -= 24; // flat shadow behind the target
      }

      pts.push({ x: PAD_X + (i / 100) * (W - 2 * PAD_X), y: dbToY(db) });
    }
    return pts;
  }, [inside]);

  const lineD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const cursorX = hoverX !== null ? PAD_X + (hoverX / 100) * (W - 2 * PAD_X) : null;

  return (
    <div className="border-t border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] px-2 pb-1 pt-1">
      <div className="flex items-center justify-between px-1 font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--color-ocean-muted)]">
        <span>Acoustic Intensity Profile · dB vs Range</span>
        <span>
          {inside ? (
            <span className="text-[var(--color-ocean-amber)]">
              Hard return · {inside.label} · +18 dB spike / shadow
            </span>
          ) : (
            "hover sonar to trace cross-section"
          )}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="block h-16 w-full sm:h-[70px]" preserveAspectRatio="none">
        <rect width={W} height={H} fill="#0A101C" />
        {[0, 1, 2, 3, 4].map((i) => {
          const db = DB_MIN + i * 22.5;
          return (
            <g key={i}>
              <line
                x1={PAD_X}
                y1={dbToY(db)}
                x2={W - PAD_X}
                y2={dbToY(db)}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
              <text x="4" y={dbToY(db) + 2.5} fontSize="7" fill="rgba(148,163,184,0.6)" fontFamily="monospace">
                {Math.round(db)}
              </text>
            </g>
          );
        })}
        <text x="4" y={H - 4} fontSize="7" fill="rgba(148,163,184,0.6)" fontFamily="monospace">
          RANGE →
        </text>

        <path d={lineD} fill="none" stroke="#5FD4C4" strokeWidth="1.4" opacity="0.85" />

        {/* Target zones shading */}
        {zones.map((z) => {
          const x = PAD_X + (((z.x0 + z.x1) / 2) / 100) * (W - 2 * PAD_X);
          const active = inside?.id === z.id;
          return (
            <g key={z.id}>
              <line
                x1={x}
                y1={PAD_T}
                x2={x}
                y2={H - PAD_B}
                stroke={active ? "rgba(201,122,18,0.8)" : "rgba(95,212,196,0.3)"}
                strokeWidth={active ? 1.4 : 1}
                strokeDasharray="3 3"
              />
              <text x={x + 3} y={PAD_T + 4} fontSize="7" fill={active ? "rgba(201,122,18,0.9)" : "rgba(95,212,196,0.65)"} fontFamily="monospace">
                {z.label}
              </text>
            </g>
          );
        })}

        {cursorX !== null && (
          <line x1={cursorX} y1={PAD_T} x2={cursorX} y2={H - PAD_B} stroke="rgba(201,122,18,0.9)" strokeWidth="1.2" />
        )}
      </svg>
    </div>
  );
}
