"use client";

import { useMemo, useState } from "react";
import { Anchor, Check, Copy, Braces, Route, Waypoints } from "lucide-react";
import Modal from "./modal";
import {
  downloadText,
  retrievalRoute,
  SEVERITY_META,
  toGeoJSON,
  type SonarTarget,
} from "@/lib/targets";

export function GeojsonModal({
  open,
  onClose,
  targets,
}: {
  open: boolean;
  onClose: () => void;
  targets: SonarTarget[];
}) {
  const [copied, setCopied] = useState(false);
  const payload = useMemo(() => JSON.stringify(toGeoJSON(targets), null, 2), [targets]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="GeoJSON Export Payload"
      subtitle={`FeatureCollection · ${targets.length} features · CRS84 (WGS-84)`}
      icon={<Braces size={15} />}
    >
      <div className="p-5">
        <pre className="max-h-[52vh] overflow-auto rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-slate)] p-4 font-mono text-[10px] leading-relaxed text-[var(--color-ocean-sky)]/80">
          {payload}
        </pre>
        <div className="mt-4 flex gap-2">
          <button
            onClick={copy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-[var(--color-ocean-border)] bg-transparent py-2.5 font-mono text-[11px] font-bold text-[var(--color-ocean-text)] transition hover:bg-[var(--color-ocean-surface)]"
          >
            {copied ? <Check size={13} className="text-[var(--color-ocean-emerald)]" /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy payload"}
          </button>
          <button
            onClick={() =>
              downloadText("oceanscan_hazard_export.geojson", payload, "application/geo+json")
            }
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-[#3709A5] py-2.5 font-mono text-[11px] font-bold text-white transition hover:bg-[#4a12c9]"
          >
            <Braces size={13} /> Download .geojson
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function RetrievalModal({
  open,
  onClose,
  targets,
}: {
  open: boolean;
  onClose: () => void;
  targets: SonarTarget[];
}) {
  const route = useMemo(
    () => retrievalRoute([15.468, 73.724], targets),
    [targets],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Retrieval Path Plan"
      subtitle="Priority-weighted nearest-neighbour route for ROV recovery ops"
      icon={<Route size={15} />}
    >
      <div className="p-5">
        <ol className="space-y-2">
          {route.legs.map((leg, i) => {
            const t = route.order[i];
            const meta = SEVERITY_META[t.severity];
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-3 py-2.5 transition-colors hover:border-[var(--color-ocean-muted)]/30"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[var(--color-ocean-sky)]/30 bg-[var(--color-ocean-sky)]/10 font-mono text-[10px] font-bold text-[var(--color-ocean-sky)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[11px] text-[var(--color-ocean-muted)]">
                    {i === 0 ? "MSV SAGAR-DHWANI" : route.order[i - 1].id}
                    <span className="mx-1.5 text-[var(--color-ocean-muted)]/50">→</span>
                    <span className="font-mono text-xs font-bold" style={{ color: meta.stroke }}>
                      {t.id} {t.label}
                    </span>
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-wide text-[var(--color-ocean-muted)]">
                    BRG {Math.round(leg.bearing)}°T · {(leg.distM / 1000).toFixed(2)} km ·{" "}
                    {meta.label} priority · depth {t.depthM} m
                  </p>
                </div>
                <Anchor size={14} className="shrink-0 text-[var(--color-ocean-muted)]/30" />
              </li>
            );
          })}
        </ol>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Total route" value={`${(route.totalM / 1000).toFixed(2)} km`} />
          <Stat label="Est. ROV time @ 2 kn" value={`${Math.round(route.estMinutes)} min`} />
          <Stat label="Waypoints" value={`${route.order.length}`} />
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-sm border border-[var(--color-ocean-amber)]/30 bg-[var(--color-ocean-amber)]/5 p-3 font-mono text-[11px] leading-relaxed text-[var(--color-ocean-amber)]/80">
          <Waypoints size={13} className="mt-0.5 shrink-0" />
          High-severity contacts are weighted first; remaining legs minimise transit distance.
          Confirm bottom conditions with ROV sonar before hook deployment.
        </p>
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] px-3 py-2.5 text-center transition-colors hover:border-[var(--color-ocean-muted)]/30">
      <p className="font-mono text-sm font-bold tabular-nums text-[var(--color-ocean-text)]">{value}</p>
      <p className="mt-0.5 font-mono text-[8px] uppercase tracking-widest text-[var(--color-ocean-muted)]">{label}</p>
    </div>
  );
}
