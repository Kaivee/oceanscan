"use client";

import { useEffect, useRef } from "react";

const CANVAS_W = 1200;
const CANVAS_H = 800;

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

export function paintIdleSonar(ctx: CanvasRenderingContext2D, w = CANVAS_W, h = CANVAS_H) {
  const rand = mulberry32(2026);

  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, "#0A101C");
  base.addColorStop(0.5, "#0C1422");
  base.addColorStop(1, "#080D17");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Acoustic waterfall banding — horizontal slow variation (side-scan SLAR).
  // Neutral grey tones so the preview reads as a "raw" grayscale sonar.
  for (let i = 0; i < 90; i++) {
    const y = rand() * h;
    const hgt = 6 + rand() * 26;
    const amp = 0.02 + rand() * 0.05;
    const tone = 120 + rand() * 90;
    const grad = ctx.createLinearGradient(0, y, w, y);
    grad.addColorStop(0, `rgba(${tone},${tone + 4},${tone + 6},${amp * 0.6})`);
    grad.addColorStop(0.5, `rgba(${tone},${tone + 3},${tone + 5},${amp})`);
    grad.addColorStop(1, `rgba(${tone},${tone + 4},${tone + 6},${amp * 0.6})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, w, hgt);
  }

  // Fine speckle noise
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 34;
    const v = Math.max(0, Math.min(255, d[i] + n));
    d[i] = v;
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  // Isolated pebble/rock returns with acoustic shadow
  for (let i = 0; i < 26; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 1.4 + rand() * 2.6;
    ctx.fillStyle = `rgba(190,195,205,${0.14 + rand() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(1,3,7,0.4)";
    ctx.beginPath();
    ctx.ellipse(x + r * 3, y + 1.2, r * 3.4, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Coordinate graticules — fine grid markings
  ctx.strokeStyle = "rgba(42,217,248,0.12)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= w; gx += w / 8) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy <= h; gy += h / 6) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  // Crosshair + coordinate readout
  ctx.strokeStyle = "rgba(42,217,248,0.28)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(42,217,248,0.55)";
  ctx.font = "12px monospace";
  ctx.textAlign = "center";
  ctx.fillText("15°24'32\"N / 73°47'20\"E", w / 2, h / 2 - 14);

  // Vignette
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.66);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(2,4,8,0.65)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

export default function SonarPreview({
  opacity = 0.28,
  label = "IDLE · SONAR WATERFALL PREVIEW",
}: {
  opacity?: number;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) paintIdleSonar(ctx);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity }}>
      <canvas ref={ref} width={CANVAS_W} height={CANVAS_H} className="absolute inset-0 h-full w-full" />
      {label && (
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--color-ocean-sky)]/40">
          {label}
        </span>
      )}
    </div>
  );
}
