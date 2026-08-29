"use client";

import { useEffect, useState } from "react";
import { Activity, Check, Cpu, RotateCcw, Upload } from "lucide-react";
import type { TabKey } from "@/components/tab-bar";

interface TopBarProps {
  onUpload: () => void;
  onNewMission: () => void;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  scanDone: boolean;
  foundCount: number;
}

const TABS: Array<{ key: TabKey; numeral: string; title: string }> = [
  { key: "acquire", numeral: "1", title: "Acquire" },
  { key: "analyze", numeral: "2", title: "Analyze" },
  { key: "report", numeral: "3", title: "Dispatch Report" },
];

export default function TopBar({ onUpload, onNewMission, activeTab, onTabChange, scanDone, foundCount }: TopBarProps) {
  const [fps, setFps] = useState(25);
  const [inference, setInference] = useState(40);

  // Live telemetry jitter — micro-fluctuations keep the counters alive rather
  // than frozen. Inference 38–42ms, FPS 24–26.
  useEffect(() => {
    const id = setInterval(() => {
      setFps(24 + Math.floor(Math.random() * 3));
      setInference(38 + Math.floor(Math.random() * 5));
    }, 900);
    return () => clearInterval(id);
  }, []);

  const isTabCompleted = (key: TabKey) => {
    if (key === "acquire" && scanDone) return true;
    if (key === "analyze" && scanDone && foundCount > 0) return true;
    return false;
  };

  return (
    <header className="panel z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-[var(--color-ocean-card)] px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#2AD9F8]/30 bg-gradient-to-br from-[#3709A5]/40 to-[#2AD9F8]/10">
          <Activity size={16} className="text-[#2AD9F8]" />
        </div>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate font-sans text-sm font-bold tracking-tight text-[#030507]">
            OceanScan AI <span className="text-[#6B6280]">{"//"}</span>{" "}
            <span className="text-[#3709A5]">Hydrographic Debris Classifier</span>
          </h1>
          <p className="hidden truncate font-mono text-[9px] uppercase tracking-[0.25em] text-[#6B6280] sm:block">
            Tactical Marine Survey Workstation
          </p>
        </div>
      </div>

      <nav className="ml-6 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          const completed = isTabCompleted(t.key);
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={`relative flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-xs transition-colors ${
                isActive
                  ? "bg-[#3709A5] text-white"
                  : "text-[#6B6280] hover:bg-[#E4DEF2] hover:text-[#030507]"
              }`}
            >
              <span
                className={`inline-flex h-4 min-w-4 items-center justify-center rounded-sm border px-1 font-mono text-[9px] font-bold ${
                  completed
                    ? "border-[#10B981]/50 bg-[#10B981]/15 text-[#10B981]"
                    : isActive
                      ? "border-white/40 text-white"
                      : "border-[#3709A5]/20 text-[#6B6280]"
                }`}
              >
                {completed ? <Check size={9} strokeWidth={3} /> : t.numeral}
              </span>
              {t.title}
              {completed && <span className="ml-1 flex h-1.5 w-1.5 rounded-full bg-[#10B981]" />}
              {t.key === "report" && foundCount > 0 && (
                <span className="ml-1 rounded-sm bg-[#F59E0B]/15 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-widest text-[#F59E0B]">
                  {foundCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={onNewMission}
          title="Return to the Mission Launch screen"
          className="inline-flex items-center gap-1.5 rounded-sm border border-[#3709A5]/20 bg-[#E4DEF2] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#6B6280] transition hover:border-[#3709A5]/50 hover:text-[#3709A5]"
        >
          <RotateCcw size={11} /> New Mission
        </button>

        <span
          title="TensorRT INT8 inference engine active on edge node"
          className="breathe hidden items-center gap-1.5 rounded-sm border border-[rgba(16,185,129,0.35)] bg-[#10B981]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#10B981] lg:inline-flex"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#10B981]" />
          </span>
          TENSORRT INT8 ONLINE
        </span>

        <div className="hidden items-center gap-3 rounded-sm border border-[#3709A5]/15 bg-[#E4DEF2] px-3 py-1.5 font-mono text-[10px] text-[#6B6280] md:flex">
          <span className="flex items-center gap-1">
            <Cpu size={10} className="text-[#3709A5]" />
            Inference: <span className="tabular-nums text-[#3709A5]">{inference}ms</span>
          </span>
          <span className="h-3 w-px bg-[#3709A5]/15" />
          <span className="flex items-center gap-1">
            <Activity size={10} className="text-[#10B981]" />
            FPS: <span className="tabular-nums text-[#10B981]">{fps}</span>
          </span>
        </div>

        <button
          onClick={onUpload}
          className="inline-flex items-center gap-1.5 rounded bg-[#3709A5] px-3 py-1.5 font-mono text-xs font-bold text-white transition hover:bg-[#4a12c9]"
        >
          <Upload size={13} />
          <span className="hidden sm:inline">Upload Survey (.XTF/.JSF)</span>
          <span className="sm:hidden">Upload</span>
        </button>
      </div>
    </header>
  );
}
