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
  surveyName?: string | null;
}

const TABS: Array<{ key: TabKey; numeral: string; title: string }> = [
  { key: "acquire", numeral: "1", title: "Acquire" },
  { key: "analyze", numeral: "2", title: "Analyze" },
  { key: "report", numeral: "3", title: "Dispatch Report" },
];

export default function TopBar({ onUpload, onNewMission, activeTab, onTabChange, scanDone, foundCount, surveyName }: TopBarProps) {
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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#2A4158] bg-[#0F2233]">
          <Activity size={16} className="text-[#5FD4C4]" />
        </div>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate font-display text-sm font-semibold tracking-tight text-[#10202E]">
            OceanScan <span className="text-[#0E6BA8]">AI</span>{" "}
            <span className="text-[#45566A]">{"//"}</span>{" "}
            <span className="text-[#10202E]">Hydrographic Debris Classifier</span>
          </h1>
          <p className="hidden truncate font-mono text-[9px] uppercase tracking-[0.25em] text-[#45566A] sm:block">
            {surveyName ? (
              <>
                Survey Loaded — <span className="text-[#0E6BA8]">{surveyName}</span>
              </>
            ) : (
              "Tactical Marine Survey Workstation"
            )}
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
              className={`relative flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs transition-colors ${
                isActive
                  ? "bg-[#0E6BA8] text-white"
                  : "text-[#45566A] hover:bg-[var(--color-ocean-surface)] hover:text-[#10202E]"
              }`}
            >
              <span
                className={`inline-flex h-4 min-w-4 items-center justify-center border px-1 font-mono text-[9px] font-bold ${
                  completed
                    ? "border-[#0E6BA8]/50 bg-[#0E6BA8]/10 text-[#0E6BA8]"
                    : isActive
                      ? "border-white/40 text-white"
                      : "border-[#0E6BA8]/25 text-[#45566A]"
                }`}
              >
                {completed ? <Check size={9} strokeWidth={3} /> : t.numeral}
              </span>
              {t.title}
              {completed && <span className="ml-1 flex h-1.5 w-1.5 rounded-full bg-[#0E6BA8]" />}
              {t.key === "report" && foundCount > 0 && (
                <span className="ml-1 border border-[#C97A12]/30 bg-[#C97A12]/10 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-widest text-[#C97A12]">
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
          className="inline-flex items-center gap-1.5 border border-[#0E6BA8]/25 bg-[var(--color-ocean-surface)] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#45566A] transition hover:border-[#0E6BA8]/60 hover:text-[#0E6BA8]"
        >
          <RotateCcw size={11} /> New Mission
        </button>

        <span
          title="TensorRT INT8 inference engine active on edge node"
          className="breathe hidden items-center gap-1.5 border border-[rgba(14,107,168,0.35)] bg-[#0E6BA8]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#0E6BA8] lg:inline-flex"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0E6BA8] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#0E6BA8]" />
          </span>
          TENSORRT INT8 ONLINE
        </span>

        <div className="hidden items-center gap-3 border border-[#0E6BA8]/20 bg-[var(--color-ocean-surface)] px-3 py-1.5 font-mono text-[10px] text-[#45566A] md:flex">
          <span className="flex items-center gap-1">
            <Cpu size={10} className="text-[#0E6BA8]" />
            Inference: <span className="tabular-nums text-[#0E6BA8]">{inference}ms</span>
          </span>
          <span className="h-3 w-px bg-[#0E6BA8]/20" />
          <span className="flex items-center gap-1">
            <Activity size={10} className="text-[#0E6BA8]" />
            FPS: <span className="tabular-nums text-[#0E6BA8]">{fps}</span>
          </span>
        </div>

        <button
          onClick={onUpload}
          className="inline-flex items-center gap-1.5 bg-[#0E6BA8] px-3 py-1.5 font-mono text-xs font-bold text-white transition hover:bg-[#0B5C8F]"
        >
          <Upload size={13} />
          <span className="hidden sm:inline">Upload Survey (.XTF/.JSF)</span>
          <span className="sm:hidden">Upload</span>
        </button>
      </div>
    </header>
  );
}