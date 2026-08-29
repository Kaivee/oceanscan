"use client";

import { useMemo, useState } from "react";
import { Anchor, Braces, Check, FileDown, FileText, MapPin, Route, Ship } from "lucide-react";
import { EmptyState } from "@/components/analyze-tab-empty";
import SonarCropThumb from "@/components/sonar-crop-thumb";
import RadialGainDial from "@/components/radial-gain-dial";
import {
  downloadText,
  printSurveySheet,
  toCsv,
  TRAJECTORY,
  SEVERITY_META,
  type SonarTarget,
  type DetectionStatus,
} from "@/lib/targets";

interface ReportTabProps {
  targets: (SonarTarget & { detectionStatus: DetectionStatus })[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onExportGeojson: () => void;
  onRetrievalPath: () => void;
  onGoAcquire: () => void;
  uploadedImageCount: number;
}

const STATUS_LABEL: Record<DetectionStatus, { label: string; cls: string }> = {
  confirmed: { label: "VERIFIED // NAVAL OP", cls: "text-[#8BE9FD]" },
  false_positive: { label: "FALSE +", cls: "text-[#FF5555]" },
  pending: { label: "PENDING REVIEW", cls: "text-[#7D8590]" },
};

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
  const [vessel, setVessel] = useState("R/V Megan Miller");
  const [sensor, setSensor] = useState("Klein System 3000 · 100/500 kHz");
  const [surveyId, setSurveyId] = useState("USGS_07011_MV");
  const [dispatchId, setDispatchId] = useState("DSP-07011-03");
  const [operator, setOperator] = useState("E. PENDLETON, USGS");

  const generatedAt = useMemo(() => {
    const d = new Date();
    return `${d.toISOString().slice(0, 10)} · ${d.toISOString().slice(11, 19)} UTC`;
  }, []);

  const geoBounds = useMemo(() => {
    if (targets.length === 0) return null;
    const lats = targets.map((t) => t.lat);
    const lons = targets.map((t) => t.lon);
    return {
      n: Math.max(...lats),
      s: Math.min(...lats),
      e: Math.max(...lons),
      w: Math.min(...lons),
    };
  }, [targets]);

