"use client";

import { Anchor, Container, Crosshair, Cylinder, Ghost, MapPin, Spline, TriangleAlert } from "lucide-react";
import { NumberTicker } from "@/components/marine-ui";
import { SEVERITY_META, type SonarTarget } from "@/lib/targets";

const CLASS_ICON: Record<string, React.ReactNode> = {
  NET_GHOST: <Ghost size={20} />,
  DRUM_STEEL: <Cylinder size={20} />,
  PIPE_SECTION: <Spline size={20} />,
  CONTAINER_LOST: <Container size={20} />,
};

interface TelemetryCardProps {
  target: SonarTarget | null;
}

export default function TelemetryCard({ target }: TelemetryCardProps) {
  if (!target) {
    return (
      <section className="flex shrink-0 flex-col items-center justify-center gap-2 border border-dashed border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] p-6 text-center">
        <span className="flex h-10 w-10 items-center justify-center border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] text-[var(--color-ocean-muted)]/60">
          <Crosshair size={20} />
        </span>
        <p className="font-mono text-xs font-bold text-[var(--color-ocean-text)]">Nothing selected yet</p>
        <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ocean-muted)]">
          Click a box, pin or row to inspect
        </p>
      </section>
    );
  }

  const meta = SEVERITY_META[target.severity];
  const confPct = Math.round(target.confidence * 100);

  return (
    <section className="shrink-0 overflow-hidden border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
      <div className="flex items-center gap-2.5 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
        <div className="mr-auto min-w-0">
          <h2 className="font-mono text-xs font-bold text-[var(--color-ocean-text)]">OBJECT DETAILS</h2>
          <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-ocean-muted)]">
            Telemetry card · as observed
          </p>
        </div>
        <span className={`shrink-0 border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${meta.chip}`}>
          {meta.label}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center border border-current/20 ${meta.tint}`}
          >
            {CLASS_ICON[target.cls] ?? <Anchor size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm font-bold text-[var(--color-ocean-text)]">{target.label}</p>
            <p className="font-mono text-[9px] tracking-wide text-[var(--color-ocean-muted)]">
              {target.id} · {target.cls}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl font-bold leading-none tabular-nums text-[var(--color-ocean-text)]">
              <NumberTicker value={confPct} />%
            </p>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--color-ocean-muted)]">Confidence</p>
          </div>
        </div>

        <div className="mt-3 h-1 overflow-hidden bg-[var(--color-ocean-surface)]">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${confPct}%`, backgroundColor: meta.stroke }}
          />
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2">
          <Field label="Est. dimensions" value={`${target.dims.length} × ${target.dims.width} × ${target.dims.height} m`} />
          <Field label="Est. depth" value={`${target.depthM} m ± 1.5`} />
          <Field label="Latitude" value={`${target.lat.toFixed(4)}° N`} icon={<MapPin size={10} />} mono />
          <Field label="Longitude" value={`${Math.abs(target.lon).toFixed(4)}° W`} icon={<MapPin size={10} />} mono />
        </dl>

        <p className="mt-3 flex items-start gap-2 border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] p-2.5 font-mono text-[10px] leading-relaxed text-[var(--color-ocean-muted)]">
          <TriangleAlert size={12} className="mt-0.5 shrink-0" style={{ color: meta.stroke }} />
          {target.note}
        </p>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="bg-[var(--color-ocean-surface)] px-2.5 py-2 ring-1 ring-[var(--color-ocean-border)]">
      <dt className="font-mono text-[8px] font-medium uppercase tracking-[0.16em] text-[var(--color-ocean-muted)]">{label}</dt>
      <dd
        className={`mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-ocean-text)] ${mono ? "font-mono text-[var(--color-ocean-sky)]" : "font-semibold"}`}
      >
        {icon}
        {value}
      </dd>
    </div>
  );
}
