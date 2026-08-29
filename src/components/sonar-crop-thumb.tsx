"use client";

import { useEffect, useRef } from "react";
import { SEVERITY_META, type SonarTarget } from "@/lib/targets";

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

// Procedural acoustic return thumbnail — mimics the target's sonar signature
function paintReturn(ctx: CanvasRenderingContext2D, target: SonarTarget, S: number) {
  const rand = mulberry32(4000 + target.id.length * 137);
  const meta = SEVERITY_META[target.severity];

  ctx.fillStyle = "#0A101C";
  ctx.fillRect(0, 0, S, S);

  // Seabed grain
  for (let i = 0; i < 700; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const v = rand() * 0.28;
    ctx.fillStyle = `rgba(190,200,210,${v})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Hard return blob at center
  const cx = S * 0.38;
  const cy = S * 0.5;
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, S * 0.28);
  g.addColorStop(0, "rgba(240,248,255,0.95)");
  g.addColorStop(0.5, "rgba(200,215,230,0.5)");
  g.addColorStop(1, "rgba(150,170,190,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, S * 0.28, S * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Acoustic shadow to the right
  ctx.fillStyle = "rgba(1,3,7,0.75)";
  ctx.beginPath();
  ctx.ellipse(cx + S * 0.4, cy + S * 0.05, S * 0.3, S * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bounding outline
  ctx.strokeStyle = meta.stroke;
  ctx.lineWidth = 1.2;
  ctx.shadowColor = meta.stroke;
  ctx.shadowBlur = 4;
  ctx.strokeRect(cx - S * 0.28, cy - S * 0.2, S * 0.56, S * 0.4);
  ctx.shadowBlur = 0;
}

interface SonarCropThumbProps {
  target: SonarTarget & { detectionStatus?: string };
  size?: number;
}

export default function SonarCropThumb({ target, size = 48 }: SonarCropThumbProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (target.imageUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, target.box.x / 100 * img.width, target.box.y / 100 * img.height, target.box.w / 100 * img.width, target.box.h / 100 * img.height, 0, 0, size, size);
      };
      img.src = target.imageUrl;
    } else {
      paintReturn(ctx, target, size);
    }
  }, [target, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-sm border border-[var(--color-ocean-border)]"
    />
  );
}
