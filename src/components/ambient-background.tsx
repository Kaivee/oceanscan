"use client";

export default function AmbientBackground() {
  // Chart-paper watermark: a faint vector compass rose + corner graticule
  // notes so the glacial-ice canvas reads as a survey chart, never flat SaaS.
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <svg
        className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2"
        viewBox="0 0 100 100"
        fill="none"
        style={{ opacity: 0.055 }}
      >
        <g transform="rotate(-15 50 50)">
          <circle cx="50" cy="50" r="47" stroke="#E6EDF3" strokeWidth="0.4" />
          <circle cx="50" cy="50" r="41" stroke="#E6EDF3" strokeWidth="0.25" />
          <circle cx="50" cy="50" r="31" stroke="#E6EDF3" strokeWidth="0.2" />
          <circle cx="50" cy="50" r="17" stroke="#E6EDF3" strokeWidth="0.2" />
          <path d="M50 6 L55 40 L50 45 L45 40 Z" fill="#E6EDF3" />
          <path d="M50 94 L55 60 L50 55 L45 60 Z" fill="#E6EDF3" />
          <path d="M6 50 L40 45 L45 50 L40 55 Z" fill="#E6EDF3" />
          <path d="M94 50 L60 45 L55 50 L60 55 Z" fill="#E6EDF3" />
          <path d="M50 14 L52.5 30 L47.5 30 Z" fill="#FFF" />
          <path d="M22 50 L38 47.5 L38 52.5 Z" fill="#FFF" />
          <text x="50" y="16" textAnchor="middle" fontSize="7" fill="#E6EDF3" style={{ fontFamily: "monospace" }}>
            N
          </text>
          <text x="85" y="51.5" textAnchor="middle" fontSize="5" fill="#E6EDF3" style={{ fontFamily: "monospace" }}>
            E
          </text>
        </g>
      </svg>

      <span className="absolute left-3 top-2 font-mono text-[9px] uppercase tracking-[0.3em] text-[#7D8590]/30">
        CHART · WGS-84 · GRID 56 M
      </span>
      <span className="absolute right-3 top-2 font-mono text-[9px] uppercase tracking-[0.3em] text-[#7D8590]/30">
        ISO. 93° · 00 · 00&quot;E
      </span>
      <span className="absolute bottom-2 left-3 font-mono text-[9px] uppercase tracking-[0.3em] text-[#7D8590]/30">
        15° 26 &apos; 32&quot; N
      </span>
      <span className="absolute bottom-2 right-3 font-mono text-[9px] uppercase tracking-[0.3em] text-[#7D8590]/30">
        SEA STATE · 01
      </span>
    </div>
  );
}