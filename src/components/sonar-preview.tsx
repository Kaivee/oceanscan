"use client";

import { useEffect, useRef } from "react";
import type { ViewMode } from "@/lib/targets";

const CANVAS_W = 1200;
const CANVAS_H = 800;
const NADIR_START = 0.46; // Nadir gap x extent (46% -> 54%)
const NADIR_END = 0.54;

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

export function paintSonarFrame(
  ctx: CanvasRenderingContext2D,
  mode: ViewMode,
  w = CANVAS_W,
  h = CANVAS_H,
) {
  const rand = mulberry32(mode === "denoised" ? 2027 : 2026);

  // Light paper bed — fits the Mono-Signal light theme.
  const bed = ctx.createLinearGradient(0, 0, 0, h);
  bed.addColorStop(0, "#EFEFEC");
  bed.addColorStop(0.5, "#F2F2EF");
  bed.addColorStop(1, "#EAEAE6");
  ctx.fillStyle = bed;
  ctx.fillRect(0, 0, w, h);

  // Sinusoidal bed ripples — wide soft amplitude modulation of backscatter.
  for (let i = 0; i < 26; i++) {
    const y0 = rand() * h;
    const amp = mode === "denoised" ? 0.05 : 0.09 + rand() * 0.08;
    const tone = 196 + rand() * 24;
    const grad = ctx.createLinearGradient(0, y0, w, y0);
    grad.addColorStop(0, `rgba(${tone},${tone},${tone},${amp * 0.7})`);
    grad.addColorStop(0.5, `rgba(${tone},${tone},${tone},${amp})`);
    grad.addColorStop(1, `rgba(${tone},${tone},${tone},${amp * 0.7})`);
    ctx.fillStyle = grad;
    // Sinusoidal edge so rows read as ripple crests
    ctx.beginPath();
    ctx.moveTo(0, y0);
    for (let x = 0; x <= w; x += 8) {
      ctx.lineTo(x, y0 + Math.sin(x * 0.02 + i) * 7);
    }
    ctx.lineTo(w, y0 + 22);
    ctx.lineTo(0, y0 + 22);
    ctx.closePath();
    ctx.fill();
  }

  // Side-scan speckle / grain noise
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const grain = mode === "denoised" ? 12 : 30;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * grain;
    for (let c = 0; c < 3; c++) {
      d[i + c] = Math.max(0, Math.min(255, d[i + c] + n));
    }
  }
  ctx.putImageData(img, 0, 0);

  // Isolated debris pebbles with acoustic shadow (classic side-scan cues)
  for (let i = 0; i < 34; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 2 + rand() * 4;
    ctx.fillStyle = `rgba(80,80,76,${0.18 + rand() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(x - r * 2.6, y, r * 3, r * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nadir gap — vertical acoustic blank beneath the towfish (46% -> 54%).
  // Darker vertical blank, soft falloff into each channel.
  const nx0 = w * NADIR_START;
  const nx1 = w * NADIR_END;
  const nadir = ctx.createLinearGradient(nx0, 0, nx1, 0);
  nadir.addColorStop(0, "rgba(160,160,156,0.0)");
  nadir.addColorStop(0.5, "rgba(120,120,116,0.5)");
  nadir.addColorStop(1, "rgba(160,160,156,0.0)");
  ctx.fillStyle = nadir;
  ctx.fillRect(nx0, 0, w * (NADIR_END - NADIR_START), h);

  // Nadir guide lines
  ctx.strokeStyle = "rgba(20,20,20,0.18)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(nx0, 0);
  ctx.lineTo(nx0, h);
  ctx.moveTo(nx1, 0);
  ctx.lineTo(nx1, h);
  ctx.stroke();
  ctx.setLineDash([]);

  // Graticule
  ctx.strokeStyle = "rgba(20,20,20,0.06)";
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

  // Subtle vignette
  const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.66);
  vig.addColorStop(0, "rgba(20,20,20,0)");
  vig.addColorStop(1, "rgba(20,20,20,0.08)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

export default function SonarCanvas({ mode = "raw" as ViewMode }: { mode?: ViewMode }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) paintSonarFrame(ctx, mode);
  }, [mode]);

  return (
    <canvas ref={ref} width={CANVAS_W} height={CANVAS_H} className="absolute inset-0 h-full w-full" />
  );
}
