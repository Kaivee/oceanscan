"use client";

import { useMemo, useState } from "react";
import { TRAJECTORY, printBrief, type Priority, type SampleSurvey, type SonarTarget } from "@/lib/targets";

const W = 340;
const H = 200;
const PAD = 20;

function priorityBadge(p: Priority) {
  if (p === "P1")
    return {
      background: "var(--signal)",
      color: "#FFFFFF",
      border: "1px solid var(--signal)",
    };
  if (p === "P2")
    return {
      background: "var(--signal-dim)",
      color: "var(--ink)",
      border: "1px solid var(--signal)",
    };
  return {
    background: "transparent",
    color: "var(--ink)",
    border: "1px solid var(--line-strong)",
  };
}

function BriefThumb({ t }: { t: SonarTarget }) {
  return (
    <div className="flex h-20 w-24 flex-col justify-between border"
      style={{ borderColor: "var(--line-strong)", background: "var(--surface-2)" }}>
      <div className="h-1.5 w-full" style={{ background: t.priority === "P1" ? "var(--signal)" : t.priority === "P2" ? "var(--signal-dim)" : "var(--line-strong)" }} />
      <div className="flex h-10 items-center justify-center">
        <svg width="52" height="30" viewBox="0 0 52 30" aria-hidden="true">
          <rect x="4" y="6" width="18" height="9" fill="#141414" opacity="0.55" />
          <rect x="28" y="14" width="14" height="8" fill="#FF5A1F" opacity="0.6" />
          <line x1="46" y1="4" x2="46" y2="26" stroke="#141414" strokeWidth="1" strokeDasharray="3 3" />
        </svg>
      </div>
    </div>
  );
}

