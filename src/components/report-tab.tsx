"use client";

import { useState } from "react";
import { Braces, FileDown, Route, Table, Timer, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/analyze-tab";
import {
  MarineSurveyTable,
  NumberTicker,
  type AnomalyTarget,
} from "@/components/marine-ui";
import { downloadText, toCsv, type SonarTarget } from "@/lib/targets";

interface ReportTabProps {
  targets: SonarTarget[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onExportGeojson: () => void;
  onRetrievalPath: () => void;
  onGoAcquire: () => void;
}

function toAnomaly(t: SonarTarget): AnomalyTarget {
  return {
    id: t.id,
    className: t.label,
    confidence: t.confidence,
    latitude: t.lat,
    longitude: t.lon,
    depth: t.depthM,
    severity:
      t.severity === "high" ? "High" : t.severity === "medium" ? "Medium" : "Low",
  };
}

export default function ReportTab({
  targets,
  selectedId,
  onSelect,
  onExportGeojson,
  onRetrievalPath,
  onGoAcquire,
}: ReportTabProps) {
  const [minConf, setMinConf] = useState(0);

  if (targets.length === 0) {
    return (
      <EmptyState
        icon={<Table size={26} />}
        title="No findings to report yet"
        body="Once a scan has run, every detected object is listed here with export options."
        cta="Go to Acquire"
        onCta={onGoAcquire}
      />
    );
  }

  const visible = targets.filter((t) => t.confidence * 100 >= minConf);
  const highCount = targets.filter((t) => t.severity === "high").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Contacts found" value={targets.length} />
        <StatCard
          label="High risk"
          value={highCount}
          tone={highCount > 0 ? "text-[#b03a2e]" : undefined}
        />
        <StatCard label="Area scanned" value={12.4} decimals={1} suffix=" km²" />
        <StatCard
          label="Mission time"
          icon={<Timer size={15} />}
          staticValue="14 m 32 s"
        />
      </div>

      <section className="overflow-hidden rounded-md border-2 border-[#22385c] bg-[#fbf7ee] shadow-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-[#22385c]/30 bg-[#efe6cf]/50 px-4 py-3">
          <div className="mr-auto min-w-0">
            <h2 className="font-serif text-sm font-bold text-[#1b2a4a]">Findings</h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8574]">
              Click a row to select · filter weak matches below
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <label
              htmlFor="report-conf"
              className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#6b5d3f]"
              title="Only show objects scoring above this confidence"
            >
              Min confidence
            </label>
            <input
              id="report-conf"
              type="range"
              min={0}
              max={100}
              value={minConf}
              onChange={(e) => setMinConf(Number(e.target.value))}
              className="w-32 md:w-44"
              style={{ "--fill": `${minConf}%` } as React.CSSProperties}
            />
            <span className="w-10 border border-[#22385c]/40 bg-white px-1.5 py-0.5 text-center font-mono text-[11px] font-bold tabular-nums text-[#22385c]">
              {minConf}%
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onExportGeojson}
              title="Download the findings as a GeoJSON FeatureCollection"
              className="inline-flex items-center gap-1.5 rounded-sm bg-[#22385c] px-3 py-1.5 font-serif text-xs font-bold uppercase tracking-wide text-[#f6f1e7] transition hover:bg-[#1b2a4a]"
            >
              <Braces size={13} /> Export GeoJSON
            </button>
            <button
              onClick={() =>
                downloadText("oceanscan_hazard_report.csv", toCsv(targets), "text/csv")
              }
              title="Download a spreadsheet of all findings"
              className="inline-flex items-center gap-1.5 rounded-sm border-2 border-[#22385c]/60 bg-transparent px-3 py-1.5 font-serif text-xs font-bold uppercase tracking-wide text-[#22385c] transition hover:bg-[#efe6cf]"
            >
              <FileDown size={13} /> CSV Report
            </button>
            <button
              onClick={onRetrievalPath}
              title="Plan an ROV route that visits the objects in priority order"
              className="inline-flex items-center gap-1.5 rounded-sm border-2 border-[#b03a2e] bg-transparent px-3 py-1.5 font-serif text-xs font-bold uppercase tracking-wide text-[#b03a2e] transition hover:bg-[#b03a2e] hover:text-[#f6f1e7]"
            >
              <Route size={13} /> Retrieval Path
            </button>
          </div>
        </div>

        <MarineSurveyTable
          data={visible.map(toAnomaly)}
          selectedId={selectedId ?? undefined}
          onSelectTarget={onSelect}
        />

        {visible.length === 0 && (
          <p className="border-t border-[#22385c]/20 px-4 py-8 text-center font-serif text-sm italic text-[#8a8574]">
            No objects above {minConf}% confidence — lower the slider.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t-2 border-[#22385c]/20 bg-[#efe6cf]/40 px-4 py-2 font-mono text-[10px] text-[#6b5d3f]">
          <span className="uppercase tracking-wider">
            Showing {visible.length} / {targets.length} contacts
          </span>
          <span>AI model v2.4.1 · INT8 edge inference</span>
        </div>
      </section>

      <p className="flex items-start gap-2 rounded-sm border border-[#8a6d1f]/50 bg-[#8a6d1f]/[0.08] p-3 font-serif text-xs italic leading-relaxed text-[#6b5433]">
        <TriangleAlert size={14} className="mt-0.5 shrink-0 not-italic" />
        Simulated dataset for demonstration — coordinates and contacts are illustrative.
        High-severity contacts should be verified by ROV before recovery operations.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  decimals = 0,
  suffix,
  staticValue,
  tone,
  icon,
}: {
  label: string;
  value?: number;
  decimals?: number;
  suffix?: string;
  staticValue?: string;
  tone?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="border-2 border-[#22385c] bg-[#fdfbf6] p-4 shadow-none">
      <p className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-[#8a8574]">
        {icon}
        {label}
      </p>
      <p className={`mt-1.5 font-serif text-2xl font-bold tabular-nums ${tone ?? "text-[#1b2a4a]"}`}>
        {staticValue ?? (
          <>
            <NumberTicker value={value ?? 0} decimals={decimals} />
            {suffix}
          </>
        )}
      </p>
    </div>
  );
}
