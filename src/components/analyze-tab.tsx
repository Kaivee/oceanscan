"use client";

import { ChevronRight, Compass } from "lucide-react";
import MapPanel from "@/components/map-panel";
import TelemetryCard from "@/components/telemetry-card";
import { SEVERITY_META, type SonarTarget } from "@/lib/targets";

interface AnalyzeTabProps {
  targets: SonarTarget[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onGoAcquire: () => void;
}

export default function AnalyzeTab({ targets, selectedId, onSelect, onGoAcquire }: AnalyzeTabProps) {
  if (targets.length === 0) {
    return (
      <EmptyState
        icon={<Compass size={26} />}
        title="Nothing to analyse yet"
        body="Run a scan first — every contact the AI finds will be plotted on the chart here."
        cta="Go to Acquire"
        onCta={onGoAcquire}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <MapPanel targets={targets} selectedId={selectedId} onSelect={onSelect} />
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <section className="overflow-hidden rounded-md border-2 border-[#22385c] bg-[#fbf7ee] shadow-sm">
          <div className="border-b-2 border-[#22385c]/20 bg-[#efe6cf]/50 px-4 py-2.5">
            <h3 className="font-serif text-sm font-bold text-[#1b2a4a]">Register of found objects</h3>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8574]">
              Click one to select it everywhere
            </p>
          </div>
          <ul className="divide-y divide-[#22385c]/10">
            {targets.map((t) => {
              const isSel = t.id === selectedId;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => onSelect(t.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSel ? "bg-[#efe6cf]" : "hover:bg-[#f4eddc]/60"
                    }`}
                  >
                    <span className={`h-2 w-2 shrink-0 rotate-45 ${SEVERITY_META[t.severity].dot}`} />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate font-serif text-sm ${isSel ? "font-bold text-[#b03a2e]" : "text-[#1b2a4a]"}`}
                      >
                        {t.label}
                      </span>
                      <span className="block font-mono text-[10px] tracking-wide text-[#8a8574]">
                        {t.id} · depth {t.depthM} m
                      </span>
                    </span>
                    <ChevronRight size={14} className={`shrink-0 ${isSel ? "text-[#b03a2e]" : "text-[#22385c]/30"}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <TelemetryCard target={targets.find((t) => t.id === selectedId) ?? null} />
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  cta,
  onCta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="grid place-items-center rounded-md border-2 border-dashed border-[#22385c]/40 bg-[#fbf7ee] px-6 py-24 text-center">
      <div>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#22385c]/40 bg-[#efe6cf] text-[#22385c]">
          {icon}
        </span>
        <h3 className="mt-3 font-serif text-base font-bold text-[#1b2a4a]">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm font-serif text-sm italic leading-relaxed text-[#6b5d3f]">{body}</p>
        <button
          onClick={onCta}
          className="mt-4 inline-flex items-center justify-center rounded-sm bg-[#22385c] px-4 py-2 font-serif text-sm font-bold text-[#f6f1e7] transition hover:bg-[#1b2a4a]"
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
