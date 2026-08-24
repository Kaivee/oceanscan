"use client";

import { useEffect, useState } from "react";

// 1. Acoustic Sonar Ping Wave for the AUV Map Position
export function SonarPingRipple({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <span className="absolute h-16 w-16 animate-ping rounded-full bg-[#22385c] opacity-40 duration-1000" />
      <span className="absolute h-28 w-28 animate-ping rounded-full bg-[#22385c] opacity-20 duration-1000 delay-300" />
      <span className="relative z-10 flex h-4 w-4 items-center justify-center rounded-full bg-[#b03a2e] ring-4 ring-[#efe6cf]">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </span>
    </div>
  );
}

// 2. Technical Cartographic Grid Background
export function TechnicalGrid() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]">
      <div className="absolute top-2 left-2 text-[10px] font-mono text-[#6b5d3f]">{"15°26'00\"N | 73°46'00\"E"}</div>
      <div className="absolute bottom-2 right-2 text-[10px] font-mono text-[#6b5d3f]">DATUM: WGS-84 / UTM-43N</div>
    </div>
  );
}

// 3. Animated Monospace Number Ticker
export function NumberTicker({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    const stepTime = 20;
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

  return <span className="font-mono">{displayValue.toFixed(decimals)}</span>;
}

// 4. High-Density Marine Survey Data Table
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
        return "border-[#b03a2e] bg-[#b03a2e]/[0.07] text-[#b03a2e]";
      case "Medium":
        return "border-[#8a6d1f] bg-[#8a6d1f]/[0.08] text-[#8a6d1f]";
      case "Low":
        return "border-[#3e6b4f] bg-[#3e6b4f]/[0.08] text-[#3e6b4f]";
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-sm border-2 border-[#22385c] bg-[#fbf7ee] shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#efe6cf] font-mono uppercase tracking-widest text-[#5c5b4d] border-b-2 border-[#22385c]">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Target ID</th>
              <th className="py-2.5 px-4 font-semibold">Classification</th>
              <th className="py-2.5 px-4 font-semibold">Confidence</th>
              <th className="py-2.5 px-4 font-semibold">Coordinates (Lat / Lon)</th>
              <th className="py-2.5 px-4 font-semibold">Depth</th>
              <th className="py-2.5 px-4 font-semibold">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d8cdb4]">
            {data.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectTarget && onSelectTarget(item.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? "bg-[#efe6cf]" : "hover:bg-[#f4eddc]/60"
                  }`}
                >
                  <td className={`py-2.5 px-4 font-mono text-[#22385c] ${isSelected ? "font-bold" : "font-medium"}`}>{item.id}</td>
                  <td className="py-2.5 px-4 font-serif italic text-[#33415c]">{item.className}</td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-[#1b2a4a]">{Math.round(item.confidence * 100)}%</td>
                  <td className="py-2.5 px-4 font-mono text-[#6b5d3f]">
                    {item.latitude.toFixed(4)}°N, {item.longitude.toFixed(4)}°E
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-[#33415c]">{item.depth} m</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-block -rotate-1 border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${getSeverityBadge(
                        item.severity
                      )}`}
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
