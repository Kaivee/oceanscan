"use client";

import { useMemo, useState } from "react";
import SonarCanvas from "@/components/sonar-preview";
import { toCsv, toGeoJSON, downloadText, type SonarTarget, type ViewMode, type Priority } from "@/lib/targets";

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

/* Acoustic intensity model — a base seabed signal with a labelled spike
   raised at each detected object's horizontal position. */
const PROFILE_LEN = 64;
const DB_MIN = -60;
const DB_MAX = 0;

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function baseSignal(count: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const arr: number[] = [];
  let carry = 0.3;
  for (let i = 0; i < count; i++) {
    carry = 0.6 * carry + 0.4 * (0.2 + rand() * 0.4);
    arr.push(Math.max(0.08, Math.min(0.75, carry)));
  }
  return arr;
}

interface Spike {
  t: SonarTarget;
  col: number;
  v: number;
  color: string;
}

function buildSpikes(targets: SonarTarget[]): Spike[] {
  return targets.map((t) => {
    const col = Math.min(
      PROFILE_LEN - 1,
      Math.max(0, Math.floor(((t.box.x + t.box.w / 2) / 100) * PROFILE_LEN)),
    );
    const v = Math.min(1, 0.55 + t.confidence * 0.45);
    return {
      t,
      col,
      v,
      color: t.priority === "P2" ? "#E0912C" : "#141414",
    };
  });
}

/* Simple line graph of the acoustic profile. The Y axis spans DB_MIN..DB_MAX,
   the X axis is the across-track sample index (Port..Stbd), and a marker follows
   the cursor's horizontal position over the sonar frame above. */
