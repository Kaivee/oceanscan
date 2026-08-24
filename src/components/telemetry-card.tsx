"use client";

import { Anchor, Container, Crosshair, Cylinder, Ghost, MapPin, Spline, TriangleAlert } from "lucide-react";
import { NumberTicker } from "@/components/marine-ui";
import { SEVERITY_META, type SonarTarget } from "@/lib/targets";

const CLASS_ICON: Record<string, React.ReactNode> = {
  NET_GHOST: <Ghost size={22} />,
  DRUM_STEEL: <Cylinder size={22} />,
  PIPE_SECTION: <Spline size={22} />,
  CONTAINER_LOST: <Container size={22} />,
};

interface TelemetryCardProps {
  target: SonarTarget | null;
}

export default function TelemetryCard({ target }: TelemetryCardProps) {
  if (!target) {
    return (
      <section className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-[#22385c]/40 bg-[#fbf7ee] p-6 text-center shadow-sm">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#22385c]/30 bg-[#efe6cf] text-[#22385c]/60">
          <Crosshair size={24} />
        </span>
        <p className="font-serif text-sm font-bold text-[#33415c]">Nothing selected yet</p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#8a8574]">
          Click a box, pin or row to inspect
        </p>
      </section>
    );
  }

  const meta = SEVERITY_META[target.severity];
  const confPct = Math.round(target.confidence * 100);

  return (
    <section className="shrink-0 overflow-hidden rounded-md border-2 border-[#22385c] bg-[#fbf7ee] shadow-sm">
      <div className="flex items-center gap-2.5 border-b-2 border-[#22385c]/20 bg-[#efe6cf]/50 px-4 py-3">
        <div className="mr-auto min-w-0">
          <h2 className="font-serif text-sm font-bold text-[#1b2a4a]">Object details</h2>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8574]">
            Sounding card · as observed
          </p>
        </div>
        <span className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${meta.chip}`}>
          {meta.label}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-current/20 ${meta.tint}`}
          >
            {CLASS_ICON[target.cls] ?? <Anchor size={22} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-base font-bold text-[#1b2a4a]">{target.label}</p>
            <p className="font-mono text-[10px] tracking-wide text-[#8a8574]">
              {target.id} · {target.cls}
            </p>
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl font-bold leading-none tabular-nums text-[#1b2a4a]">
              <NumberTicker value={confPct} />%
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-[#8a8574]">Confidence</p>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden bg-[#e6ddc8]">
          <div
            className="h-full bg-[#22385c] transition-all duration-500"
            style={{ width: `${confPct}%` }}
          />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5">
          <Field label="Est. dimensions" value={`${target.dims.length} × ${target.dims.width} × ${target.dims.height} m`} />
          <Field label="Est. depth" value={`${target.depthM} m ± 1.5`} />
          <Field label="Latitude" value={`${target.lat.toFixed(4)}° N`} icon={<MapPin size={11} />} mono />
          <Field label="Longitude" value={`${target.lon.toFixed(4)}° E`} icon={<MapPin size={11} />} mono />
        </dl>

        <p className="mt-3 flex items-start gap-2 border border-[#22385c]/20 bg-[#f4eddc] p-2.5 font-serif text-xs italic leading-relaxed text-[#33415c]">
          <TriangleAlert size={13} className="mt-0.5 shrink-0" style={{ color: meta.stroke }} />
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
    <div className="bg-[#f4eddc] px-3 py-2 ring-1 ring-[#22385c]/20">
      <dt className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-[#8a8574]">{label}</dt>
      <dd
        className={`mt-0.5 flex items-center gap-1 text-xs text-[#1b2a4a] ${mono ? "font-mono" : "font-semibold"}`}
      >
        {icon}
        {value}
      </dd>
    </div>
  );
}
