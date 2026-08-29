"use client";

import { useCallback, useRef } from "react";

interface RadialGainDialProps {
  value: number; // 0..100
  onChange: (v: number) => void;
  label?: string;
  size?: number;
}

// Console gain dial — angular sweep 0°→100° mapped across a 270° arc with the
// gap at the six-o'clock position, like receiver gain on survey instrumentation.
export default function RadialGainDial({ value, onChange, label = "GAIN", size = 96 }: RadialGainDialProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const angleToValue = useCallback(
    (angleDeg: number) => {
      const a = Math.max(-135, Math.min(135, angleDeg));
      return Math.round(((a + 135) / 270) * 100);
    },
    [],
  );

  const eventToValue = useCallback(
    (clientX: number, clientY: number) => {
      const el = svgRef.current;
      if (!el) return value;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const a = (Math.atan2(dx, -dy) * 180) / Math.PI;
      return angleToValue(a);
    },
    [angleToValue, value],
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(eventToValue(e.clientX, e.clientY));
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons !== 1) return;
    onChange(eventToValue(e.clientX, e.clientY));
  };

  const pct = Math.max(0, Math.min(100, value));
  const a = -135 + (pct / 100) * 270;
  const rInd = 40;
  const ix = 50 + rInd * Math.sin((a * Math.PI) / 180);
  const iy = 50 - rInd * Math.cos((a * Math.PI) / 180);

  const ticks: number[] = [];
  for (let i = 0; i <= 10; i++) ticks.push(-135 + i * 27);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="select-none touch-none"
        style={{ cursor: "ns-resize" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
      >
        <circle cx="50" cy="50" r="48" fill="#0F2233" />
        <circle cx="50" cy="50" r="44.5" fill="none" stroke="rgba(139,233,253,0.16)" strokeWidth="1.2" />

        {/* tick ring */}
        {ticks.map((t, i) => {
          const rad = (t * Math.PI) / 180;
          const major = i % 5 === 0;
          const x1 = 50 + (major ? 41.5 : 43) * Math.sin(rad);
          const y1 = 50 - (major ? 41.5 : 43) * Math.cos(rad);
          const x2 = 50 + 44.5 * Math.sin(rad);
          const y2 = 50 - 44.5 * Math.cos(rad);
          return (
            <line
              key={t}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={i === 0 || i === 10 ? "rgba(255,85,85,0.75)" : "rgba(139,233,253,0.55)"}
              strokeWidth={major ? 1.6 : 0.9}
            />
          );
        })}

        {/* 270° track + filled gain arc, gap at six o'clock */}
        <circle
          cx="50"
          cy="50"
          r="36"
          pathLength={100}
          fill="none"
          stroke="rgba(139,233,253,0.16)"
          strokeWidth="5"
          strokeLinecap="butt"
          transform="rotate(135 50 50)"
          strokeDasharray="75 100"
        />
        <circle
          cx="50"
          cy="50"
          r="36"
          pathLength={100}
          fill="none"
          stroke="#8BE9FD"
          strokeWidth="5"
          strokeLinecap="butt"
          transform="rotate(135 50 50)"
          strokeDasharray={`${(pct / 100) * 75} 100`}
        />

        {/* indicator needle */}
        <line x1="50" y1="50" x2={ix.toFixed(2)} y2={iy.toFixed(2)} stroke="#FBFDFE" strokeWidth="1.8" />
        <circle cx={ix.toFixed(2)} cy={iy.toFixed(2)} r="2.4" fill="#8BE9FD" />

        {/* center readout */}
        <text x="50" y="56" textAnchor="middle" fontSize="15" fontWeight="700" fill="#8BE9FD" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
          {pct}
        </text>
        <text x="50" y="64" textAnchor="middle" fontSize="5.5" letterSpacing="1.5" fill="rgba(139,233,253,0.6)" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
          %
        </text>
      </svg>
      <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-[#7D8590]">{label}</span>
    </div>
  );
}