  if (targets.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={24} />}
        title="No findings to dispatch"
        body="Once a scan has run, every detected object is compiled here into a formal survey sheet."
        cta="Go to Acquire"
        onCta={onGoAcquire}
      />
    );
  }

  const visible = targets.filter((t) => t.confidence * 100 >= minConf);
  const highCount = targets.filter((t) => t.severity === "high").length;
  const mediumCount = targets.filter((t) => t.severity === "medium").length;
  const lowCount = targets.filter((t) => t.severity === "low").length;
  const confirmedCount = targets.filter((t) => t.detectionStatus === "confirmed").length;

  return (
    <div className="space-y-3">
      {/* Sheet masthead */}
      <section className="chart-marks relative border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#7D8590]">
              Marine Survey Office · Recovery Dispatch
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-[#E6EDF3]">
              HYDROGRAPHIC DISPATCH WORKSHEET
            </h2>
          </div>
          <div className="ml-auto text-right">
            <p className="font-mono text-[10px] font-bold tabular-nums text-[#8BE9FD]">SHEET 1 OF 1</p>
            <p className="font-mono text-[8px] uppercase tracking-widest text-[#7D8590]">Compiled {generatedAt}</p>
          </div>
          <div className="rotate-2 border-2 border-[#FF5555] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#FF5555]">
            OFFICIAL RECORD
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-1 border-t-2 border-[#E6EDF3] pt-2 font-mono text-[9px] uppercase tracking-widest text-[#7D8590]">
          <span>Dispatch <strong className="text-[#E6EDF3]">{dispatchId}</strong></span>
          <span>Survey <strong className="text-[#E6EDF3]">{surveyId}</strong></span>
          <span>Vessel <strong className="text-[#E6EDF3]">{vessel}</strong></span>
          <span>Frames <strong className="text-[#E6EDF3]">{uploadedImageCount}</strong></span>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* GIS trackline & anomaly map */}
        <section className="min-w-0 overflow-hidden border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
          <div className="flex items-center gap-3 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
            <div className="mr-auto min-w-0">
              <h3 className="font-display text-sm font-semibold tracking-wide text-[#E6EDF3]">GIS TRACKLINE &amp; ANOMALY MAP</h3>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#7D8590]">
                survey trackline · anomaly pins · datum WGS-84
              </p>
            </div>
            {geoBounds && (
              <span className="hidden border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] px-2 py-1 font-mono text-[9px] tabular-nums text-[#7D8590] lg:block">
                BBOX N {geoBounds.n.toFixed(3)}° · S {geoBounds.s.toFixed(3)}° · E {Math.abs(geoBounds.e).toFixed(3)}°W · W {Math.abs(geoBounds.w).toFixed(3)}°W
              </span>
            )}
          </div>
          <TracklineMap targets={targets} selectedId={selectedId} onSelect={onSelect} />
        </section>

        {/* Header block — form fields */}
        <section className="border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
          <div className="border-b border-dashed border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
            <h3 className="font-mono text-[11px] font-bold tracking-wide text-[#E6EDF3]">DISPATCH HEADER BLOCK</h3>
            <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#7D8590]">operator sign-off · sensor metadata</p>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4">
            <FormField label="Dispatch ID" value={dispatchId} onChange={setDispatchId} width="w-full" />
            <FormField label="Survey ID" value={surveyId} onChange={setSurveyId} width="w-full" />
            <FormField label="Survey Vessel" value={vessel} onChange={setVessel} width="w-full" />
            <FormField label="Sensor Model" value={sensor} onChange={setSensor} width="w-full" />
            <FormField label="Operating Officer" value={operator} onChange={setOperator} width="w-full" withIcon={<Anchor size={10} />} />

            <div className="border border-[var(--color-ocean-border)] bg-[var(--color-ocean-canvas)] px-2.5 py-2">
              <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#7D8590]">Operator sign-off</p>
              <div className="mt-1.5 flex items-end gap-2">
                <span className="mb-[-4px] font-mono text-[10px] leading-none uppercase tracking-widest text-[#8BE9FD]">{operator}</span>
                <span className="flex-1 border-b border-[var(--color-ocean-border)]" />
              </div>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-widest text-[#7D8590]">
                {confirmedCount} of {targets.length} contacts human-verified
              </p>
            </div>

            <div className="mt-1 flex flex-col gap-2">
              <button
                onClick={() => printSurveySheet(targets, { vessel, surveyId, sensor })}
                className="flex w-full items-center justify-center gap-2 bg-[#8BE9FD] px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#0D1117] transition hover:bg-[#0E9BBF]"
              >
                <FileText size={13} /> Export PDF Survey Sheet
              </button>
              <button
                onClick={onExportGeojson}
                className="flex w-full items-center justify-center gap-2 border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#E6EDF3] transition hover:bg-[var(--color-ocean-card)]"
              >
                <Braces size={13} /> Download GeoJSON Waypoints
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => downloadText("oceanscan_hazard_report.csv", toCsv(targets), "text/csv")}
                  className="inline-flex items-center justify-center gap-1.5 border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#7D8590] transition hover:text-[#E6EDF3]"
                >
                  <FileDown size={12} /> CSV
                </button>
                <button
                  onClick={onRetrievalPath}
                  className="inline-flex items-center justify-center gap-1.5 border border-[#FF5555]/40 bg-[#FF5555]/5 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FF5555] transition hover:bg-[#FF5555]/10"
                >
                  <Route size={12} /> Retrieval Path
                </button>
              </div>
            </div>

            {geoBounds && (
              <p className="flex items-start gap-2 border-t border-dashed border-[var(--color-ocean-border)] pt-3 font-mono text-[9px] leading-relaxed text-[#7D8590]">
                <MapPin size={11} className="mt-0.5 shrink-0 text-[#8BE9FD]" />
                Geo-boundary N {geoBounds.n.toFixed(3)}° / S {geoBounds.s.toFixed(3)}° / E {Math.abs(geoBounds.e).toFixed(3)}°W / W {Math.abs(geoBounds.w).toFixed(3)}°W · WGS-84.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Classified Finding Registry */}
      <section className="overflow-hidden border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
          <div className="mr-auto min-w-0">
            <h3 className="font-display text-sm font-semibold tracking-wide text-[#E6EDF3]">CLASSIFIED FINDING REGISTRY</h3>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#7D8590]">
              {visible.length} / {targets.length} contacts · acoustic dimensions &amp; verification status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <RadialGainDial value={minConf} onChange={setMinConf} label="MIN CONF" size={78} />
            <div className="flex flex-col gap-1 font-mono text-[8px] uppercase tracking-widest">
              <span className="text-[#7D8590]">HIGH <b className="tabular-nums text-[#FF5555]">{highCount}</b></span>
              <span className="text-[#7D8590]">MED <b className="tabular-nums text-[#FFB86C]">{mediumCount}</b></span>
              <span className="text-[#7D8590]">LOW <b className="tabular-nums text-[#8BE9FD]">{lowCount}</b></span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[10px]">
            <thead>
              <tr className="border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] text-[#7D8590] uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Target</th>
                <th className="px-4 py-2 text-left">Class</th>
                <th className="px-4 py-2 text-left">Conf</th>
                <th className="px-4 py-2 text-left">Acoustic Dims (L×W)</th>
                <th className="px-4 py-2 text-left">Est. Depth</th>
                <th className="px-4 py-2 text-left">Position</th>
                <th className="px-4 py-2 text-left">Severity</th>
                <th className="px-4 py-2 text-left">Human Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-ocean-border)]">
              {visible.map((t) => {
                const meta = SEVERITY_META[t.severity];
                const st = STATUS_LABEL[t.detectionStatus];
                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={`cursor-pointer transition-colors ${
                      t.id === selectedId ? "bg-[var(--color-ocean-surface)]" : "hover:bg-[var(--color-ocean-surface)]/50"
                    }`}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <SonarCropThumb target={t} size={44} />
                        <div className="leading-tight">
                          <span className="block font-mono text-[10px] font-bold text-[#8BE9FD]">{t.id}</span>
                          <span className="block font-mono text-[8px] tabular-nums text-[#7D8590]">
                            {t.lat.toFixed(4)}°N · {Math.abs(t.lon).toFixed(4)}°W
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-[#E6EDF3]">{t.label}</td>
                    <td className="px-4 py-2 tabular-nums text-[#E6EDF3]">{Math.round(t.confidence * 100)}%</td>
                    <td className="px-4 py-2 tabular-nums text-[#E6EDF3]">
                      {t.dims.length.toFixed(1)} × {t.dims.width.toFixed(1)} m
                    </td>
                    <td className="px-4 py-2 tabular-nums text-[#E6EDF3]">{t.depthM} m</td>
                    <td className="px-4 py-2 tabular-nums text-[#7D8590]">
                      <MapPin size={10} className="mr-1 inline -translate-y-px text-[#8BE9FD]" />
                      {t.lat.toFixed(4)}, {t.lon.toFixed(4)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="border px-1.5 py-0.5 text-[9px] font-bold"
                        style={{ backgroundColor: meta.fill, color: meta.stroke, borderColor: `${meta.stroke}55` }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className={`px-4 py-2 font-bold ${st.cls}`}>
                      <span className="flex items-center gap-1.5">
                        {t.detectionStatus === "confirmed" && <Check size={11} strokeWidth={3} />}
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {visible.length === 0 && (
          <p className="border-t border-[var(--color-ocean-border)] px-4 py-8 text-center font-mono text-[11px] text-[#7D8590]">
            No objects above {minConf}% confidence — lower the gate dial.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)]/50 px-4 py-2 font-mono text-[9px] text-[#7D8590]">
          <span className="uppercase tracking-wider">Showing {visible.length} / {targets.length} contacts</span>
          <span>AI model v3.0.0 · TensorRT INT8 edge inference</span>
          <span className="ml-auto flex items-center gap-1.5">
            <Ship size={10} className="text-[#8BE9FD]" /> Survey {surveyId} · {vessel}
          </span>
        </div>
      </section>

      <p className="font-sans text-[11px] text-[#7D8590]">
        Based on USGS Open-File Report 2008-1288, sidescan survey 07011 off Martha&apos;s Vineyard, MA. Real WGS-84 positions; high-severity contacts must still be verified by ROV before recovery operations.
      </p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  width,
  withIcon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  width: string;
  withIcon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.18em] text-[#7D8590]">
        {withIcon}
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${width} border-b border-[var(--color-ocean-border)] bg-transparent py-1 font-mono text-[11px] text-[#E6EDF3] focus:border-[#8BE9FD] focus:outline-none`}
      />
    </label>
  );
}

function TracklineMap({
  targets,
  selectedId,
  onSelect,
}: {
  targets: (SonarTarget & { detectionStatus: DetectionStatus })[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const W = 420;
  const H = 280;
  const PAD = 26;

  const { xs, ys, proj, grid } = useMemo(() => {
    const lats = [...TRAJECTORY.map((p) => p[0]), ...targets.map((t) => t.lat)];
    const lons = [...TRAJECTORY.map((p) => p[1]), ...targets.map((t) => t.lon)];
    const minLat = Math.min(...lats) - 0.005;
    const maxLat = Math.max(...lats) + 0.005;
    const minLon = Math.min(...lons) - 0.005;
    const maxLon = Math.max(...lons) + 0.005;
    const proj = (lat: number, lon: number) => ({
      x: PAD + ((lon - minLon) / (maxLon - minLon)) * (W - 2 * PAD),
      y: PAD + ((maxLat - lat) / (maxLat - minLat)) * (H - 2 * PAD),
    });
    // Decimate the dense 1-minute GPS fixes so the survey path reads as a
    // clean lawnmower grid instead of a tangle of waypoint dots. Always keep
    // the final fix so the track terminates correctly.
    const step = Math.max(1, Math.floor(TRAJECTORY.length / 18));
    const thinned = TRAJECTORY.filter((_, i) => i % step === 0 || i === TRAJECTORY.length - 1);
    const xs = thinned.map(([la, lo]) => {
      const p = proj(la, lo);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    });
    const ys = targets.map((t) => proj(t.lat, t.lon));
    const grid = {
      lonTicks: [minLon, (minLon + maxLon) / 2, maxLon],
      latTicks: [minLat, (minLat + maxLat) / 2, maxLat],
      proj,
    };
    return { xs, ys, proj, grid };
  }, [targets]);

  return (
    <div className="relative bg-[var(--color-ocean-canvas)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" preserveAspectRatio="xMidYMid meet">
        {grid.lonTicks.map((lo) => (
          <g key={`lon-${lo.toFixed(4)}`}>
            <line
              x1={proj(0, lo).x}
              y1={PAD}
              x2={proj(0, lo).x}
              y2={H - PAD}
              stroke="rgba(139,233,253,0.08)"
              strokeWidth="1"
            />
            <text x={proj(0, lo).x} y={H - PAD + 12} textAnchor="middle" fontSize="7.5" fill="#7D8590" style={{ fontFamily: "monospace" }}>
              {Math.abs(lo).toFixed(3)}°W
            </text>
          </g>
        ))}
        {grid.latTicks.map((la) => (
          <g key={`lat-${la.toFixed(4)}`}>
            <line
              x1={PAD}
              y1={proj(la, 0).y}
              x2={W - PAD}
              y2={proj(la, 0).y}
              stroke="rgba(139,233,253,0.08)"
              strokeWidth="1"
            />
            <text x={PAD - 4} y={proj(la, 0).y + 2.5} textAnchor="end" fontSize="7.5" fill="#7D8590" style={{ fontFamily: "monospace" }}>
              {la.toFixed(3)}°N
            </text>
          </g>
        ))}

        <polyline points={xs.join(" ")} fill="none" stroke="#8BE9FD" strokeWidth="1" opacity="0.7" strokeDasharray="5 4" />
        {(() => {
          const s = TRAJECTORY[0];
          const p = proj(s[0], s[1]);
          return (
            <g>
              <circle cx={p.x} cy={p.y} r="3" fill="#8BE9FD" stroke="#FBFDFE" strokeWidth="1" />
              <text x={p.x + 5} y={p.y - 5} fontSize="7" fill="#8BE9FD" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                start
              </text>
            </g>
          );
        })()}

        {ys.map((p, i) => {
          const t = targets[i];
          const meta = SEVERITY_META[t.severity];
          const isSel = t.id === selectedId;
          return (
            <g key={t.id} onClick={() => onSelect(t.id)} className="cursor-pointer">
              {isSel && (
                <circle cx={p.x} cy={p.y} r="16" fill="none" stroke={meta.stroke} strokeWidth="1" strokeDasharray="3 3" className="pin-pulse" />
              )}
              <rect x={p.x - 4.5} y={p.y - 4.5} width="9" height="9" transform={`rotate(45 ${p.x} ${p.y})`} fill={meta.stroke} stroke="#FBFDFE" strokeWidth="1" />
              <text x={p.x + 9} y={p.y + 3} fontSize="8" fontWeight="700" fill={meta.stroke} style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                {t.id} {Math.round(t.confidence * 100)}%
              </text>
            </g>
          );
        })}

        {/* Scale bar + north arrow */}
        <g>
          <line x1={W - PAD - 70} y1={H - PAD - 8} x2={W - PAD} y2={H - PAD - 8} stroke="#E6EDF3" strokeWidth="2" />
          <text x={W - PAD - 35} y={H - PAD + 4} textAnchor="middle" fontSize="7" fill="#7D8590" style={{ fontFamily: "monospace" }}>
            1 KM
          </text>
          <g transform={`translate(${W - PAD - 14} ${PAD + 14})`}>
            <path d="M0 10 L0 -8 M-4 -3 L0 -10 L4 -3" fill="none" stroke="#E6EDF3" strokeWidth="1.4" />
            <text x="0" y={-13} textAnchor="middle" fontSize="7.5" fill="#E6EDF3" style={{ fontFamily: "monospace" }}>
              N
            </text>
          </g>
        </g>

        {/* Legend */}
        <g transform={`translate(${PAD + 4} ${H - PAD + 2})`} style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
          {(["high", "medium", "low"] as const).map((sev, i) => (
            <g key={sev} transform={`translate(${i * 78} 0)`}>
              <rect x="0" y="-6" width="8" height="8" transform="rotate(45 4 -2)" fill={SEVERITY_META[sev].stroke} />
              <text x="13" y="1.5" fontSize="8" fill="#7D8590">
                {SEVERITY_META[sev].label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}