function AcousticLineGraph({
  wave,
  spikes,
  cursorX,
}: {
  wave: number[];
  spikes: Spike[];
  cursorX: number | null;
}) {
  const H = 170;
  const TOP_PAD = 12;
  const BOT_PAD = 14;
  const toY = (v: number) => H - BOT_PAD - v * (H - TOP_PAD - BOT_PAD);
  const xPct = (i: number) => (i / (wave.length - 1)) * 100;
  const points = wave.map((v, i) => `${xPct(i)},${toY(v)}`).join(" ");

  // Wave value at the cursor's fractional x (interpolated).
  const [cursorY, cursorV] = (() => {
    if (cursorX === null) return [null, null] as const;
    const col = (cursorX / 100) * (wave.length - 1);
    const lo = Math.floor(col);
    const hi = Math.min(wave.length - 1, lo + 1);
    const frac = col - lo;
    const v = wave[lo] + (wave[hi] - wave[lo]) * frac;
    return [toY(v), v] as const;
  })();

  return (
    <div className="flex gap-3 px-4 py-4" style={{ background: "var(--surface-2)" }}>
      <div
        className="flex h-[170px] flex-col justify-between text-right"
        style={{ fontFamily: "var(--f-mono)", fontSize: "9px", color: "var(--ink-soft)", width: "34px" }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i}>{Math.round(DB_MAX - (i / 4) * (DB_MAX - DB_MIN))}</span>
        ))}
      </div>

      <div className="relative min-w-0 flex-1" style={{ borderLeft: "1px solid var(--line-strong)", borderBottom: "1px solid var(--line-strong)" }}>
        <svg
          className="block w-full"
          width="100%"
          height={H}
          viewBox={`0 0 100 ${H}`}
          preserveAspectRatio="none"
        >
        {/* horizontal gridlines */}
        {[25, 50, 75].map((p) => (
          <line
            key={p}
            x1="0"
            x2="100"
            y1={H - BOT_PAD - (p / 100) * (H - TOP_PAD - BOT_PAD)}
            y2={H - BOT_PAD - (p / 100) * (H - TOP_PAD - BOT_PAD)}
            stroke="var(--line)"
            strokeWidth="0.35"
            strokeDasharray="1.5 1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* area + line of the profile */}
        <polygon
          points={`0,${H - BOT_PAD} ${points} 100,${H - BOT_PAD}`}
          fill="var(--signal)"
          opacity="0.10"
        />
        <polyline
          points={points}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="0.7"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* spike dots — one per detected contact */}
        {spikes.map((s) => (
          <g key={s.t.id}>
            <circle
              cx={xPct(s.col)}
              cy={toY(s.v)}
              r="1.6"
              fill={s.color}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={xPct(s.col)}
              y={toY(s.v) - 4}
              textAnchor="middle"
              fontSize="2.6"
              fill="var(--ink)"
              vectorEffect="non-scaling-stroke"
              style={{ fontFamily: "var(--f-mono)", fontWeight: 700 }}
            >
              {s.t.id}
            </text>
          </g>
        ))}

        {/* cursor marker — follows the mouse over the frame above */}
        {cursorX !== null && cursorY !== null && (
          <g>
            <line
              x1={cursorX}
              x2={cursorX}
              y1="0"
              y2={H}
              stroke="var(--signal)"
              strokeWidth="0.5"
              opacity="0.85"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={cursorX}
              cy={cursorY}
              r="2"
              fill="var(--signal)"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}
      </svg>

      {cursorX !== null && cursorV !== null && (
        <div
          className="pointer-events-none absolute z-10"
          style={{
            left: `${cursorX}%`,
            top: 6,
            transform: "translateX(10px)",
            background: "var(--surface)",
            border: "1px solid var(--line-strong)",
            padding: "3px 7px",
            fontFamily: "var(--f-mono)",
            fontSize: "10px",
            color: "var(--ink)",
            whiteSpace: "nowrap",
          }}
        >
          {Math.round(DB_MIN + cursorV * (DB_MAX - DB_MIN))} dB
        </div>
      )}
      </div>
    </div>
  );
}

interface FrameViewProps {
  targets: SonarTarget[];
  onGoMap: () => void;
}

export default function FrameView({ targets, onGoMap }: FrameViewProps) {
  const [mode, setMode] = useState<ViewMode>("raw");
  const [showAttention, setShowAttention] = useState(false); // default OFF
  const [threshold, setThreshold] = useState(0);
  const [cursorX, setCursorX] = useState<number | null>(null); // cursor % across the stage
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  const shown = useMemo(
    () => targets.filter((t) => Math.round(t.confidence * 100) >= threshold),
    [targets, threshold],
  );

  // The real sonar image (uploaded, or the model-annotated sample frame).
  const sourceImage = useMemo(() => targets.find((t) => t.imageUrl)?.imageUrl, [targets]);
  const showRealImage = mode === "original" && !!sourceImage;

  // Acoustic profile: seabed signal + a labelled spike at each object.
  const spikes = useMemo(() => buildSpikes(targets), [targets]);
  const wave = useMemo(() => {
    const arr = baseSignal(PROFILE_LEN, 4242);
    spikes.forEach((s) => {
      for (let k = -1; k <= 1; k++) {
        const i = s.col + k;
        if (i >= 0 && i < arr.length) arr[i] = Math.max(arr[i], s.v);
      }
    });
    return arr;
  }, [spikes]);

  if (targets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p style={{ fontFamily: "var(--f-display)", fontSize: "22px", fontWeight: 700, color: "var(--ink)" }}>
          No survey frame loaded
        </p>
        <p className="mt-2 max-w-md" style={{ color: "var(--ink-soft)", fontSize: "14px" }}>
          Load a sonar log or a sample survey to run detection and inspect the frame.
        </p>
        <button
          onClick={onGoMap}
          className="mt-6"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--ink)",
            color: "var(--ink)",
            padding: "11px 22px",
            fontFamily: "var(--f-mono)",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Load a survey
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: "12px 16px" }}>
        <div className="flex" style={{ border: "1px solid var(--line-strong)" }}>
          {(["raw", "denoised", "original"] as ViewMode[]).map((m, i) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="uppercase"
              style={{
                padding: "8px 16px",
                fontSize: "12px",
                letterSpacing: "0.08em",
                fontFamily: "var(--f-mono)",
                fontWeight: 600,
                background: mode === m ? "var(--ink)" : "transparent",
                color: mode === m ? "#FFFFFF" : "var(--ink-soft)",
                borderLeft: i === 0 ? "none" : "1px solid var(--line-strong)",
                cursor: "pointer",
              }}
            >
              {m === "original" ? "Original" : m === "raw" ? "Raw" : "Denoised"}
            </button>
          ))}
          <button
            onClick={() => setShowAttention((v) => !v)}
            className="uppercase"
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              letterSpacing: "0.08em",
              fontFamily: "var(--f-mono)",
              fontWeight: 600,
              background: showAttention ? "var(--signal)" : "transparent",
              color: showAttention ? "#FFFFFF" : "var(--ink-soft)",
              borderLeft: "1px solid var(--line-strong)",
              cursor: "pointer",
            }}
          >
            Show Attention
          </button>
        </div>

        <div className="flex items-center gap-3 min-w-[240px]">
          <span style={{ fontFamily: "var(--f-mono)", fontSize: "11px", color: "var(--ink-soft)" }}>
            Confidence
          </span>
          <input
            type="range"
            min={0}
            max={99}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="flex-1"
            style={{ ["--fill" as string]: `${threshold}%` }}
          />
          <span style={{ fontFamily: "var(--f-mono)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
            ≥ {threshold}%
          </span>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: "11px", color: "var(--ink-soft)" }}>
            {shown.length} / {targets.length} shown
          </span>
        </div>
      </div>

        {/* Dual-channel sonar stage with HTML overlay boxes */}
        <div
          className="relative overflow-hidden"
          style={{ background: "var(--surface-2)", border: "1px solid var(--ink)" }}
        >
          {/* Channel labels */}
          <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-between px-5">
            <span className="uppercase" style={{ fontFamily: "var(--f-mono)", fontSize: "11px", letterSpacing: "0.14em", color: "var(--ink-soft)" }}>
              Port Channel
            </span>
            <span className="uppercase" style={{ fontFamily: "var(--f-mono)", fontSize: "11px", letterSpacing: "0.14em", color: "var(--ink-soft)" }}>
              Stbd Channel
            </span>
          </div>

        {/* Stage is sized to the real image's native aspect (no cropping), so the
            percentage-positioned boxes stay aligned and no objects are cut off.
            Portrait 320x480 sonar frames are vertical, so we cap the WIDTH (ratio-aware)
            to keep the stage height bounded instead of cropping the sides. */}
        <div
          className="relative w-full"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (rect.width > 0) setCursorX(((e.clientX - rect.left) / rect.width) * 100);
          }}
          onMouseLeave={() => setCursorX(null)}
          style={
            showRealImage && imgSize
              ? {
                  width: "100%",
                  minWidth: "380px",
                  maxWidth: `${Math.round(820 * (imgSize.w / imgSize.h))}px`,
                  margin: "0 auto",
                  aspectRatio: `${imgSize.w} / ${imgSize.h}`,
                  height: "auto",
                }
              : { height: "560px" }
          }
        >
          {showRealImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sourceImage}
              alt="Original sonar frame"
              onLoad={(e) => {
                const el = e.currentTarget;
                if (el.naturalWidth > 0) setImgSize({ w: el.naturalWidth, h: el.naturalHeight });
              }}
              className="absolute inset-0 h-full w-full"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <SonarCanvas mode={mode === "original" ? "raw" : mode} />
          )}

          {/* Detection overlays — HTML boxes, always on top and clearly visible */}
          <div className="pointer-events-none absolute inset-0 z-20">
            {targets.map((t) => {
              const dimmed = shown.indexOf(t) === -1;
              const stroke =
                t.priority === "P1" ? "#FF5A1F"
                : t.priority === "P2" ? "#3FA9FF"
                : "#18C8A8";
              const fill =
                t.priority === "P1" ? "rgba(255,90,31,0.10)"
                : t.priority === "P2" ? "rgba(63,169,255,0.08)"
                : "rgba(24,200,168,0.08)";
              return (
                <div
                  key={`box-${t.id}`}
                  className="absolute cursor-pointer"
                  style={{
                    left: `${t.box.x}%`,
                    top: `${t.box.y}%`,
                    width: `${t.box.w}%`,
                    height: `${t.box.h}%`,
                    opacity: dimmed ? 0.25 : 1,
                  }}
                >
                  {/* attention glow behind the box */}
                  {showAttention && (
                    <div
                      className="absolute"
                      style={{
                        inset: "-45%",
                        background: `radial-gradient(circle, ${stroke}F0 0%, ${stroke}44 45%, transparent 74%)`,
                        filter: "saturate(1.3)",
                      }}
                    />
                  )}

                  {/* region fill */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundColor: fill,
                    }}
                  />
                  {/* bold, high-contrast rectangle outline: solid colour border with a
                      white halo and a hard dark outer ring, so the box reads as a clear
                      rectangle on both bright sand and dark water-column. */}
                  <div
                    className="absolute inset-0"
                    style={{
                      border: `3px solid ${stroke}`,
                      borderStyle: "solid",
                      boxShadow:
                        "0 0 0 1.5px #FFFFFF, 0 0 0 4px rgba(0,0,0,0.9), 0 0 14px rgba(0,0,0,0.55)",
                    }}
                  />
                  {/* white inner key-line for crispness against dark content */}
                  <div
                    className="absolute"
                    style={{ inset: "5px", border: "1px solid rgba(255,255,255,0.7)" }}
                  />

                  {/* label chip (top-left), like the original version */}
                  <div
                    className="absolute whitespace-nowrap font-mono font-bold"
                    style={{
                      top: "-17px",
                      left: "-2px",
                      fontSize: "12px",
                      letterSpacing: "0.02em",
                      padding: "1px 6px",
                      color: stroke,
                      backgroundColor: "rgba(12,18,28,0.92)",
                      border: `1px solid ${stroke}55`,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                    }}
                  >
                    {t.id} · {Math.round(t.confidence * 100)}%
                  </div>
                </div>
              );
            })}

            {/* Cursor line — follows the mouse across the frame, drives the graph marker */}
            {cursorX !== null && (
              <div
                className="absolute z-30"
                style={{
                  left: `${cursorX}%`,
                  top: 0,
                  bottom: 0,
                  width: "1px",
                  background: "var(--signal)",
                  opacity: 0.9,
                }}
              />
            )}

            {/* Leader lines + right-margin labels */}
            {targets.map((t) => {
              const dimmed = shown.indexOf(t) === -1;
              const cy = t.box.y + t.box.h / 2;
              const rightEdge = t.box.x + t.box.w;
              const badge = priorityBadge(t.priority);
              return (
                <div key={`label-${t.id}`} className="absolute" style={{ top: `${cy}%`, left: 0, right: 0, height: 0, opacity: dimmed ? 0.18 : 1 }}>
                  <div
                    className="absolute"
                    style={{
                      left: `${rightEdge}%`,
                      right: 0,
                      top: 0,
                      height: "1px",
                      background: "var(--ink-soft)",
                      opacity: 0.5,
                    }}
                  />
                  <div
                    className="absolute"
                    style={{
                      right: "8px",
                      top: 0,
                      transform: "translateY(-45%)",
                      textAlign: "right",
                      background: "rgba(255,255,255,0.94)",
                      border: "1px solid var(--line-strong)",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.35)",
                      padding: "5px 9px",
                    }}
                  >
                    <div style={{ fontFamily: "var(--f-mono)", fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
                      {t.id} · {t.class}
                    </div>
                    <div style={{ fontFamily: "var(--f-mono)", fontSize: "10px", color: "var(--ink-soft)" }}>
                      {Math.round(t.confidence * 100)}% Conf · {t.lat.toFixed(4)}, {t.lon.toFixed(4)}
                    </div>
                    <div className="inline-block" style={{ padding: "2px 9px", marginTop: "3px", fontFamily: "var(--f-mono)", fontSize: "11px", fontWeight: 700, ...badge }}>
                      {t.priority}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between px-4 py-2" style={{ borderTop: "1px solid var(--line)" }}>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: "10px", color: "var(--ink-soft)" }}>
            ARIS3K-9 · SIDE-SCAN WATERFALL · WGS-84
          </span>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: "10px", color: "var(--ink-soft)" }}>
            {mode === "original" ? "ORIGINAL IMAGE" : mode === "denoised" ? "DENOISED" : "RAW"}
          </span>
        </div>
      </div>

      {/* Acoustic intensity profile — simple line graph, cursor-linked to the frame */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--ink)" }}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--line)" }}>
          <span className="uppercase" style={{ fontFamily: "var(--f-mono)", fontSize: "10px", letterSpacing: "0.12em", color: "var(--ink-soft)" }}>
            Acoustic Intensity (dB)
          </span>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: "11px", color: "var(--ink-soft)" }}>
            {targets.length} contact{targets.length !== 1 ? "s" : ""}
          </span>
        </div>

        <AcousticLineGraph wave={wave} spikes={spikes} cursorX={cursorX} />
      </div>

      {/* Detection report table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--ink)" }}>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--ink)" }}>
          <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "15px", color: "var(--ink)" }}>
            Detection Report
          </h3>
          <div className="flex" style={{ gap: "10px" }}>
            <button
              onClick={() => downloadText("oceanscan_detections.csv", toCsv(shown), "text/csv")}
              style={{ border: "1px solid var(--line-strong)", color: "var(--ink)", padding: "8px 15px", fontFamily: "var(--f-mono)", fontSize: "12px", cursor: "pointer" }}
            >
              Export CSV
            </button>
            <button
              onClick={() => downloadText("oceanscan_detections.json", JSON.stringify(toGeoJSON(shown), null, 2), "application/json")}
              style={{ border: "1px solid var(--line-strong)", color: "var(--ink)", padding: "8px 15px", fontFamily: "var(--f-mono)", fontSize: "12px", cursor: "pointer" }}
            >
              Export JSON
            </button>
          </div>
        </div>

        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              {["ID", "Class", "Conf.", "Priority", "Lat", "Lon"].map((h) => (
                <th key={h} className="text-left uppercase" style={{ padding: "10px 16px", fontFamily: "var(--f-mono)", fontSize: "10px", letterSpacing: "0.1em", color: "var(--ink-soft)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => {
              const badge = priorityBadge(t.priority);
              const dim = Math.round(t.confidence * 100) < threshold;
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--line)", opacity: dim ? 0.32 : 1 }}>
                  <td style={{ padding: "11px 16px", fontFamily: "var(--f-mono)", fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
                    {t.id}
                  </td>
                  <td style={{ padding: "11px 16px", fontFamily: "var(--f-mono)", fontSize: "12px", color: "var(--ink)" }}>
                    {t.class}
                  </td>
                  <td style={{ padding: "11px 16px", fontFamily: "var(--f-mono)", fontSize: "12px", color: "var(--ink)" }}>
                    {Math.round(t.confidence * 100)}%
                  </td>
                  <td style={{ padding: "11px 16px" }}>
                    <span style={{ padding: "2px 9px", fontFamily: "var(--f-mono)", fontSize: "11px", fontWeight: 700, ...badge }}>
                      {t.priority}
                    </span>
                  </td>
                  <td style={{ padding: "11px 16px", fontFamily: "var(--f-mono)", fontSize: "12px", color: "var(--ink)" }}>
                    {t.lat.toFixed(4)}
                  </td>
                  <td style={{ padding: "11px 16px", fontFamily: "var(--f-mono)", fontSize: "12px", color: "var(--ink)" }}>
                    {t.lon.toFixed(4)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="px-4 py-8 text-center" style={{ fontFamily: "var(--f-mono)", fontSize: "12px", color: "var(--ink-soft)" }}>
            No detections above the {threshold}% threshold.
          </p>
        )}
      </div>
    </div>
  );
}