function MiniMap({ targets }: { targets: SonarTarget[] }) {
  const tlats = targets.map((t) => t.lat);
  const tlons = targets.map((t) => t.lon);
  const cLat = targets.length ? (Math.min(...tlats) + Math.max(...tlats)) / 2 : TRAJECTORY[0][0];
  const cLon = targets.length ? (Math.min(...tlons) + Math.max(...tlons)) / 2 : TRAJECTORY[0][1];
  const spanLat = targets.length ? Math.max(...tlats) - Math.min(...tlats) : 0;
  const spanLon = targets.length ? Math.max(...tlons) - Math.min(...tlons) : 0;
  const halfLat = Math.max(spanLat * 0.6, 0.0012);
  const halfLon = Math.max(spanLon * 0.6, 0.0012);
  const minLat = cLat - halfLat;
  const maxLat = cLat + halfLat;
  const minLon = cLon - halfLon;
  const maxLon = cLon + halfLon;
  const proj = (la: number, lo: number) => ({
    x: PAD + ((lo - minLon) / (maxLon - minLon)) * (W - 2 * PAD),
    y: PAD + ((maxLat - la) / (maxLat - minLat)) * (H - 2 * PAD),
  });
  const path = TRAJECTORY.map(([la, lo], i) => {
    const p = proj(la, lo);
    return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      <rect width={W} height={H} fill="var(--surface-2)" />
      {TRAJECTORY.length > 0 && targets.length > 0 &&
        TRAJECTORY.filter(([la, lo]) => la >= minLat && la <= maxLat && lo >= minLon && lo <= maxLon)
          .length > 0 && (
          <path d={path} fill="none" stroke="#141414" strokeWidth="1.2" opacity="0.8" />
        )}
      {targets.map((t) => {
        const p = proj(t.lat, t.lon);
        return <circle key={t.id} cx={p.x} cy={p.y} r="4" fill="var(--signal)" stroke="#141414" strokeWidth="0.8" />;
      })}
    </svg>
  );
}

interface BriefViewProps {
  survey: SampleSurvey;
  targets: SonarTarget[];
}

export default function BriefView({ survey, targets }: BriefViewProps) {
  const ordered = useMemo(() => {
    const rank: Record<Priority, number> = { P1: 0, P2: 1, P3: 2 };
    return [...targets].sort((a, b) => rank[a.priority] - rank[b.priority] || b.confidence - a.confidence);
  }, [targets]);

  const [dispatchState, setDispatchState] = useState<"idle" | "sending" | "sent">("idle");

  const dispatchToFieldTeam = () => {
    setDispatchState("sending");
    const lines = ordered
      .map(
        (t, i) =>
          `${String(i + 1).padStart(2, "0")} | ${t.id} · ${t.class} | ${t.priority} | ${Math.round(t.confidence * 100)}% | ${t.lat.toFixed(4)}, ${t.lon.toFixed(4)} | ${t.fieldAction}`,
      )
      .join("\n");
    const subject = encodeURIComponent(`[OceanScan] Field Dispatch — Survey ${survey.id}`);
    const body = encodeURIComponent(
      `SURVEY ${survey.id} · ${survey.file} · GENERATED ${survey.generated}\n${survey.area}\n\nRECOVERY ORDER\n${lines}\n\nDispatch prepared by OceanScan edge inference.`,
    );
    setTimeout(() => {
      setDispatchState("sent");
      window.location.href = `mailto:field@oceanscan.io?subject=${subject}&body=${body}`;
      setTimeout(() => setDispatchState("idle"), 4000);
    }, 700);
  };

  return (
    <div className="flex justify-center py-6">
      <div className="w-full max-w-[720px]" style={{ background: "var(--surface)", border: "1px solid var(--ink)", padding: "40px 44px" }}>
        {/* Header */}
        <div className="flex items-start justify-between" style={{ borderBottom: "1px solid var(--ink)", paddingBottom: "18px" }}>
          <div>
            <h1 style={{ fontFamily: "var(--f-display)", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.01em", color: "var(--ink)" }}>
              Cleanup Mission Brief
            </h1>
            <p style={{ fontFamily: "var(--f-mono)", fontSize: "11px", color: "var(--ink-soft)", marginTop: "8px" }}>
              SURVEY {survey.id} · {survey.file} · GENERATED {survey.generated}
            </p>
          </div>
          <div style={{ fontFamily: "var(--f-mono)", fontSize: "10px", color: "var(--ink-soft)", textAlign: "right" }}>
            {survey.area}
            <br />
            {survey.coordinates}
          </div>
        </div>

        {/* Mini trajectory map */}
        <div className="mt-6" style={{ border: "1px solid var(--line)" }}>
          <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--line)", fontFamily: "var(--f-mono)", fontSize: "10px", letterSpacing: "0.1em", color: "var(--ink-soft)" }}>
            SURVEY TRAJECTORY
          </div>
          <MiniMap targets={targets} />
        </div>

        {/* Numbered action items */}
        <div className="mt-8" style={{ border: "1px solid var(--ink)" }}>
          <div className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--ink)", fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "14px", color: "var(--ink)" }}>
            Action Items
          </div>
          {ordered.map((t, i) => {
            const badge = priorityBadge(t.priority);
            const num = String(i + 1).padStart(2, "0");
            return (
              <div key={t.id} style={{ borderBottom: i === ordered.length - 1 ? "none" : "1px solid var(--line)", padding: "18px" }}>
                <div className="flex items-start gap-4">
                  <span style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "20px", color: "var(--signal)", lineHeight: 1 }}>
                    {num}
                  </span>
                  <div className="flex gap-4">
                    <BriefThumb t={t} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: "15px", color: "var(--ink)" }}>
                          {t.class}
                        </span>
                        <span style={{ padding: "2px 9px", fontFamily: "var(--f-mono)", fontSize: "11px", fontWeight: 700, ...badge }}>
                          {t.priority}
                        </span>
                      </div>
                      <div className="mt-2" style={{ fontFamily: "var(--f-mono)", fontSize: "11px", color: "var(--ink)" }}>
                        {Math.round(t.confidence * 100)}% confidence · {t.lat.toFixed(4)}, {t.lon.toFixed(4)} · {t.dims.length.toFixed(1)} × {t.dims.width.toFixed(1)} m
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 pl-16" style={{ borderLeft: "2px solid var(--signal)", paddingLeft: "12px", fontFamily: "var(--f-mono)", fontSize: "12px", color: "var(--ink)" }}>
                  {t.fieldAction}
                </p>
              </div>
            );
          })}
        </div>

        {/* Action controls */}
        <div className="mt-8 flex" style={{ gap: "12px" }}>
          <button
            onClick={() => printBrief(ordered, survey)}
            className="flex-1"
            style={{ background: "var(--signal)", border: "1px solid var(--signal)", color: "#FFFFFF", fontWeight: 600, padding: "12px 20px", fontFamily: "var(--f-mono)", fontSize: "13px", cursor: "pointer" }}
          >
            Export PDF Brief
          </button>
          <button
            onClick={dispatchToFieldTeam}
            disabled={dispatchState === "sending"}
            className="flex-1"
            style={{
              background: dispatchState === "sent" ? "var(--signal-dim)" : "transparent",
              border: dispatchState === "sent" ? "1px solid var(--signal)" : "1px solid var(--ink)",
              color: "var(--ink)",
              padding: "12px 20px",
              fontFamily: "var(--f-mono)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {dispatchState === "sending"
              ? "Dispatching…"
              : dispatchState === "sent"
                ? "Dispatched to field team ✓"
                : "Send to Field Team"}
          </button>
        </div>
      </div>
    </div>
  );
}
