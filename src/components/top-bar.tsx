"use client";

import { Anchor, Upload } from "lucide-react";

interface TopBarProps {
  onUpload: () => void;
}

export default function TopBar({ onUpload }: TopBarProps) {
  return (
    <header className="z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-[#22385c] bg-[#fbf7ee] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#22385c] text-[#22385c]">
          <Anchor size={19} />
        </span>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate font-serif text-lg font-bold tracking-tight text-[#1b2a4a] sm:text-xl">
            OceanScan <span className="font-medium italic">Marine Survey</span>
          </h1>
          <p className="hidden truncate font-mono text-[9px] uppercase tracking-[0.25em] text-[#6b5d3f] sm:block">
            Hydrographic Debris Office · Est. 2026
          </p>
        </div>
      </div>

      <span className="ml-auto hidden -rotate-2 border-2 border-[#b03a2e] px-2 py-1 font-mono text-[10px] font-bold tracking-widest text-[#b03a2e] lg:inline-block" title="Simulated survey register entry">
        SURVEY Nº 118
      </span>

      <span
        title="The detection model is loaded on the boat's edge computer"
        className="inline-flex cursor-help items-center gap-1.5 border border-[#22385c]/40 bg-[#f4eddc] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#22385c]"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3e6b4f] opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3e6b4f]" />
        </span>
        Model active · INT8 edge
      </span>

      <button
        onClick={onUpload}
        className="rounded-sm bg-[#22385c] px-4 py-2 font-serif text-sm font-bold text-[#f6f1e7] transition hover:bg-[#1b2a4a]"
      >
        <span className="inline-flex items-center gap-2">
          <Upload size={15} />
          <span className="hidden sm:inline">Upload XTF</span>
          <span className="sm:hidden">Upload</span>
        </span>
      </button>
    </header>
  );
}
