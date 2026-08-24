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
      title="GeoJSON export payload"
      subtitle={`FeatureCollection · ${targets.length} features · CRS84 (WGS-84)`}
      icon={<Braces size={17} />}
    >
      <div className="p-5">
        <pre className="max-h-[52vh] overflow-auto rounded-sm border-2 border-[#101c30] bg-[#101c30] p-4 font-mono text-[11px] leading-relaxed text-[#c9d8ee]">
          {payload}
        </pre>
        <div className="mt-4 flex gap-2">
          <button
            onClick={copy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm border-2 border-[#22385c] bg-transparent py-2.5 font-serif text-xs font-bold text-[#22385c] transition hover:bg-[#22385c] hover:text-[#f6f1e7]"
          >
            {copied ? <Check size={14} className="text-[#3e6b4f]" /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy payload"}
          </button>
          <button
            onClick={() =>
              downloadText("oceanscan_hazard_export.geojson", payload, "application/geo+json")
            }
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-[#22385c] py-2.5 font-serif text-xs font-bold text-[#f6f1e7] transition hover:bg-[#1b2a4a]"
          >
            <Braces size={14} /> Download .geojson
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
      title="Retrieval path plan"
      subtitle="Priority-weighted nearest-neighbour route for ROV recovery ops"
      icon={<Route size={17} />}
    >
      <div className="p-5">
        <ol className="space-y-2.5">
          {route.legs.map((leg, i) => {
            const t = route.order[i];
            const meta = SEVERITY_META[t.severity];
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-sm border border-[#22385c]/30 bg-[#f4eddc] px-3 py-2.5 transition-colors hover:border-[#22385c]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#22385c] bg-white font-serif text-xs font-bold text-[#22385c]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-[#33415c]">
                    {i === 0 ? "MSV SAGAR-DHWANI" : route.order[i - 1].id}
                    <span className="mx-1.5 text-[#8a8574]">→</span>
                    <span className="font-serif text-sm font-bold italic" style={{ color: meta.stroke }}>
                      {t.id} {t.label}
                    </span>
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[#8a8574]">
                    BRG {Math.round(leg.bearing)}°T · {(leg.distM / 1000).toFixed(2)} km ·{" "}
                    {meta.label} priority · depth {t.depthM} m
                  </p>
                </div>
                <Anchor size={15} className="shrink-0 text-[#22385c]/40" />
              </li>
            );
          })}
        </ol>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Total route" value={`${(route.totalM / 1000).toFixed(2)} km`} />
          <Stat label="Est. ROV time @ 2 kn" value={`${Math.round(route.estMinutes)} min`} />
          <Stat label="Waypoints" value={`${route.order.length}`} />
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-sm border border-[#8a6d1f]/50 bg-[#8a6d1f]/[0.08] p-3 font-serif text-xs italic leading-relaxed text-[#6b5433]">
          <Waypoints size={14} className="mt-0.5 shrink-0 not-italic" />
          High-severity contacts are weighted first; remaining legs minimise transit distance.
          Confirm bottom conditions with ROV sonar before hook deployment.
        </p>
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[#22385c]/40 bg-[#fdfbf6] px-3 py-2.5 text-center transition-colors hover:border-[#22385c]">
      <p className="font-serif text-sm font-bold tabular-nums text-[#1b2a4a]">{value}</p>
      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-[#8a8574]">{label}</p>
    </div>
  );
}
