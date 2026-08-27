"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CircleCheck,
  Cpu,
  Radar,
  RotateCcw,
  ScanLine,
  Ship,
} from "lucide-react";
import { SEVERITY_META, TARGETS, type SonarTarget } from "@/lib/targets";
import { NumberTicker } from "@/components/marine-ui";
import type { PendingUpload } from "@/app/page";

const CANVAS_W = 1200;
const CANVAS_H = 800;
const SCAN_DURATION_MS = 7000;

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
  base.addColorStop(0, "#060B12");
  base.addColorStop(0.5, "#080E18");
  base.addColorStop(1, "#050910");
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
    ctx.strokeStyle = `rgba(56,189,248,${0.025 + rand() * 0.04})`;
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
    rock.addColorStop(0, "rgba(56,189,248,0.35)");
    rock.addColorStop(1, "rgba(8,14,24,0)");
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
  const [loaded, setLoaded] = useState(true);
  const logRef = useRef<HTMLUListElement>(null);
  const currentUploadRef = useRef<string | null>(null);

  useEffect(() => {
    const key = uploadKey(pendingUpload);
    if (key === currentUploadRef.current) return;
    currentUploadRef.current = key;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
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

  useEffect(() => {
    setLoaded(false);
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
        setLoaded(true);
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
      setLoaded(true);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && off) ctx.drawImage(off, 0, 0);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [pendingUpload]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  useEffect(() => {
    let buffer = "";
    const handler = (e: KeyboardEvent) => {
      if (running || e.metaKey || e.ctrlKey || e.altKey) return;
      buffer += e.key.toLowerCase();
      if (buffer.length > 10) buffer = buffer.slice(-10);
      if (buffer.includes("scan")) {
        buffer = "";
        startScan();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [running]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
      const y = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
      setCursorPos({ x, y });
    },
    [],
  );

  const startScan = useCallback(() => {
    const off = offscreenRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!off || !ctx) return;

    if (!pendingUpload) onReset();
    const revealedThisRun = new Set<string>();
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
      grad.addColorStop(0, "rgba(56,189,248,0)");
      grad.addColorStop(0.7, "rgba(56,189,248,0.08)");
      grad.addColorStop(1, "rgba(56,189,248,0.18)");
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - trailW, 0, trailW, CANVAS_H);

      ctx.fillStyle = "rgba(56,189,248,0.9)";
      ctx.fillRect(sweepX - 1, 0, 2.5, CANVAS_H);

      ctx.shadowColor = "rgba(56,189,248,0.6)";
      ctx.shadowBlur = 12;
      ctx.fillRect(sweepX - 0.5, 0, 1.5, CANVAS_H);
      ctx.shadowBlur = 0;

      for (const t of sortedBySweep) {
        if (revealedThisRun.has(t.id)) continue;
        if (sweepX >= t.box.x * (CANVAS_W / 100) + 12) {
          revealedThisRun.add(t.id);
          clockOffset += 18 + Math.floor(Math.random() * 17);
          setLog((l) => [
            ...l,
            { key: Date.now() + l.length, time: fmtClock(clockOffset), target: t as SonarTarget },
          ]);
          setRevealedRun((r) => [...r, t.id]);
          onReveal(t.id);
        }
      }

      if (p < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setRunning(false);
        setDone(true);
        onComplete();
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [onReset, onReveal, onComplete, sortedBySweep]);

  useEffect(() => {
    if (!pendingUpload || running || done || !loaded) return;
    const timer = setTimeout(() => startScan(), 500);
    return () => clearTimeout(timer);
  }, [pendingUpload, running, done, loaded, startScan]);

  const targetCount = pendingUpload ? uploadTargets.length : TARGETS.length;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
          <div className="mr-auto min-w-0">
            <h2 className="font-mono text-xs font-bold text-[var(--color-ocean-text)]">SONAR RECORD</h2>
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-ocean-muted)]">
              {pendingUpload ? `${pendingUpload.fileName} · AI inference` : "GOA_SURVEY_L04.xtf · towfish @ 12 m · sweep L→R"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-ocean-muted)]">
              Confidence
            </label>
            <input
              type="range"
              min={50}
              max={99}
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(Number(e.target.value))}
              className="w-20"
              style={{ "--fill": `${((confidenceFilter - 50) / 49) * 100}%` } as React.CSSProperties}
            />
            <span className="w-9 border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-1.5 py-0.5 text-center font-mono text-[10px] font-bold tabular-nums text-[var(--color-ocean-sky)]">
              {confidenceFilter}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setClaheEnabled(!claheEnabled)}
              className={`rounded-sm px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider transition ${
                claheEnabled
                  ? "bg-emerald-600/25 text-emerald-400"
                  : "bg-[var(--color-ocean-surface)] text-[var(--color-ocean-muted)]"
              }`}
            >
              CLAHE {claheEnabled ? "ON" : "OFF"}
            </button>
          </div>

          {done ? (
            <button
              onClick={startScan}
              className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-3 py-1.5 font-mono text-[11px] font-bold text-[var(--color-ocean-text)] transition hover:bg-[var(--color-ocean-card)]"
            >
              <RotateCcw size={13} /> Re-scan
            </button>
          ) : (
            <button
              onClick={startScan}
              disabled={running}
              className="rounded-sm bg-emerald-600 px-3 py-1.5 font-mono text-[11px] font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? `SCANNING ${progress}%` : (
                <span className="inline-flex items-center gap-1.5">
                  <Radar size={13} /> START SCAN
                </span>
              )}
            </button>
          )}
        </div>

        <div
          className="sonar-grid relative h-[380px] select-none overflow-hidden bg-[#060B12] sm:h-[440px]"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursorPos(null)}
        >
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="absolute inset-0 h-full w-full" />
          <div className="scanlines pointer-events-none absolute inset-0" />

          {sortedBySweep.map((t) => {
            if (!done && !revealedRun.includes(t.id)) return null;
            const meta = SEVERITY_META[t.severity];
            return (
              <div
                key={`ghost-${t.id}`}
                className="pointer-events-none absolute rounded border fade-up"
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
                  className={`absolute left-0 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider ${
                    t.box.y > 12 ? "-top-6" : "top-full mt-1"
                  }`}
                  style={{
                    backgroundColor: "rgba(2,4,8,0.9)",
                    color: meta.stroke,
                    border: `1px solid ${meta.stroke}44`,
                  }}
                >
                  {t.label} [{Math.round(t.confidence * 100)}%]
                </span>
              </div>
            );
          })}

          {!running && !done && (
            <div className="absolute inset-0 grid place-items-center bg-[var(--color-ocean-slate)]/80 p-4 backdrop-blur-[2px]">
              <div className="max-w-sm rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]/95 p-6 text-center glow-border">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded border border-[var(--color-ocean-sky)]/30 bg-[var(--color-ocean-sky)]/10 text-[var(--color-ocean-sky)]">
                  <ScanLine size={22} />
                </span>
                <h3 className="mt-3 font-mono text-sm font-bold text-[var(--color-ocean-text)]">
                  {pendingUpload ? "Scan starting..." : "Ready to scan"}
                </h3>
                <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-[var(--color-ocean-muted)]">
                  {pendingUpload
                    ? `Analyzing ${pendingUpload.fileName} — sweep will reveal ${uploadTargets.length} detection${uploadTargets.length !== 1 ? "s" : ""}`
                    : "Play a simulated sonar pass over the survey line. The AI flags contacts as the beam crosses them."}
                </p>
                {!pendingUpload && (
                  <button
                    onClick={startScan}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-emerald-600 px-4 py-2.5 font-mono text-xs font-bold text-white transition hover:bg-emerald-500"
                  >
                    <Radar size={14} /> START SCAN
                  </button>
                )}
              </div>
            </div>
          )}

          {running && (
            <span className="absolute bottom-3 right-3 rounded-sm bg-[var(--color-ocean-slate)]/80 px-2.5 py-1 font-mono text-[10px] tracking-widest text-[var(--color-ocean-sky)] hud-text">
              SWEEP {progress}%
            </span>
          )}

          {(running || done) && (
            <div className="pointer-events-none absolute bottom-3 left-3 flex gap-2.5 rounded-sm bg-[var(--color-ocean-slate)]/80 px-3 py-1.5">
              {(["high", "medium", "low"] as const).map((s) => (
                <span key={s} className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[var(--color-ocean-muted)]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SEVERITY_META[s].stroke }} />
                  {SEVERITY_META[s].label}
                </span>
              ))}
            </div>
          )}

          {cursorPos && (
            <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-sm border border-[var(--color-ocean-border)] bg-[var(--color-ocean-slate)]/90 px-2.5 py-1.5 font-mono text-[9px] text-[var(--color-ocean-sky)] backdrop-blur hud-text">
              <div>DEPTH: {(12 + (cursorPos.y / CANVAS_H) * 50).toFixed(1)} m</div>
              <div>ALT: {(4 + (cursorPos.x / CANVAS_W) * 8).toFixed(1)} m</div>
              <div>dB: {(-42 + Math.random() * 12).toFixed(1)} dB</div>
            </div>
          )}
        </div>

        <div className="h-1 bg-[var(--color-ocean-surface)]">
          <div
            className="h-full bg-[var(--color-ocean-sky)] transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <aside className="flex min-w-0 flex-col gap-3">
        <section className="rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] p-4">
          <p className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--color-ocean-muted)]">
            Contacts identified
          </p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-[var(--color-ocean-text)]">
            <NumberTicker value={log.length} />
            <span className="text-base font-medium text-[var(--color-ocean-muted)]"> / {targetCount}</span>
          </p>
          <div className="mt-3 space-y-1.5">
            {(["high", "medium", "low"] as const).map((s) => {
              const n = log.filter((e) => e.target.severity === s).length;
              return (
                <div key={s} className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="h-2 w-2 rotate-45" style={{ backgroundColor: SEVERITY_META[s].stroke }} />
                  <span className="uppercase tracking-wide text-[var(--color-ocean-muted)]">{SEVERITY_META[s].label} RISK</span>
                  <span className="ml-auto font-bold tabular-nums text-[var(--color-ocean-text)]">{n}</span>
                </div>
              );
            })}
          </div>
          {done && (
            <div className="fade-up mt-4 rounded-sm border border-[var(--color-ocean-emerald)]/30 bg-[var(--color-ocean-emerald)]/10 p-3">
              <p className="flex items-center gap-1.5 font-mono text-xs font-bold text-[var(--color-ocean-emerald)]">
                <CircleCheck size={14} /> SCAN COMPLETE — LOG CLOSED
              </p>
              <button
                onClick={onGoAnalyze}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-sm bg-emerald-600 py-2 font-mono text-xs font-bold text-white transition hover:bg-emerald-500"
              >
                Review findings <ArrowRight size={13} />
              </button>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2">
            <h3 className="font-mono text-xs font-bold text-[var(--color-ocean-text)]">DETECTION LOG</h3>
            {running && (
              <span className="relative ml-auto flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-ocean-red)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-ocean-red)]" />
              </span>
            )}
          </div>
          <ul ref={logRef} className="max-h-56 space-y-0 overflow-y-auto p-0 lg:max-h-[280px]">
            {log.length === 0 && (
              <li className="px-4 py-6 text-center font-mono text-[11px] text-[var(--color-ocean-muted)]">
                Log entries appear here as contacts are found.
              </li>
            )}
            {log.map((e) => (
              <li
                key={e.key}
                className="fade-up flex items-center gap-2 border-b border-[var(--color-ocean-border)] px-3 py-2 font-mono text-[10px] last:border-b-0"
              >
                <span className="tabular-nums text-[var(--color-ocean-muted)]">{e.time}</span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: SEVERITY_META[e.target.severity].stroke }} />
                <span className="font-bold text-[var(--color-ocean-sky)]">{e.target.id}</span>
                <span className="truncate text-[var(--color-ocean-text)]">{e.target.label}</span>
                <span className="ml-auto shrink-0 font-semibold tabular-nums text-[var(--color-ocean-emerald)]">
                  {Math.round(e.target.confidence * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] p-4">
          <h3 className="font-mono text-xs font-bold text-[var(--color-ocean-text)]">ACQUISITION PIPELINE</h3>
          <ol className="mt-3 space-y-2.5">
            {(pendingUpload ? [
              { icon: <Ship size={13} />, text: "Sonar frame ingested from uploaded file" },
              { icon: <ScanLine size={13} />, text: "Acoustic preprocessing — CLAHE + speckle reduction" },
              { icon: <Cpu size={13} />, text: `YOLOv8-seg inference — ${uploadTargets.length} anomal${uploadTargets.length !== 1 ? "ies" : "y"} flagged` },
            ] : [
              { icon: <Ship size={13} />, text: "Towfish emits broadband sound pulses at 900 kHz" },
              { icon: <ScanLine size={13} />, text: "Echoes paint seabed image beam-by-beam (SLAR)" },
              { icon: <Cpu size={13} />, text: "TensorRT INT8 classifier flags hard acoustic returns" },
            ]).map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-[var(--color-ocean-muted)]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-[var(--color-ocean-sky)]/30 bg-[var(--color-ocean-sky)]/10 font-mono text-[9px] font-bold text-[var(--color-ocean-sky)]">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step.text}</span>
                <span className="ml-auto pt-0.5 text-[var(--color-ocean-sky)]/50">{step.icon}</span>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
