"use client";

import { useEffect, useState } from "react";
import { Activity, Check, Cpu, Upload } from "lucide-react";
import type { TabKey } from "@/components/tab-bar";

interface TopBarProps {
  onUpload: () => void;
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

export default function TopBar({ onUpload, activeTab, onTabChange, scanDone, foundCount }: TopBarProps) {
  const [fps, setFps] = useState(26);
  const [inference, setInference] = useState(38);

  useEffect(() => {
    const id = setInterval(() => {
      setFps(24 + Math.floor(Math.random() * 5));
      setInference(32 + Math.floor(Math.random() * 14));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const isTabCompleted = (key: TabKey) => {
    if (key === "acquire" && scanDone) return true;
    if (key === "analyze" && scanDone && foundCount > 0) return true;
    return false;
  };

  return (
    <header className="z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[var(--color-ocean-sky)]/30 bg-[var(--color-ocean-sky)]/10">
          <Activity size={16} className="text-[var(--color-ocean-sky)]" />
        </div>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate font-mono text-sm font-bold tracking-tight text-[var(--color-ocean-text)]">
            OceanScan AI <span className="text-[var(--color-ocean-muted)]">//</span>{" "}
            <span className="text-[var(--color-ocean-sky)]">Hydrographic Debris Classifier</span>
          </h1>
          <p className="hidden truncate font-mono text-[9px] uppercase tracking-[0.25em] text-[var(--color-ocean-muted)] sm:block">
            Tactical Marine Survey Workstation
          </p>
        </div>
      </div>

      <nav className="ml-6 flex gap-1 overflow-x-auto">
        {TABS.map((t, i) => {
          const isActive = activeTab === t.key;
          const completed = isTabCompleted(t.key);
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={`relative flex items-center gap-1.5 rounded px-3 py-1.5 font-mono text-xs transition-colors ${
                isActive
                  ? "bg-emerald-600/20 text-emerald-400"
                  : "text-[var(--color-ocean-muted)] hover:bg-[var(--color-ocean-surface)] hover:text-[var(--color-ocean-text)]"
              }`}
            >
              {i > 0 && (
                <span className={`absolute -left-2 top-1/2 h-px w-2 ${completed ? "bg-emerald-500/50" : "bg-[var(--color-ocean-border)]"}`} />
              )}
              <span
                className={`inline-flex h-4 min-w-4 items-center justify-center rounded-sm border px-1 font-mono text-[9px] font-bold ${
                  completed
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                    : isActive
                      ? "border-[var(--color-ocean-emerald)]/50 text-[var(--color-ocean-emerald)]"
                      : "border-[var(--color-ocean-border)] text-[var(--color-ocean-muted)]"
                }`}
              >
                {completed ? <Check size={9} strokeWidth={3} /> : t.numeral}
              </span>
              {t.title}
              {completed && (
                <span className="ml-1 flex h-1.5 w-1.5 rounded-full bg-[var(--color-ocean-emerald)]" />
              )}
              {t.key === "report" && foundCount > 0 && (
                <span className="ml-1 rounded-sm bg-[var(--color-ocean-amber)]/15 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-widest text-[var(--color-ocean-amber)]">
                  {foundCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <span
          title="TensorRT INT8 inference engine active on edge node"
          className="hidden items-center gap-1.5 rounded-sm border border-[var(--color-ocean-emerald)]/30 bg-[var(--color-ocean-emerald)]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-ocean-emerald)] lg:inline-flex"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-ocean-emerald)] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-ocean-emerald)]" />
          </span>
          TENSORRT INT8 ONLINE
        </span>

        <div className="hidden items-center gap-3 rounded-sm border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-3 py-1.5 font-mono text-[10px] text-[var(--color-ocean-muted)] md:flex">
          <span className="flex items-center gap-1">
            <Cpu size={10} className="text-[var(--color-ocean-sky)]" />
            Inference: <span className="tabular-nums text-[var(--color-ocean-sky)]">{inference}ms</span>
          </span>
          <span className="h-3 w-px bg-[var(--color-ocean-border)]" />
          <span className="flex items-center gap-1">
            <Activity size={10} className="text-[var(--color-ocean-emerald)]" />
            FPS: <span className="tabular-nums text-[var(--color-ocean-emerald)]">{fps}</span>
          </span>
        </div>

        <button
          onClick={onUpload}
          className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 font-mono text-xs font-bold text-white transition hover:bg-emerald-500"
        >
          <Upload size={13} />
          <span className="hidden sm:inline">Upload Survey (.XTF/.JSF)</span>
          <span className="sm:hidden">Upload</span>
        </button>
      </div>
    </header>
  );
}
