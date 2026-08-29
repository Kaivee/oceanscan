"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CircleCheck,
  Cpu,
  FileText,
  Radar,
  RotateCcw,
  ScanLine,
  Ship,
  Waves,
} from "lucide-react";
import { SEVERITY_META, TARGETS, formatBytes, type SonarTarget } from "@/lib/targets";
import { NumberTicker } from "@/components/marine-ui";
import SonarPreview from "@/components/sonar-preview";
import RadialGainDial from "@/components/radial-gain-dial";
import type { PendingUpload } from "@/app/page";

const CANVAS_W = 1200;
const CANVAS_H = 800;
const SCAN_DURATION_MS = 7000;   // demo sweep
const INGEST_DURATION_MS = 6500; // file waterfall parse

function uploadKey(u: PendingUpload | null) {
  return u ? `${u.fileName}|${u.imageUrl}` : null;
}

interface LogEntry {
  key: number;
  time: string;
  target: SonarTarget;
}

interface AcquireTabProps {
  onReveal: (id: string) => void;
  onComplete: () => void;
  onReset: () => void;
  onGoAnalyze: () => void;
  pendingUpload: PendingUpload | null;
}

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

function paintSeabed(ctx: CanvasRenderingContext2D) {
  const rand = mulberry32(1337);
  const W = CANVAS_W;
  const H = CANVAS_H;

  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, "#081220");
  base.addColorStop(0.5, "#0B1726");
  base.addColorStop(1, "#060D1A");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 30;
    const rip = Math.sin((i / 4) % W / 28 + Math.sin((i / 4 / W) * 8) * 2.2) * 4;
    d[i] = Math.max(0, Math.min(255, d[i] + n + rip * 0.7));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n + rip * 0.9));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n + rip));
  }
  ctx.putImageData(img, 0, 0);

  ctx.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) {
    const y0 = rand() * H;
    const amp = 5 + rand() * 14;
    const wl = 100 + rand() * 150;
    const phase = rand() * Math.PI * 2;
    ctx.strokeStyle = `rgba(95,212,196,${0.025 + rand() * 0.04})`;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 14) {
      const y = y0 + Math.sin((x / wl) * Math.PI * 2 + phase) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 8; i++) {
    const cx = rand() * W;
    const cy = rand() * H;
    const rx = 30 + rand() * 70;
    const ry = 16 + rand() * 38;
    const ang = rand() * Math.PI;

    const shX = cx + Math.cos(ang) * rx * 1.5;
    const shY = cy + Math.sin(ang) * ry * 1.5;
    const shadow = ctx.createRadialGradient(shX, shY, 4, shX, shY, rx * 1.7);
    shadow.addColorStop(0, "rgba(2,4,8,0.5)");
    shadow.addColorStop(1, "rgba(2,4,8,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(shX, shY, rx * 1.7, ry * 1.7, ang, 0, Math.PI * 2);
    ctx.fill();

    const rock = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 2, cx, cy, rx);
    rock.addColorStop(0, "rgba(95,212,196,0.3)");
    rock.addColorStop(1, "rgba(8,20,32,0)");
    ctx.fillStyle = rock;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, ang, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 22; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 1 + rand() * 2.2;
    ctx.fillStyle = `rgba(148,210,245,${0.2 + rand() * 0.28})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(2,4,8,0.35)";
    ctx.beginPath();
    ctx.ellipse(x + r * 2.8, y + 1, r * 3, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, W * 0.68);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(2,4,8,0.7)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function fmtClock(totalSec: number) {
  const h = Math.floor(totalSec / 3600) % 24;
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export default function AcquireTab({ onReveal, onComplete, onReset, onGoAnalyze, pendingUpload }: AcquireTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [revealedRun, setRevealedRun] = useState<string[]>([]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [confidenceFilter, setConfidenceFilter] = useState(50);
  const [claheEnabled, setClaheEnabled] = useState(true);
  const [logSel, setLogSel] = useState<string | null>(null);
  const logRef = useRef<HTMLUListElement>(null);
  const currentUploadRef = useRef<string | null>(null);

  useEffect(() => {
    const key = uploadKey(pendingUpload);
    if (key === currentUploadRef.current) return;
    currentUploadRef.current = key;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    offscreenRef.current = null;
    setRunning(false);
    setDone(false);
    setProgress(0);
    setLog([]);
    setRevealedRun([]);
  }, [pendingUpload]);

  const uploadTargets: SonarTarget[] = pendingUpload ? pendingUpload.targets : [];

  const sortedBySweep = pendingUpload
    ? [...uploadTargets].sort((a, b) => a.box.x - b.box.x)
    : [...TARGETS].sort((a, b) => a.box.x - b.box.x);

  // Sort by vertical position for the waterfall reveal (top ping rows first).
  const sortedByDepth = pendingUpload
    ? [...uploadTargets].sort((a, b) => a.box.y - b.box.y)
    : [...TARGETS].sort((a, b) => a.box.y - b.box.y);

  // File telemetry for the ingestion readout.
  const fileSizeBytes = pendingUpload
    ? pendingUpload.fileSizeBytes ?? Math.round(pendingUpload.imageUrl.length * 0.75)
    : 0;
  const totalPings = pendingUpload ? Math.round(1800 + fileSizeBytes / 2500) : 0;

  useEffect(() => {
    if (pendingUpload) {
      const img = new Image();
      img.onload = () => {
        const off = document.createElement("canvas");
        off.width = CANVAS_W;
        off.height = CANVAS_H;
        const octx = off.getContext("2d");
        if (octx) {
          octx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
        }
        offscreenRef.current = off;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && off) ctx.drawImage(off, 0, 0);
      };
      img.src = pendingUpload.imageUrl;
    } else {
      const off = document.createElement("canvas");
      off.width = CANVAS_W;
      off.height = CANVAS_H;
      const octx = off.getContext("2d");
      if (octx) paintSeabed(octx);
      offscreenRef.current = off;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && off) ctx.drawImage(off, 0, 0);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [pendingUpload]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
      const y = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
      setCursorPos({ x, y });
    },
    [],
  );

  const finishRun = useCallback(() => {
    setRunning(false);
    setDone(true);
    onComplete();
  }, [onComplete]);

  // Demo only: left-to-right AI sweep over a procedural seabed.
  const startScan = useCallback(() => {
    const off = offscreenRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!off || !ctx) return;

    onReset();
    setRevealedRun([]);
    setLog([]);
    setDone(false);
    setRunning(true);

    const start = performance.now();
    let clockOffset = 9 * 3600 + 41 * 60 + 12;

    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / SCAN_DURATION_MS);
      setProgress(Math.round(p * 100));

      ctx.drawImage(off, 0, 0);
      const sweepX = p * CANVAS_W;
      const trailW = Math.min(200, sweepX);

      const grad = ctx.createLinearGradient(sweepX - trailW, 0, sweepX, 0);
      grad.addColorStop(0, "rgba(95,212,196,0)");
      grad.addColorStop(0.7, "rgba(95,212,196,0.08)");
      grad.addColorStop(1, "rgba(95,212,196,0.18)");
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - trailW, 0, trailW, CANVAS_H);

      ctx.fillStyle = "rgba(95,212,196,0.9)";
      ctx.fillRect(sweepX - 1, 0, 2.5, CANVAS_H);

      for (const t of sortedBySweep) {
        if (revealedRun.includes(t.id)) continue;
        if (sweepX >= t.box.x * (CANVAS_W / 100) + 12) {
          clockOffset += 18 + Math.floor(Math.random() * 17);
          const entry: LogEntry = { key: Date.now() + log.length, time: fmtClock(clockOffset), target: t as SonarTarget };
          setLog((l) => [...l, entry]);
          setRevealedRun((r) => [...r, t.id]);
          onReveal(t.id);
        }
      }

      if (p < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        finishRun();
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [onReset, onReveal, finishRun, sortedBySweep, log.length, revealedRun]);

  // File ingestion: ping rows stream top→bottom as the .XTF/.JSF parse
  // advances; hard stop at 100% freezes the assembled frame.
  const startIngest = useCallback(() => {
    const off = offscreenRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!off || !ctx) return;

    if (!pendingUpload) onReset();
    setRevealedRun([]);
    setLog([]);
    setDone(false);
    setRunning(true);

    const start = performance.now();
    let clockOffset = 9 * 3600 + 41 * 60 + 12;

    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / INGEST_DURATION_MS);
      setProgress(Math.round(p * 100));

      ctx.drawImage(off, 0, 0);
      const recY = p * CANVAS_H;

      // Unrecorded ping rows below the tow-fish line stay dark — still "in the
      // water". As parse progresses the recorded frame builds downward.
      const dark = ctx.createLinearGradient(0, recY, 0, CANVAS_H);
      dark.addColorStop(0, "rgba(6,11,18,0)");
      dark.addColorStop(0.28, "rgba(6,11,18,0.9)");
      dark.addColorStop(1, "rgba(6,11,18,0.97)");
      ctx.fillStyle = dark;
      ctx.fillRect(0, recY, CANVAS_W, CANVAS_H - recY);

      ctx.fillStyle = "rgba(95,212,196,0.8)";
      ctx.fillRect(0, recY, CANVAS_W, 1.6);
      ctx.shadowColor = "rgba(95,212,196,0.5)";
      ctx.shadowBlur = 10;
      ctx.fillRect(0, recY, CANVAS_W, 1.4);
      ctx.shadowBlur = 0;

      for (const t of sortedByDepth) {
        if (revealedRun.includes(t.id)) continue;
        if (recY >= ((t.box.y + t.box.h / 2) / 100) * CANVAS_H) {
          clockOffset += 12 + Math.floor(Math.random() * 12);
          const entry: LogEntry = { key: Date.now() + log.length, time: fmtClock(clockOffset), target: t as SonarTarget };
          setLog((l) => [...l, entry]);
          setRevealedRun((r) => [...r, t.id]);
          onReveal(t.id);
        }
      }

      if (p < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        finishRun();
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [pendingUpload, onReset, onReveal, finishRun, sortedByDepth, log.length, revealedRun]);

  useEffect(() => {
    let buffer = "";
    const handler = (e: KeyboardEvent) => {
      if (running || e.metaKey || e.ctrlKey || e.altKey) return;
      buffer += e.key.toLowerCase();
      if (buffer.length > 10) buffer = buffer.slice(-10);
      if (buffer.includes("scan")) {
        buffer = "";
        if (pendingUpload) startIngest();
        else startScan();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [running, pendingUpload, startIngest, startScan]);

  useEffect(() => {
    if (!pendingUpload || running || done || !offscreenRef.current) return;
    const timer = setTimeout(() => startIngest(), 500);
    return () => clearTimeout(timer);
  }, [pendingUpload, running, done, startIngest]);

  const targetCount = pendingUpload ? uploadTargets.length : TARGETS.length;
  const pingsShown = Math.round(totalPings * (progress / 100));
  const startLabel = progress === 100 ? "STOPPED" : running ? "INGESTING" : pendingUpload ? "READY" : "IDLE";

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
          <div className="mr-auto min-w-0">
            <h2 className="font-display text-sm font-semibold tracking-wide text-[var(--color-ocean-text)]">SONAR RECORD INGEST</h2>
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-ocean-muted)]">
              {pendingUpload
                ? `${pendingUpload.fileName} · parse ${progress}% · ${pingsShown.toLocaleString()} pings`
                : "GOA_SURVEY_L04.xtf · towfish @ 12 m · demo sweep L→R"}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <RadialGainDial value={confidenceFilter} onChange={setConfidenceFilter} label="CONF. GATE" size={92} />
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setClaheEnabled(!claheEnabled)}
                className={`border px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider transition ${
                  claheEnabled
                    ? "border-[var(--color-ocean-primary)] bg-[var(--color-ocean-primary)] text-white"
                    : "border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] text-[#45566A]"
                }`}
              >
                CLAHE {claheEnabled ? "ON" : "OFF"}
              </button>
              {done ? (
                <button
                  onClick={() => (pendingUpload ? startIngest() : startScan())}
                  className="inline-flex items-center gap-1.5 border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-3 py-1.5 font-mono text-[11px] font-bold text-[var(--color-ocean-text)] transition hover:bg-[var(--color-ocean-card)]"
                >
                  <RotateCcw size={13} /> Re-run
                </button>
              ) : (
                <button
                  onClick={() => (pendingUpload ? startIngest() : startScan())}
                  disabled={running}
                  className="bg-[var(--color-ocean-primary)] px-3 py-1.5 font-mono text-[11px] font-bold text-white transition hover:bg-[#0B5C8F] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {running ? (
                    pendingUpload ? `PARSING ${progress}%` : `SCANNING ${progress}%`
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Radar size={13} /> {pendingUpload ? "BEGIN INGEST" : "START SCAN"}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div
          className="relative h-[380px] select-none overflow-hidden bg-[var(--color-ocean-console)] sm:h-[440px]"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursorPos(null)}
        >
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="absolute inset-0 h-full w-full" />
          {!running && !done && <SonarPreview opacity={0.45} />}
          <div className="scanlines pointer-events-none absolute inset-0" />

          {sortedBySweep.map((t) => {
            if (!done && !revealedRun.includes(t.id)) return null;
            if (t.confidence * 100 < confidenceFilter) return null;
            const meta = SEVERITY_META[t.severity];
            return (
              <div
                key={`ghost-${t.id}`}
                className="pointer-events-none absolute border fade-up"
                style={{
                  left: `${t.box.x}%`,
                  top: `${t.box.y}%`,
                  width: `${t.box.w}%`,
                  height: `${t.box.h}%`,
                  borderColor: meta.stroke,
                  backgroundColor: meta.fill,
                  boxShadow: `0 0 12px ${meta.stroke}33`,
                }}
              >
                <span
                  className={`absolute left-0 whitespace-nowrap border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider ${
                    t.box.y > 12 ? "-top-6" : "top-full mt-1"
                  }`}
                  style={{
                    backgroundColor: "rgba(2,4,8,0.9)",
                    color: meta.stroke,
                    borderColor: `${meta.stroke}44`,
                  }}
                >
                  {t.label} [{Math.round(t.confidence * 100)}%]
                </span>
              </div>
            );
          })}

          {running && (
            <span className="absolute bottom-3 right-3 border bg-[var(--color-ocean-console)]/85 px-2.5 py-1 font-mono text-[10px] tracking-widest text-[var(--color-ocean-sky)] hud-text">
              {pendingUpload ? `WATERFALL ${progress}%` : `SWEEP ${progress}%`}
            </span>
          )}

          {done && (
            <span className="absolute bottom-3 right-3 border border-[var(--color-ocean-emerald)]/40 bg-[var(--color-ocean-console)]/90 px-2.5 py-1 font-mono text-[10px] tracking-widest text-[var(--color-ocean-sky)]">
              FRAME FROZEN · {100}%
            </span>
          )}

          {(running || done) && (
            <div className="pointer-events-none absolute bottom-3 left-3 flex gap-2.5 border bg-[var(--color-ocean-console)]/85 px-3 py-1.5">
              {(["high", "medium", "low"] as const).map((s) => (
                <span key={s} className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[#B9C6D2]">
                  <span className="h-1.5 w-1.5" style={{ backgroundColor: SEVERITY_META[s].stroke }} />
                  {SEVERITY_META[s].label}
                </span>
              ))}
            </div>
          )}

          {cursorPos && (
            <div className="pointer-events-none absolute right-3 top-3 z-10 border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]/90 px-2.5 py-1.5 font-mono text-[9px] text-[#10202E] backdrop-blur">
              <div>{pendingUpload ? "PING" : "DEPTH"}: {(12 + (cursorPos.y / CANVAS_H) * 50).toFixed(1)} m</div>
              <div>RANGE: {(4 + (cursorPos.x / CANVAS_W) * 8).toFixed(1)} m</div>
              <div>dB: {(-42 + (Math.sin(cursorPos.x * 12.9898 + cursorPos.y * 78.233) * 0.5 + 0.5) * 12).toFixed(1)} dB</div>
            </div>
          )}
        </div>

        {/* Ingestion telemetry strip */}
        <div className={`grid grid-cols-2 gap-px border-t border-[var(--color-ocean-border)] bg-[var(--color-ocean-border)] sm:grid-cols-5`}>
          <TelemetryCell label="FILE" value={pendingUpload?.fileName ?? "GOA_SURVEY_L04.XTF"} className="col-span-2 sm:col-span-1" />
          <TelemetryCell label="SIZE" value={pendingUpload ? formatBytes(fileSizeBytes) : "64.2 MB"} />
          <TelemetryCell label="PARSE" value={`${progress}%`} tone={progress === 100 ? "text-[#0E6BA8]" : "text-[#10202E]"} />
          <TelemetryCell label="PINGS" value={`${pingsShown.toLocaleString()} / ${totalPings.toLocaleString()}`} />
          <TelemetryCell label="STATUS" value={startLabel} tone={done ? "text-[#0E6BA8]" : running ? "text-[#C97A12]" : "text-[#45566A]"} />
        </div>

        <div className="h-1 bg-[var(--color-ocean-surface)]">
          <div
            className={`h-full transition-[width] duration-150 ${done ? "bg-[#0E6BA8]" : "bg-[var(--color-ocean-sky)]"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <aside className="flex min-w-0 flex-col gap-3">
        <section className="border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] p-4">
          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[#45566A]">Contacts identified</p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-[#10202E]">
            <NumberTicker value={log.length} />
            <span className="text-base font-medium text-[#45566A]"> / {targetCount}</span>
          </p>
          <div className="mt-3 space-y-1.5 border-t border-dashed border-[var(--color-ocean-border)] pt-3">
            {(["high", "medium", "low"] as const).map((s) => {
              const n = log.filter((e) => e.target.severity === s).length;
              return (
                <div key={s} className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="h-2 w-2 rotate-45" style={{ backgroundColor: SEVERITY_META[s].stroke }} />
                  <span className="uppercase tracking-wide text-[#45566A]">{SEVERITY_META[s].label} RISK</span>
                  <span className="ml-auto font-bold tabular-nums text-[#10202E]">{n}</span>
                </div>
              );
            })}
          </div>
          {done && (
            <div className={`fade-up mt-4 border border-[var(--color-ocean-emerald)]/40 bg-[#0E6BA8]/5 p-3 ${pendingUpload ? "" : "border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)]"}`}>
              {pendingUpload ? (
                <>
                  <p className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#0E6BA8]">
                    <CircleCheck size={14} /> INGEST COMPLETE — PARSER STOPPED
                  </p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#45566A]">
                    Waterfall frozen · {totalPings.toLocaleString()} ping rows · carry frame to Analyze
                  </p>
                  <button
                    onClick={onGoAnalyze}
                    className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 bg-[#0E6BA8] py-2 font-mono text-xs font-bold text-white transition hover:bg-[#0B5C8F]"
                  >
                    Analyze frozen frame <ArrowRight size={13} />
                  </button>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#0E6BA8]">
                    <CircleCheck size={14} /> SCAN COMPLETE — LOG CLOSED
                  </p>
                  <button
                    onClick={onGoAnalyze}
                    className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 bg-[#0E6BA8] py-2 font-mono text-xs font-bold text-white transition hover:bg-[#0B5C8F]"
                  >
                    Review findings <ArrowRight size={13} />
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        <section className="overflow-hidden border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2">
            <h3 className="font-mono text-[11px] font-bold tracking-wide text-[#10202E]">DETECTION LOG</h3>
            {running && (
              <span className="relative ml-auto flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping bg-[#E63946] opacity-75" />
                <span className="relative inline-flex h-2 w-2 bg-[#E63946]" />
              </span>
            )}
          </div>
          <ul ref={logRef} className="max-h-56 space-y-0 overflow-y-auto p-0 lg:max-h-[280px]">
            {log.length === 0 && (
              <li className="px-4 py-6 text-center font-mono text-[11px] text-[#45566A]">
                Log entries appear here as contacts are found.
              </li>
            )}
            {log.map((e) => (
              <li
                key={e.key}
                className={`fade-up border-b border-[var(--color-ocean-border)] last:border-b-0 ${logSel === e.target.id ? "bg-[var(--color-ocean-surface)]" : ""}`}
              >
                <button
                  onClick={() => {
                    setLogSel(e.target.id);
                    onReveal(e.target.id);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[10px] transition-colors hover:bg-[var(--color-ocean-surface)]"
                  title="Slew viewport to target"
                >
                  <span className="tabular-nums text-[#45566A]">{e.time}</span>
                  <span className="h-1.5 w-1.5 shrink-0" style={{ backgroundColor: SEVERITY_META[e.target.severity].stroke }} />
                  <span className="font-bold text-[#0E6BA8]">{e.target.id}</span>
                  <span className="truncate text-[#10202E]">{e.target.label}</span>
                  <span className="ml-auto shrink-0 font-semibold tabular-nums text-[#0E6BA8]">
                    {Math.round(e.target.confidence * 100)}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] p-4">
          <h3 className="font-mono text-[11px] font-bold tracking-wide text-[#10202E]">ACQUISITION PIPELINE</h3>
          <ol className="mt-3 space-y-2.5">
            {(pendingUpload ? [
              { icon: <FileText size={13} />, text: `.XTF/.JSF parser reads ${totalPings.toLocaleString()} ping rows` },
              { icon: <Waves size={13} />, text: "Waterfall assembles echo rows top→down in real time" },
              { icon: <Cpu size={13} />, text: `YOLOv8-seg inference — ${uploadTargets.length} anomal${uploadTargets.length !== 1 ? "ies" : "y"} flagged` },
            ] : [
              { icon: <Ship size={13} />, text: "Towfish emits broadband sound pulses at 900 kHz" },
              { icon: <ScanLine size={13} />, text: "Echoes paint seabed image beam-by-beam (SLAR)" },
              { icon: <Cpu size={13} />, text: "TensorRT INT8 classifier flags hard acoustic returns" },
            ]).map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-[#45566A]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[var(--color-ocean-sky)]/40 bg-[#5FD4C4]/10 font-mono text-[9px] font-bold text-[#0E6BA8]">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step.text}</span>
                <span className="ml-auto pt-0.5 text-[var(--color-ocean-sky)]/60">{step.icon}</span>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}

function TelemetryCell({
  label,
  value,
  tone = "text-[#10202E]",
  className = "",
}: {
  label: string;
  value: string;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 bg-[var(--color-ocean-card)] px-3 py-2 ${className}`}>
      <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#45566A]">{label}</p>
      <p className={`mt-0.5 truncate font-mono text-[11px] font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}