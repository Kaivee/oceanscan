"use client";

import { Check, RotateCcw } from "lucide-react";
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
  { key: "analyze", numeral: "2", title: "Analyse" },
  { key: "report", numeral: "3", title: "Report" },
];

export default function TopBar({ onUpload, onNewMission, activeTab, onTabChange, scanDone, foundCount, surveyName }: TopBarProps) {
  const isTabCompleted = (key: TabKey) => {
    if (key === "acquire" && scanDone) return true;
    if (key === "analyze" && scanDone && foundCount > 0) return true;
    return false;
  };

  const ordinals = ["1", "2", "3"];

  return (
    <header className="panel z-20 flex flex-wrap items-center gap-x-5 gap-y-2 border-b bg-[var(--color-ocean-card)] px-4 py-3">
      {/* Wordmark */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--color-ocean-border)] bg-[var(--color-ocean-console)]">
          <span className="font-mono text-[13px] font-bold text-[#8BE9FD]">⨝</span>
        </div>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate font-display text-[15px] font-bold uppercase tracking-[0.18em] text-[#E6EDF3]">
            OceanScan <span className="text-[#8BE9FD]">AI</span>
          </h1>
          <p className="hidden truncate font-mono text-[9px] uppercase tracking-[0.25em] text-[#7D8590] sm:block">
            {surveyName ? (
              <>
                Track Loaded · <span className="text-[#8BE9FD]">{surveyName}</span>
              </>
            ) : (
              "Hydrographic Debris Classifier"
            )}
          </p>
        </div>
      </div>

      {/* Navigation stepper */}
      <nav className="flex items-center gap-1 overflow-x-auto">
        {TABS.map((t, i) => {
          const isActive = activeTab === t.key;
          const completed = isTabCompleted(t.key);
          return (
            <div key={t.key} className="flex items-center gap-1">
              {i > 0 && <span className="mx-0.5 font-mono text-[10px] text-[#7D8590]/50">→</span>}
              <button
                onClick={() => onTabChange(t.key)}
                className={`flex items-center gap-2 px-2.5 py-1.5 font-mono text-xs transition ${
                  isActive
                    ? "bg-[#8BE9FD] text-[#0D1117]"
                    : "text-[#7D8590] hover:bg-[var(--color-ocean-surface)] hover:text-[#E6EDF3]"
                }`}
                style={{ boxShadow: isActive ? "0 0 0 1px #8BE9FD" : undefined, borderRadius: 0 }}
              >
                <span className="tabular-nums">{ordinals[i]}.</span>
                <span className="font-bold uppercase tracking-wide">{t.title}</span>
                {completed && <Check size={10} strokeWidth={3} className={isActive ? "text-[#0D1117]" : "text-[#50FA7B]"} />}
                {t.key === "report" && foundCount > 0 && (
                  <span className={`ml-0.5 border px-1 py-0.5 font-mono text-[8px] font-bold tabular-nums ${
                    isActive ? "border-[#0D1117]/30 text-[#0D1117]" : "border-[#FFB86C]/40 text-[#FFB86C]"
                  }`}>
                    {foundCount}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={onNewMission}
          title="Return to the Mission Launch screen"
          className="inline-flex items-center gap-1.5 border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#7D8590] transition hover:border-[#8BE9FD]/60 hover:text-[#E6EDF3]"
        >
          <RotateCcw size={11} /> New Mission
        </button>

        <span
          title="Edge node inference engine healthy"
          className="breathe hidden items-center gap-2 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#E6EDF3] lg:inline-flex"
          style={{ border: "1px solid rgba(139,233,253,0.35)", background: "rgba(139,233,253,0.06)", borderRadius: 0 }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#50FA7B]" />
          Edge Node · TensorRT INT8 · <span className="text-[#50FA7B]">NOMINAL</span>
        </span>

        <button
          onClick={onUpload}
          className="inline-flex items-center gap-2 border border-[#8BE9FD] bg-[#8BE9FD]/10 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#8BE9FD] transition hover:bg-[#8BE9FD] hover:text-[#0D1117]"
          style={{ borderRadius: 0 }}
        >
          <span aria-hidden>⤓</span>
          <span className="hidden sm:inline">Ingest File / Switch Track</span>
          <span className="sm:hidden">Ingest</span>
        </button>
      </div>
    </header>
  );
}
