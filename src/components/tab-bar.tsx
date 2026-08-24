"use client";

import { CircleCheck } from "lucide-react";

export type TabKey = "acquire" | "analyze" | "report";

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  scanDone: boolean;
  foundCount: number;
}

const TABS: Array<{ key: TabKey; numeral: string; title: string }> = [
  { key: "acquire", numeral: "I", title: "Acquire" },
  { key: "analyze", numeral: "II", title: "Analyze" },
  { key: "report", numeral: "III", title: "Report" },
];

export default function TabBar({ active, onChange, scanDone, foundCount }: TabBarProps) {
  return (
    <nav className="sticky top-0 z-30 border-b-2 border-[#22385c] bg-[#f6f1e7]/95 backdrop-blur">
      <div className="flex gap-6 overflow-x-auto px-4 sm:px-5">
        {TABS.map((t) => {
          const isActive = active === t.key;
          const isDone =
            (t.key === "acquire" && scanDone) ||
            (t.key === "analyze" && scanDone && foundCount > 0);
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`relative flex items-center gap-2 border-b-4 py-3 font-serif text-sm transition-colors ${
                isActive
                  ? "-mb-[2px] border-[#b03a2e] font-bold text-[#1b2a4a]"
                  : "border-transparent text-[#6b5d3f] hover:text-[#22385c]"
              }`}
            >
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1 font-mono text-[10px] font-bold ${
                  isActive ? "border-[#b03a2e] text-[#b03a2e]" : "border-[#22385c]/40 text-[#6b5d3f]"
                }`}
              >
                {t.numeral}
              </span>
              {t.title}
              {isDone && <CircleCheck size={13} className="text-[#3e6b4f]" />}
              {t.key === "report" && foundCount > 0 && (
                <span className="-rotate-3 rounded-none border-[1.5px] border-[#8a6d1f] px-1.5 font-mono text-[9px] font-bold tracking-widest text-[#8a6d1f]">
                  {foundCount} LOGGED
                </span>
              )}
            </button>
          );
        })}
        <span className="ml-auto hidden items-center py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-[#8a8574] md:flex">
          Register of contacts · Goa Basin
        </span>
      </div>
    </nav>
  );
}
