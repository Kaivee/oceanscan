"use client";

import { useEffect, useState } from "react";

export function SonarPingRipple({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <span className="absolute h-16 w-16 animate-ping rounded-full bg-[var(--color-ocean-sky)] opacity-30 duration-1000" />
      <span className="absolute h-28 w-28 animate-ping rounded-full bg-[var(--color-ocean-sky)] opacity-15 duration-1000 delay-300" />
      <span className="relative z-10 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--color-ocean-red)] ring-2 ring-[var(--color-ocean-sky)]/30">
        <span className="h-1 w-1 rounded-full bg-white" />
      </span>
    </div>
  );
}

export function TechnicalGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(rgba(56,189,248,0.15)_1px,transparent_1px)] [background-size:20px_20px]">
      <div className="absolute top-2 left-2 font-mono text-[9px] text-[var(--color-ocean-sky)]/60">
        {"15°26'00\"N | 73°46'00\"E"}
      </div>
      <div className="absolute bottom-2 right-2 font-mono text-[9px] text-[var(--color-ocean-sky)]/60">
        DATUM: WGS-84 / UTM-43N
      </div>
    </div>
  );
}

export function NumberTicker({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 600;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = value / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span className="font-mono tabular-nums">{displayValue.toFixed(decimals)}</span>;
}

export interface AnomalyTarget {
  id: string;
  className: string;
  confidence: number;
  latitude: number;
  longitude: number;
  depth: number;
  severity: "High" | "Medium" | "Low";
}

interface MarineTableProps {
  data: AnomalyTarget[];
  selectedId?: string;
  onSelectTarget?: (id: string) => void;
}

export function MarineSurveyTable({ data, selectedId, onSelectTarget }: MarineTableProps) {
  const getSeverityBadge = (severity: AnomalyTarget["severity"]) => {
    switch (severity) {
      case "High":
        return "border-[var(--color-ocean-red)] bg-[var(--color-ocean-red)]/10 text-[var(--color-ocean-red)]";
      case "Medium":
        return "border-[var(--color-ocean-amber)] bg-[var(--color-ocean-amber)]/10 text-[var(--color-ocean-amber)]";
      case "Low":
        return "border-[var(--color-ocean-blue)] bg-[var(--color-ocean-blue)]/10 text-[var(--color-ocean-blue)]";
    }
  };

  return (
    <div className="w-full overflow-hidden rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--color-ocean-surface)] font-mono uppercase tracking-widest text-[var(--color-ocean-muted)] border-b border-[var(--color-ocean-border)]">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Target ID</th>
              <th className="py-2.5 px-4 font-semibold">Classification</th>
              <th className="py-2.5 px-4 font-semibold">Confidence</th>
              <th className="py-2.5 px-4 font-semibold">Coordinates</th>
              <th className="py-2.5 px-4 font-semibold">Depth</th>
              <th className="py-2.5 px-4 font-semibold">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-ocean-border)]">
            {data.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectTarget?.(item.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[var(--color-ocean-surface)]"
                      : "hover:bg-[var(--color-ocean-surface)]/50"
                  }`}
                >
                  <td className={`py-2.5 px-4 font-mono text-[var(--color-ocean-sky)] ${isSelected ? "font-bold" : "font-medium"}`}>
                    {item.id}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[var(--color-ocean-text)]">{item.className}</td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-[var(--color-ocean-text)]">
                    {Math.round(item.confidence * 100)}%
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[var(--color-ocean-sky)]/70">
                    {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-[var(--color-ocean-text)]">{item.depth} m</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-block border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${getSeverityBadge(item.severity)}`}
                    >
                      {item.severity}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
