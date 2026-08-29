"use client";

import { useState } from "react";
import { Braces, Check, FileDown, FileText, Route, Table } from "lucide-react";
import { EmptyState } from "@/components/analyze-tab-empty";
import { NumberTicker } from "@/components/marine-ui";
import SonarCropThumb from "@/components/sonar-crop-thumb";
import { downloadText, printSurveySheet, toCsv, type SonarTarget, type DetectionStatus } from "@/lib/targets";

interface ReportTabProps {
  targets: (SonarTarget & { detectionStatus: DetectionStatus })[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onExportGeojson: () => void;
  onRetrievalPath: () => void;
  onGoAcquire: () => void;
  uploadedImageCount: number;
}

export default function ReportTab({
  targets,
  selectedId,
  onSelect,
  onExportGeojson,
  onRetrievalPath,
  onGoAcquire,
  uploadedImageCount,
}: ReportTabProps) {
  const [minConf, setMinConf] = useState(0);
  const [vessel, setVessel] = useState("MSV SAGAR-DHWANI");
  const [sensor, setSensor] = useState("900 kHz Side-Scan Sonar");
  const [surveyId, setSurveyId] = useState("GOA_SURVEY_L04");

  if (targets.length === 0) {
    return (
      <EmptyState
        icon={<Table size={24} />}
        title="No findings to report yet"
        body="Once a scan has run, every detected object is listed here with export options."
        cta="Go to Acquire"
        onCta={onGoAcquire}
      />
    );
  }

  const visible = targets.filter((t) => t.confidence * 100 >= minConf);
  const highCount = targets.filter((t) => t.severity === "high").length;
  const confirmedCount = targets.filter((t) => t.detectionStatus === "confirmed").length;
  const falsePositiveCount = targets.filter((t) => t.detectionStatus === "false_positive").length;

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
        <div className="border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px]">
            <span className="text-[var(--color-ocean-muted)]">Vessel:</span>
            <input
              value={vessel}
              onChange={(e) => setVessel(e.target.value)}
              className="w-48 border-b border-[var(--color-ocean-border)] bg-transparent text-[var(--color-ocean-text)] focus:border-[var(--color-ocean-sky)] focus:outline-none"
            />
            <span className="text-[var(--color-ocean-muted)]">Sensor:</span>
            <input
              value={sensor}
              onChange={(e) => setSensor(e.target.value)}
              className="w-56 border-b border-[var(--color-ocean-border)] bg-transparent text-[var(--color-ocean-text)] focus:border-[var(--color-ocean-sky)] focus:outline-none"
            />
            <span className="text-[var(--color-ocean-muted)]">Datum:</span>
            <span className="text-[var(--color-ocean-sky)]">WGS-84</span>
            <span className="text-[var(--color-ocean-muted)]">Survey:</span>
            <input
              value={surveyId}
              onChange={(e) => setSurveyId(e.target.value)}
              className="w-36 border-b border-[var(--color-ocean-border)] bg-transparent text-[var(--color-ocean-sky)] focus:border-[var(--color-ocean-sky)] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-[var(--color-ocean-border)] md:grid-cols-5">
          <StatCard label="Contacts found" value={targets.length} />
          <StatCard
            label="High risk"
            value={highCount}
            tone="text-[var(--color-ocean-red)]"
          />
          <StatCard label="Confirmed" value={confirmedCount} tone="text-emerald-400" />
          <StatCard label="False positives" value={falsePositiveCount} tone="text-red-400" />
          <StatCard label="Images scanned" value={uploadedImageCount} />
        </div>
      </section>

      <section className="overflow-hidden rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
          <div className="mr-auto min-w-0">
            <h2 className="font-mono text-xs font-bold text-[var(--color-ocean-text)]">HAZARD FINDINGS REGISTER</h2>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-ocean-muted)]">
              Click a row to select · filter weak matches below
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <label
              htmlFor="report-conf"
              className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--color-ocean-muted)]"
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
              className="w-28 md:w-40"
              style={{ "--fill": `${minConf}%` } as React.CSSProperties}
            />
            <span className="w-10 border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-1.5 py-0.5 text-center font-mono text-[10px] font-bold tabular-nums text-[var(--color-ocean-sky)]">
              {minConf}%
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() =>
                printSurveySheet(targets, { vessel, surveyId, sensor })
              }
              title="Open a printable survey sheet (save as PDF)"
              className="inline-flex items-center gap-1.5 rounded-sm bg-[#3709A5] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-[#4a12c9]"
            >
              <FileText size={12} /> Download PDF Survey Sheet
            </button>
            <button
              onClick={onExportGeojson}
              title="Download the findings as a GeoJSON FeatureCollection"
              className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-ocean-text)] transition hover:bg-[var(--color-ocean-card)]"
            >
              <Braces size={12} /> Export GeoJSON Waypoints
            </button>
            <button
              onClick={() =>
                downloadText("oceanscan_hazard_report.csv", toCsv(targets), "text/csv")
              }
              title="Download a spreadsheet of all findings"
              className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-ocean-text)] transition hover:bg-[var(--color-ocean-card)]"
            >
              <FileDown size={12} /> CSV Report
            </button>
            <button
              onClick={onRetrievalPath}
              title="Plan an ROV route that visits the objects in priority order"
              className="inline-flex items-center gap-1.5 rounded-sm border border-red-500/60 bg-red-500/15 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-500/25"
            >
              <Route size={12} /> Retrieval Path
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[10px]">
            <thead>
              <tr className="border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] text-[var(--color-ocean-muted)] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Target</th>
                <th className="px-4 py-2 text-left">Class</th>
                <th className="px-4 py-2 text-left">Conf</th>
                <th className="px-4 py-2 text-left">Lat</th>
                <th className="px-4 py-2 text-left">Lon</th>
                <th className="px-4 py-2 text-left">Depth</th>
                <th className="px-4 py-2 text-left">Severity</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-ocean-border)]">
              {visible.map((t) => {
                const statusColors: Record<DetectionStatus, string> = {
                  confirmed: "text-emerald-400",
                  false_positive: "text-red-400",
                  pending: "text-[var(--color-ocean-muted)]",
                };
                const statusLabels: Record<DetectionStatus, string> = {
                  confirmed: "VERIFIED // NAVAL OP",
                  false_positive: "False +",
                  pending: "Pending",
                };
                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={`cursor-pointer transition-colors ${
                      t.id === selectedId
                        ? "bg-[var(--color-ocean-surface)]"
                        : "hover:bg-[var(--color-ocean-surface)]/50"
                    }`}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <SonarCropThumb target={t} size={48} />
                        <div className="leading-tight">
                          <span className="block font-mono text-[10px] font-bold text-[var(--color-ocean-sky)]">{t.id}</span>
                          <span className="block font-mono text-[8px] tabular-nums text-[var(--color-ocean-muted)]">
                            {t.lat.toFixed(4)}°N · {t.lon.toFixed(4)}°E
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-[var(--color-ocean-text)]">{t.label}</td>
                    <td className="px-4 py-2 tabular-nums text-[var(--color-ocean-text)]">{Math.round(t.confidence * 100)}%</td>
                    <td className="px-4 py-2 tabular-nums text-[var(--color-ocean-text)]">{t.lat.toFixed(4)}</td>
                    <td className="px-4 py-2 tabular-nums text-[var(--color-ocean-text)]">{t.lon.toFixed(4)}</td>
                    <td className="px-4 py-2 tabular-nums text-[var(--color-ocean-text)]">{t.depthM}m</td>
                    <td className="px-4 py-2">
                      <span
                        className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold"
                        style={{
                          backgroundColor: t.severity === "high" ? "rgba(239,68,68,0.15)" : t.severity === "medium" ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
                          color: t.severity === "high" ? "#EF4444" : t.severity === "medium" ? "#F59E0B" : "#10B981",
                        }}
                      >
                        {t.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className={`px-4 py-2 font-bold ${statusColors[t.detectionStatus]}`}>
                      <span className="flex items-center gap-1.5">
                        {t.detectionStatus === "confirmed" && <Check size={11} strokeWidth={3} className="text-emerald-400" />}
                        {statusLabels[t.detectionStatus]}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-2 text-[var(--color-ocean-muted)]">
                      {t.note || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {visible.length === 0 && (
          <p className="border-t border-[var(--color-ocean-border)] px-4 py-8 text-center font-mono text-[11px] text-[var(--color-ocean-muted)]">
            No objects above {minConf}% confidence — lower the slider.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)]/50 px-4 py-2 font-mono text-[9px] text-[var(--color-ocean-muted)]">
          <span className="uppercase tracking-wider">
            Showing {visible.length} / {targets.length} contacts
          </span>
          <span>AI model v3.0.0 · TensorRT INT8 edge inference</span>
        </div>
      </section>

      <p className="text-[11px] text-[#6B6280]">
        Simulated dataset for demonstration — coordinates/contacts illustrative. High-severity contacts must be verified by ROV before recovery.
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
    <div className="bg-[var(--color-ocean-card)] p-4">
      <p className="flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-widest text-[var(--color-ocean-muted)]">
        {icon}
        {label}
      </p>
      <p className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${tone ?? "text-[var(--color-ocean-text)]"}`}>
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
