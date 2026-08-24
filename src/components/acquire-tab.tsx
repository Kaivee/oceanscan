"use client";

import { useEffect, useRef, useState } from "react";
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

const CANVAS_W = 1200;
const CANVAS_H = 800;
const SCAN_DURATION_MS = 7000;

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
  base.addColorStop(0, "#0a1424");
  base.addColorStop(0.5, "#0c1828");
  base.addColorStop(1, "#081120");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 34;
    const rip = Math.sin((i / 4) % W / 26 + Math.sin((i / 4 / W) * 9) * 2.4) * 5;
    d[i] = Math.max(0, Math.min(255, d[i] + n + rip));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n + rip * 0.85));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.85));
  }
  ctx.putImageData(img, 0, 0);

  ctx.lineWidth = 1.5;
  for (let i = 0; i < 46; i++) {
    const y0 = rand() * H;
    const amp = 6 + rand() * 16;
    const wl = 90 + rand() * 160;
    const phase = rand() * Math.PI * 2;
    ctx.strokeStyle = `rgba(150,190,230,${0.03 + rand() * 0.05})`;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) {
      const y = y0 + Math.sin((x / wl) * Math.PI * 2 + phase) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 9; i++) {
    const cx = rand() * W;
    const cy = rand() * H;
    const rx = 30 + rand() * 80;
    const ry = 18 + rand() * 44;
    const ang = rand() * Math.PI;

    const shX = cx + Math.cos(ang) * rx * 1.6;
    const shY = cy + Math.sin(ang) * ry * 1.6;
    const shadow = ctx.createRadialGradient(shX, shY, 4, shX, shY, rx * 1.8);
    shadow.addColorStop(0, "rgba(3,7,14,0.55)");
    shadow.addColorStop(1, "rgba(3,7,14,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(shX, shY, rx * 1.8, ry * 1.8, ang, 0, Math.PI * 2);
    ctx.fill();

    const rock = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 2, cx, cy, rx);
    rock.addColorStop(0, "rgba(110,150,195,0.45)");
    rock.addColorStop(1, "rgba(16,26,44,0)");
    ctx.fillStyle = rock;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, ang, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 26; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 1 + rand() * 2.5;
    ctx.fillStyle = `rgba(205,228,250,${0.22 + rand() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(3,7,14,0.4)";
    ctx.beginPath();
    ctx.ellipse(x + r * 3, y + 1, r * 3.2, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.72);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(4,8,16,0.72)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function fmtClock(totalSec: number) {
  const h = Math.floor(totalSec / 3600) % 24;
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export default function AcquireTab({ onReveal, onComplete, onReset, onGoAnalyze }: AcquireTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [revealedRun, setRevealedRun] = useState<string[]>([]);
  const logRef = useRef<HTMLUListElement>(null);

  const sortedBySweep = [...TARGETS].sort((a, b) => a.box.x - b.box.x);

  useEffect(() => {
    const off = document.createElement("canvas");
    off.width = CANVAS_W;
    off.height = CANVAS_H;
    const octx = off.getContext("2d");
    if (octx) paintSeabed(octx);
    offscreenRef.current = off;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && off) ctx.drawImage(off, 0, 0);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const startScan = () => {
    const off = offscreenRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!off || !ctx) return;

    onReset();
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
      const trailW = Math.min(180, sweepX);
      const grad = ctx.createLinearGradient(sweepX - trailW, 0, sweepX, 0);
      grad.addColorStop(0, "rgba(45,212,191,0)");
      grad.addColorStop(1, "rgba(45,212,191,0.22)");
      ctx.fillStyle = grad;
      ctx.fillRect(sweepX - trailW, 0, trailW, CANVAS_H);
      ctx.fillStyle = "rgba(94,234,212,0.95)";
      ctx.fillRect(sweepX - 1.5, 0, 3, CANVAS_H);

      for (const t of sortedBySweep) {
        if (revealedThisRun.has(t.id)) continue;
        if (sweepX >= t.box.x * (CANVAS_W / 100) + 12) {
          revealedThisRun.add(t.id);
          clockOffset += 18 + Math.floor(Math.random() * 17);
          setLog((l) => [
            ...l,
            { key: Date.now() + l.length, time: fmtClock(clockOffset), target: t },
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
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* Left: sonar record panel */}
      <section className="overflow-hidden rounded-md border-2 border-[#22385c] bg-[#fbf7ee] shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b-2 border-[#22385c]/30 bg-[#efe6cf]/50 px-4 py-3">
          <div className="mr-auto min-w-0">
            <h2 className="font-serif text-sm font-bold text-[#1b2a4a]">Sonar record</h2>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[#6b5d3f]">
              GOA_SURVEY_L04.xtf · towfish at 12 m · sweep left → right
            </p>
          </div>
          {done ? (
            <button
              onClick={startScan}
              className="inline-flex items-center gap-1.5 rounded-sm border-2 border-[#22385c] px-3 py-1.5 font-serif text-sm font-bold text-[#22385c] transition hover:bg-[#22385c] hover:text-[#f6f1e7]"
            >
              <RotateCcw size={14} /> Re-scan
            </button>
          ) : (
            <button
              onClick={startScan}
              disabled={running}
              className="rounded-sm bg-[#22385c] px-4 py-1.5 font-serif text-sm font-bold text-[#f6f1e7] transition hover:bg-[#1b2a4a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-1.5">
                {running ? (
                  <>Scanning… {progress}%</>
                ) : (
                  <>
                    <Radar size={15} /> Start scan
                  </>
                )}
              </span>
            </button>
          )}
        </div>

        <div className="sonar-grid relative h-[380px] select-none overflow-hidden bg-[#0a1424] sm:h-[440px]">
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="absolute inset-0 h-full w-full" />
          <div className="scanlines pointer-events-none absolute inset-0" />

          {sortedBySweep.map((t) => {
            if (!done && !revealedRun.includes(t.id)) return null;
            const meta = SEVERITY_META[t.severity];
            return (
              <div
                key={`ghost-${t.id}`}
                className="pointer-events-none absolute rounded-lg border fade-up"
                style={{
                  left: `${t.box.x}%`,
                  top: `${t.box.y}%`,
                  width: `${t.box.w}%`,
                  height: `${t.box.h}%`,
                  borderColor: meta.stroke,
                  backgroundColor: meta.fill,
                }}
              >
                <span
                  className={`absolute left-0 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold text-white ${
                    t.box.y > 12 ? "-top-7" : "top-full mt-1"
                  }`}
                  style={{ backgroundColor: "rgba(8,16,31,0.88)", color: meta.stroke === "#059669" ? "#34d399" : meta.stroke }}
                >
                  {t.label} [{Math.round(t.confidence * 100)}%]
                </span>
              </div>
            );
          })}

          {!running && !done && (
            <div className="absolute inset-0 grid place-items-center bg-[#101c30]/70 p-4 backdrop-blur-[2px]">
              <div className="max-w-sm rounded-md border border-white/15 bg-[#0e1b2e]/95 p-6 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-teal-300/40 bg-teal-400/10 text-teal-200">
                  <ScanLine size={24} />
                </span>
                <h3 className="mt-3 font-serif text-base font-bold text-white">Ready to scan</h3>
                <p className="mt-1.5 font-serif text-xs italic leading-relaxed text-slate-300">
                  Play a simulated sonar pass over the survey line. The AI flags contacts as the
                  beam crosses them — watch them appear here.
                </p>
                <button
                  onClick={startScan}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-[#22385c] px-4 py-2.5 font-serif text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-[#1b2a4a]"
                >
                  <Radar size={16} /> Start scan
                </button>
              </div>
            </div>
          )}

          {running && (
            <span className="absolute bottom-3 right-3 rounded-sm bg-slate-950/70 px-2.5 py-1 font-mono text-[10px] tracking-widest text-teal-200">
              SWEEP {progress}%
            </span>
          )}

          {(running || done) && (
            <div className="pointer-events-none absolute bottom-3 left-3 flex gap-2.5 rounded-sm bg-slate-950/70 px-3 py-1.5">
              {(["high", "medium", "low"] as const).map((s) => (
                <span key={s} className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SEVERITY_META[s].stroke }} />
                  {SEVERITY_META[s].label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="h-1.5 bg-[#e6ddc8]">
          <div
            className="h-full bg-[#22385c] transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      {/* Right column */}
      <aside className="flex min-w-0 flex-col gap-4">
        <section className="rounded-md border-2 border-[#22385c] bg-[#fbf7ee] p-4 shadow-sm">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#6b5d3f]">
            Contacts identified
          </p>
          <p className="mt-1 font-serif text-3xl font-bold tabular-nums text-[#1b2a4a]">
            <NumberTicker value={log.length} />
            <span className="text-base font-medium text-[#8a8574]"> / {TARGETS.length}</span>
          </p>
          <div className="mt-3 space-y-1.5">
            {(["high", "medium", "low"] as const).map((s) => {
              const n = log.filter((e) => e.target.severity === s).length;
              return (
                <div key={s} className="flex items-center gap-2 font-mono text-[11px]">
                  <span className={`h-2 w-2 rotate-45 ${SEVERITY_META[s].dot}`} />
                  <span className="uppercase tracking-wide text-[#33415c]">{SEVERITY_META[s].label} risk</span>
                  <span className="ml-auto font-bold tabular-nums text-[#1b2a4a]">{n}</span>
                </div>
              );
            })}
          </div>
          {done && (
            <div className="fade-up mt-4 rounded-sm border-2 border-[#3e6b4f] bg-[#3e6b4f]/[0.07] p-3">
              <p className="flex items-center gap-1.5 font-serif text-sm font-bold text-[#3e6b4f]">
                <CircleCheck size={15} /> Scan complete — log closed
              </p>
              <button
                onClick={onGoAnalyze}
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-sm bg-[#22385c] py-2 font-serif text-sm font-bold text-[#f6f1e7] transition hover:bg-[#1b2a4a]"
              >
                Review findings <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-md border-2 border-[#22385c] bg-[#fbf7ee] shadow-sm">
          <div className="flex items-center gap-2 border-b-2 border-[#22385c]/20 bg-[#efe6cf]/50 px-4 py-2.5">
            <h3 className="font-serif text-sm font-bold text-[#1b2a4a]">Detection log</h3>
            {running && (
              <span className="relative ml-auto flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b03a2e] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#b03a2e]" />
              </span>
            )}
          </div>
          <ul ref={logRef} className="max-h-56 space-y-0 overflow-y-auto p-0 lg:max-h-[300px]">
            {log.length === 0 && (
              <li className="px-4 py-6 text-center font-serif text-xs italic text-[#8a8574]">
                Log entries appear here as contacts are found.
              </li>
            )}
            {log.map((e) => (
              <li
                key={e.key}
                className="fade-up flex items-center gap-2.5 border-b border-[#22385c]/10 px-3 py-2 font-mono text-[11px] last:border-b-0"
              >
                <span className="tabular-nums text-[#8a8574]">{e.time}</span>
                <span className={`h-2 w-2 shrink-0 rotate-45 ${SEVERITY_META[e.target.severity].dot}`} />
                <span className="font-bold text-[#22385c]">{e.target.id}</span>
                <span className="truncate font-serif italic text-[#33415c]">{e.target.label}</span>
                <span className="ml-auto shrink-0 font-semibold tabular-nums text-[#1b2a4a]">
                  {Math.round(e.target.confidence * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-md border-2 border-[#22385c] bg-[#fbf7ee] p-4 shadow-sm">
          <h3 className="font-serif text-sm font-bold text-[#1b2a4a]">How the scan works</h3>
          <ol className="mt-3 space-y-3">
            {[
              { icon: <Ship size={14} />, text: "A towfish behind the boat emits sound pulses" },
              { icon: <ScanLine size={14} />, text: "Echoes paint this seabed image, beam by beam" },
              { icon: <Cpu size={14} />, text: "The AI classifies hard returns and flags contacts" },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-[#33415c]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#22385c]/40 bg-[#efe6cf] font-serif text-[10px] font-bold text-[#22385c]">
                  {["i", "ii", "iii"][i]}
                </span>
                <span className="pt-0.5">{step.text}</span>
                <span className="ml-auto pt-0.5 text-[#8a8574]">{step.icon}</span>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}
