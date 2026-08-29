"use client";

import type { Severity } from "@/lib/targets";

interface SwathConeProps {
  position: "left" | "center" | "right";
  color?: string;
  size?: number;
}

// Miniature sonar-cone glyph: towfish cone viewed side-on with a dot marking
// the contact's cross-range position inside the swath (left / center / right).
export default function SwathCone({ position, color = "#7D8590", size = 14 }: SwathConeProps) {
  const dotX = position === "left" ? 4.2 : position === "right" ? 11.8 : 8;

  return (
    <svg
      width={size}
      height={size * 0.82}
      viewBox="0 0 16 13"
      className="shrink-0"
      aria-label={`swath position: ${position}`}
    >
      <path d="M8 0.8 L1.5 12.4 L14.5 12.4 Z" fill="rgba(15,34,51,0.06)" stroke="rgba(69,85,106,0.55)" strokeWidth="0.9" strokeLinejoin="round" />
      <circle cx={dotX} cy="8.6" r="1.7" fill={color} />
    </svg>
  );
}

export function coneColorForSeverity(severity: Severity): string {
  if (severity === "high") return "#FF5555";
  if (severity === "medium") return "#FFB86C";
  return "#8BE9FD";
}