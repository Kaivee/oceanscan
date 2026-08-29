"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronRight, Compass, Image as ImageIcon, CircleCheck, CircleX, MousePointer2, Check, X, StickyNote, Stamp } from "lucide-react";
import TelemetryCard from "@/components/telemetry-card";
import { SEVERITY_META, swathPosition, estimateSurveyAreaSqm, type SonarTarget, type ViewMode, type DetectionStatus } from "@/lib/targets";
import { EmptyState } from "@/components/analyze-tab-empty";
import SonarPreview from "@/components/sonar-preview";
import AcousticIntensityProfile from "@/components/acoustic-intensity-profile";
import RadialGainDial from "@/components/radial-gain-dial";
import SwathCone, { coneColorForSeverity } from "@/components/swath-cone";

interface UploadedImage {
  name: string;
  url: string;
  targetCount: number;
}

interface AnalyzeTabProps {
  targets: (SonarTarget & { detectionStatus: DetectionStatus })[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onGoAcquire: () => void;
  uploadedImages: UploadedImage[];
  selectedImageUrl: string | null;
  onSelectImage: (url: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onStatusChange: (id: string, status: DetectionStatus) => void;
}

function BoundingBoxOverlay({
  targets,
  selectedId,
  onBoxClick,
  onDeselect,
}: {
  targets: (SonarTarget & { detectionStatus: DetectionStatus })[];
  selectedId: string | null;
  onBoxClick: (id: string) => void;
  onDeselect: () => void;
}) {
  return (
    <div
      className="absolute inset-0"
      style={{ pointerEvents: "auto" }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onDeselect(); }}
    >
      {targets.map((t) => {
        const meta = SEVERITY_META[t.severity];
        const isFP = t.detectionStatus === "false_positive";
        const stroke = isFP ? "#A8B4BD" : meta.stroke;
        const fill = isFP ? "rgba(168,180,189,0.05)" : meta.fill;
        const isSelected = t.id === selectedId;
        // During slew-to-cue focus, dim every non-selected box so there is no
        // ambiguity about which target the viewport has slewed onto.
        const dimmed = selectedId != null && !isSelected;
        return (
          <div
            key={t.id}
            onClick={(e) => { e.stopPropagation(); onBoxClick(t.id); }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`absolute cursor-pointer transition-opacity duration-300 ${dimmed ? "opacity-25" : "opacity-100"}`}
            style={{
              left: `${t.box.x}%`,
              top: `${t.box.y}%`,
              width: `${t.box.w}%`,
              height: `${t.box.h}%`,
            }}
          >
            <div
              className="absolute inset-0 transition-all"
              style={{
                borderColor: stroke,
                // Light fill so the underlying acoustic texture/shadow stays visible
                backgroundColor: fill,
                borderStyle: isSelected ? "solid" : "dashed",
                borderWidth: "1.5px",
                boxShadow: isSelected
                  ? `0 0 0 1px ${stroke}66, 0 0 12px ${stroke}66`
                  : `0 0 6px ${stroke}33`,
              }}
            />
            {!dimmed && (
              <div
                className="absolute -top-5 left-0 whitespace-nowrap font-mono text-[10px] font-bold px-1 border"
                style={{
                  color: stroke,
                  backgroundColor: "rgba(6,11,18,0.85)",
                  borderColor: `${stroke}55`,
                }}
              >
                {t.label} [{Math.round(t.confidence * 100)}%]{t.detectionStatus === "confirmed" ? " ✓" : t.detectionStatus === "false_positive" ? " ✗" : ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DepthRuler({ maxDepth = 60 }: { maxDepth?: number }) {
  const ticks = Array.from({ length: 7 }, (_, i) => Math.round((maxDepth / 6) * (6 - i)));
  return (
    <div className="col-start-1 row-start-1 flex flex-col items-stretch border-r border-[#2A4158] bg-[#0B1726]">
      <p className="px-1 pt-1 font-mono text-[7px] uppercase tracking-widest text-[#7FD9CD]/70 [writing-mode:vertical-rl]">
        DEPTH · M
      </p>
      <div className="relative flex flex-1 flex-col items-stretch justify-between py-1 font-mono">
        {ticks.map((m, i) => (
          <div key={m} className="flex items-center">
            <span className={`px-1 text-[8px] tabular-nums ${i === 0 ? "text-[#C97A12]" : "text-[#7FD9CD]/85"}`}>{m}</span>
            <span className="h-px w-1.5 bg-[#5FD4C4]/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SwathRuler() {
  return (
    <div className="col-start-2 row-start-2 flex items-center justify-between border-t border-[#2A4158] bg-[#0B1726] px-2 font-mono">
      {["-25M", "-12.5M", "NADIR", "+12.5M", "+25M"].map((l, i) => (
        <span key={l} className={`text-[8px] tabular-nums ${i === 2 ? "font-bold text-[#5FD4C4]" : "text-[#7FD9CD]/85"}`}>
          {i === 2 ? "● " : ""}{l}
        </span>
      ))}
    </div>
  );
}

export default function AnalyzeTab({
  targets,
  selectedId,
  onSelect,
  onGoAcquire,
  uploadedImages,
  selectedImageUrl,
  onSelectImage,
  onNoteChange,
  onStatusChange,
}: AnalyzeTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("raw");
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitPos, setSplitPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPos, setHoverPos] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [verifyPulseId, setVerifyPulseId] = useState<string | null>(null);
  const verifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Confidence gate — radial dial filters which contacts are exposed.
  const [confGate, setConfGate] = useState(0);
  // Zoomed-in slew target. Only set by an explicit click (box / register row),
  // never by selection alone, so the viewport always loads zoomed-out.
  const [focusId, setFocusId] = useState<string | null>(null);
  // The record is a fixed capture — stamp the time it was presented once.
  const [capturedAt] = useState(() => {
    const d = new Date();
    return [String(d.getUTCHours()).padStart(2, "0"), String(d.getUTCMinutes()).padStart(2, "0"), String(d.getUTCSeconds()).padStart(2, "0")].join(":");
  });

  const hasUploads = uploadedImages.length > 0;
  const displayTargets = useMemo(
    () =>
      selectedImageUrl
        ? targets.filter((t) => t.imageUrl === selectedImageUrl)
        : targets,
    [targets, selectedImageUrl],
  );
  const gatedTargets = useMemo(
    () => displayTargets.filter((t) => t.confidence * 100 >= confGate),
    [displayTargets, confGate],
  );
  const selectedTarget = displayTargets.find((t) => t.id === selectedId);

  // Slew-to-cue: when the operator CLICKS a target (box or register row), centre
  // + zoom the viewport onto its box. Passing selection alone (from upload/scan)
  // does NOT zoom — the viewport always loads zoomed-out until the user clicks.
  // ox/oy are the numeric center in image % (0..100); the % strings are derived
  // only for CSS. The numeric values are used to invert the transform so hover
  // coordinates can be reported back in image space. Memoised so the hover
  // useCallback dependency stays stable.
  const focusTarget = gatedTargets.find((t) => t.id === focusId) ?? null;
  const slew = useMemo(
    () =>
      focusTarget
        ? {
            id: focusTarget.id,
            ox: focusTarget.box.x + focusTarget.box.w / 2,
            oy: focusTarget.box.y + focusTarget.box.h / 2,
            oxPct: `${focusTarget.box.x + focusTarget.box.w / 2}%`,
            oyPct: `${focusTarget.box.y + focusTarget.box.h / 2}%`,
            scale: 1.5,
          }
        : null,
    [focusTarget],
  );

  const confirmedCount = gatedTargets.filter((t) => t.detectionStatus === "confirmed").length;
  const falsePositiveCount = gatedTargets.filter((t) => t.detectionStatus === "false_positive").length;
  const pendingCount = gatedTargets.filter((t) => t.detectionStatus === "pending").length;

  const manifest = useMemo(() => {
    const high = displayTargets.filter((t) => t.severity === "high").length;
    const medium = displayTargets.filter((t) => t.severity === "medium").length;
    const low = displayTargets.filter((t) => t.severity === "low").length;
    return { areaSqm: estimateSurveyAreaSqm(uploadedImages.length), high, medium, low, total: displayTargets.length };
  }, [displayTargets, uploadedImages.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (gatedTargets.length === 0) return;
      const idx = gatedTargets.findIndex((t) => t.id === selectedId);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = idx < gatedTargets.length - 1 ? idx + 1 : 0;
        onSelect(gatedTargets[next].id);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = idx > 0 ? idx - 1 : gatedTargets.length - 1;
        onSelect(gatedTargets[prev].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gatedTargets, selectedId, onSelect]);

  const handleBoxClick = useCallback((id: string) => {
    onSelect(id === selectedId ? null : id);
    setFocusId(id === focusId ? null : id);
  }, [onSelect, selectedId, focusId]);

  const handleDeselect = useCallback(() => {
    onSelect(null);
    setFocusId(null);
  }, [onSelect]);

  // Report the cursor as IMAGE-space percent (0..100) so it lines up with the
  // target boxes / intensity profile even when the viewport is zoomed. Under a
  // slew transform (scale about image center ox,oy), a viewport fraction v maps
  // back to image fraction as ox + (v - ox)/scale.
  const handleViewportHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let vx = ((e.clientX - rect.left) / rect.width) * 100;
    let vy = ((e.clientY - rect.top) / rect.height) * 100;
    if (slew) {
      vx = slew.ox + (vx - slew.ox) / slew.scale;
      vy = slew.oy + (vy - slew.oy) / slew.scale;
    }
    setHoverPos({ x: Math.max(0, Math.min(100, vx)), y: Math.max(0, Math.min(100, vy)) });
  }, [slew]);

  const handleViewportLeave = useCallback(() => setHoverPos({ x: null, y: null }), []);

  const handleConfirm = useCallback(
    (id: string) => {
      onStatusChange(id, "confirmed");
      setVerifyPulseId(id);
      if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
      verifyTimerRef.current = setTimeout(() => setVerifyPulseId(null), 650);
    },
    [onStatusChange],
  );

  const handleSplitDrag = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      setSplitPos(pct);
    },
    [],
  );

  const handleSplitDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      setIsDragging(true);
      handleSplitDrag(e);
    },
    [handleSplitDrag],
  );

  const handleSplitMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (isDragging) handleSplitDrag(e);
    },
    [isDragging, handleSplitDrag],
  );

  const handleSplitUp = useCallback(() => setIsDragging(false), []);

  const viewModes: { key: ViewMode; label: string }[] = [
    { key: "raw", label: "Raw Sonar" },
    { key: "boxes", label: "Bounding Boxes" },
    ...(selectedImageUrl && displayTargets.length > 0 ? [{ key: "compare" as ViewMode, label: "Compare" } as const] : []),
  ];

  if (!hasUploads && targets.length === 0) {
    return (
      <EmptyState
        icon={<Compass size={24} />}
        title="Nothing to analyse yet"
        body="Upload a sonar survey — the AI will detect debris and show results here."
        cta="Upload Survey"
        onCta={onGoAcquire}
      />
    );
  }

  return (
    <div className="space-y-3">
      {displayTargets.length > 0 && (
        <div className="flex items-center gap-4 border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] px-4 py-2.5 font-mono text-[10px]">
          <span className="text-[#45566A] uppercase tracking-wider">Inspector:</span>
          <span className="flex items-center gap-1.5 text-[#0E6BA8]">
            <span className="h-1.5 w-1.5 bg-[#0E6BA8]" />
            {confirmedCount} confirmed
          </span>
          <span className="flex items-center gap-1.5 text-[#E63946]">
            <span className="h-1.5 w-1.5 bg-[#E63946]" />
            {falsePositiveCount} false positive
          </span>
          <span className="flex items-center gap-1.5 text-[#45566A]">
            <span className="h-1.5 w-1.5 bg-[#45566A]" />
            {pendingCount} pending
          </span>
          <span className="ml-auto text-[#45566A]/70">← → to cycle</span>
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_372px]">
        <div className="min-w-0">
          <section className="overflow-hidden border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
            <div className="flex items-center gap-3 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
              <div className="mr-auto min-w-0">
                <h2 className="font-display text-sm font-semibold tracking-wide text-[#10202E]">ACOUSTIC VIEWPORT</h2>
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-[#45566A]">
                  {selectedImageUrl
                    ? `CAPTURED RECORD · ${uploadedImages.find((i) => i.url === selectedImageUrl)?.name ?? "uploaded image"} · ${gatedTargets.length} detection${gatedTargets.length !== 1 ? "s" : ""}`
                    : "Upload a survey frame to analyse"}
                </p>
              </div>

              {hasUploads && (
                <div className="flex border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
                  {viewModes.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setViewMode(m.key)}
                      className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                        viewMode === m.key
                          ? "bg-[#0E6BA8] text-white"
                          : "text-[#45566A] hover:text-[#10202E]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative grid h-[380px] select-none overflow-hidden bg-[var(--color-ocean-console)] sm:h-[440px] grid-cols-[30px_1fr] grid-rows-[1fr_24px]">
              <DepthRuler />
              <SwathRuler />
              <div className="col-start-1 row-start-2 flex items-center justify-center border-r border-t border-[#2A4158] bg-[#0B1726]">
                <span className="font-mono text-[7px] uppercase tracking-widest text-[#7FD9CD]/50">X-RANGE</span>
              </div>

              <div
                ref={containerRef}
                className="relative col-start-2 row-start-1 overflow-hidden"
                onMouseMove={(e) => {
                  handleSplitMove(e);
                  handleViewportHover(e);
                }}
                onMouseUp={handleSplitUp}
                onMouseLeave={() => {
                  handleSplitUp();
                  handleViewportLeave();
                }}
                onTouchMove={handleSplitMove}
                onTouchEnd={handleSplitUp}
              >
                {selectedImageUrl ? (
                  <div
                    key={slew?.id ?? "nofocus"}
                    className={`absolute inset-0 ${slew ? "slew-focus" : ""}`}
                    style={
                      slew
                        ? {
                            transform: `scale(${slew.scale})`,
                            transformOrigin: `${slew.oxPct} ${slew.oyPct}`,
                            "--slew-ox": slew.oxPct,
                            "--slew-oy": slew.oyPct,
                          } as React.CSSProperties
                        : undefined
                    }
                  >
                    {viewMode === "compare" ? (
                      <>
                        <Image
                          src={selectedImageUrl}
                          alt="Uploaded sonar"
                          fill
                          unoptimized
                          priority
                          className="object-fill"
                        />
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
                        >
                          <BoundingBoxOverlay targets={gatedTargets} selectedId={selectedId} onBoxClick={handleBoxClick} onDeselect={handleDeselect} />
                        </div>
                      </>
                    ) : (
                      <>
                        <Image
                          src={selectedImageUrl}
                          alt="Uploaded sonar"
                          fill
                          unoptimized
                          priority
                          className="object-fill"
                        />
                        {viewMode === "boxes" && (
                          <BoundingBoxOverlay targets={gatedTargets} selectedId={selectedId} onBoxClick={handleBoxClick} onDeselect={handleDeselect} />
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <SonarPreview opacity={0.3} label="IDLE · SELECT A SURVEY FRAME TO ANALYSE" />
                    <div className="absolute inset-0 grid place-items-center bg-[var(--color-ocean-card)]/40 p-4">
                      <div className="max-w-sm border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] p-6 text-center glow-border">
                        <span className="mx-auto flex h-11 w-11 items-center justify-center border border-[#5FD4C4]/40 bg-[#5FD4C4]/10 text-[var(--color-ocean-sky)]">
                          <ImageIcon size={22} />
                        </span>
                        <h3 className="mt-3 font-display text-sm font-semibold text-[#10202E]">No image selected</h3>
                        <p className="mt-1.5 font-sans text-[11px] leading-relaxed text-[#45566A]">
                          Select an uploaded image from the list to view detections.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {slew && (
                  <div
                    className="slew-dim pointer-events-none absolute inset-0"
                    style={{
                      background: `radial-gradient(circle at ${slew.oxPct} ${slew.oyPct}, transparent 0%, transparent 24%, rgba(2,4,8,0.66) 52%, rgba(2,4,8,0.86) 100%)`,
                    }}
                  />
                )}

                {viewMode !== "compare" && (
                  <div className="pointer-events-none absolute left-2 top-2 z-10 border bg-[var(--color-ocean-card)]/90 px-2 py-1 font-mono text-[9px] tracking-wider text-[#10202E] backdrop-blur">
                    {viewMode === "raw" ? (
                      <span className="text-[#0E6BA8]">[CAPTURED RECORD // UTC {capturedAt}]</span>
                    ) : (
                      "CLICK BOX TO INSPECT"
                    )}
                  </div>
                )}
                {viewMode === "compare" && (
                  <div className="pointer-events-none absolute left-2 top-2 z-10 border bg-[var(--color-ocean-card)]/90 px-2 py-1 font-mono text-[9px] tracking-wider text-[#0E6BA8]">
                    [CAPTURED RECORD // UTC {capturedAt}] · DRAG TO COMPARE
                  </div>
                )}

                {viewMode === "compare" && (
                  <div
                    className="absolute top-0 z-20 flex h-full w-8 -translate-x-1/2 cursor-col-resize flex-col items-center"
                    style={{ left: `${splitPos}%` }}
                    onMouseDown={handleSplitDown}
                    onTouchStart={handleSplitDown}
                  >
                    <div className="h-full w-0.5 bg-[#5FD4C4] shadow-[0_0_8px_rgba(95,212,196,0.6)]" />
                    <div className="absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center border border-[#5FD4C4]/70 bg-[var(--color-ocean-card)]/95 shadow-lg -rotate-45">
                      <MousePointer2 size={13} className="text-[#5FD4C4] -rotate-45" />
                    </div>
                  </div>
                )}

                <div className="scanlines pointer-events-none absolute inset-0" />
              </div>
            </div>

            <AcousticIntensityProfile hover={hoverPos} targets={displayTargets} />

            <div className="flex items-center justify-between border-t border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-1.5">
              <span className="font-mono text-[9px] text-[#45566A]">
                {selectedImageUrl
                  ? viewMode === "compare"
                    ? "Drag slider to compare raw sonar vs AI detections"
                    : "Fixed record — click a bounding box to inspect and annotate"
                  : "Upload a survey to get started"}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#45566A]">
                Datum WGS-84
              </span>
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-3 xl:self-start xl:max-h-[calc(100vh-80px)] xl:overflow-y-auto">
          {/* Survey Manifest — ruled ticket ledger */}
          <section className="border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
            <div className="flex items-center gap-3 border-b border-dashed border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
              <div className="mr-auto min-w-0">
                <h3 className="font-display text-xs font-semibold tracking-wide text-[#10202E]">SURVEY MANIFEST</h3>
                <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#45566A]">
                  ruled ledger · coordinate record
                </p>
              </div>
              <span className="border border-[#0E6BA8]/30 bg-[#0E6BA8]/5 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-[#0E6BA8]">
                TKT-{String(manifest.total).padStart(3, "0")}
              </span>
            </div>

            <div className="px-4 py-3">
              <LedgerRow label="Area surveyed" value={`${manifest.areaSqm.toLocaleString()} m²`} />
              <LedgerRow label="Total contacts" value={`${manifest.total}`} strong />
              <div className="my-2 border-t border-dashed border-[var(--color-ocean-border)]" />
              <LedgerRow label="High risk" value={`${manifest.high}`} valueClass="text-[#E63946]" />
              <LedgerRow label="Medium risk" value={`${manifest.medium}`} valueClass="text-[#C97A12]" />
              <LedgerRow label="Low risk" value={`${manifest.low}`} valueClass="text-[#0E6BA8]" />
              <div className="my-2 border-t border-dashed border-[var(--color-ocean-border)]" />
              <div className="-rotate-2 border-2 border-[#0E6BA8]/50 px-2 py-1 text-center font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-[#0E6BA8]">
                <Stamp size={9} className="mr-1 inline -translate-y-px" />
                VERIFIED // AI-ASSISTED REVIEW REQUIRED
              </div>
            </div>
          </section>

          {/* Signal gate — radial gain */}
          <section className="flex items-center gap-4 border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] p-3">
            <RadialGainDial value={confGate} onChange={setConfGate} label="CONF. GATE" size={86} />
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold text-[#10202E]">Confidence threshold</p>
              <p className="mt-0.5 font-mono text-[9px] leading-relaxed text-[#45566A]">
                Only contacts scoring ≥ {confGate}% are exposed.
              </p>
              {confGate > 0 && gatedTargets.length < displayTargets.length && (
                <p className="mt-1 font-mono text-[8px] uppercase tracking-wider text-[#C97A12]">
                  {displayTargets.length - gatedTargets.length} masked by gate
                </p>
              )}
            </div>
          </section>

          {hasUploads && (
            <section className="overflow-hidden border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
              <div className="border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
                <h3 className="font-mono text-[11px] font-bold tracking-wide text-[#10202E]">UPLOADED IMAGES</h3>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#45566A]">
                  {uploadedImages.length} file{uploadedImages.length !== 1 ? "s" : ""} · click to view
                </p>
              </div>
              <ul className="divide-y divide-[var(--color-ocean-border)]">
                {uploadedImages.map((img) => {
                  const isSelected = img.url === selectedImageUrl;
                  const hasDetections = img.targetCount > 0;
                  return (
                    <li key={img.url}>
                      <button
                        onClick={() => {
                          setFocusId(null);
                          onSelectImage(img.url);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isSelected ? "bg-[var(--color-ocean-surface)]" : "hover:bg-[var(--color-ocean-surface)]/50"
                        }`}
                      >
                        {hasDetections ? (
                          <CircleCheck size={14} className="shrink-0 text-[#0E6BA8]" />
                        ) : (
                          <CircleX size={14} className="shrink-0 text-[#45566A]/40" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate font-mono text-xs ${isSelected ? "font-bold text-[#0E6BA8]" : "text-[#10202E]"}`}
                          >
                            {img.name}
                          </span>
                          <span className="block font-mono text-[9px] tracking-wide text-[#45566A]">
                            {hasDetections
                              ? `${img.targetCount} anomal${img.targetCount === 1 ? "y" : "ies"} found`
                              : "No anomalies detected"}
                          </span>
                        </span>
                        <ChevronRight size={13} className={`shrink-0 ${isSelected ? "text-[#0E6BA8]" : "text-[#45566A]/40"}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {selectedTarget && (
            <section className="border border-[#5FD4C4]/40 bg-[var(--color-ocean-card)]">
              <div className="border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
                <h3 className="font-mono text-[11px] font-bold text-[#0E6BA8]">INSPECT: {selectedTarget.id}</h3>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#45566A]">
                  {selectedTarget.label} · {Math.round(selectedTarget.confidence * 100)}% confidence
                </p>
              </div>
              <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirm(selectedTarget.id)}
                    className={`${verifyPulseId === selectedTarget.id ? "verify-pulse" : ""} flex flex-1 items-center justify-center gap-1.5 border py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                      selectedTarget.detectionStatus === "confirmed"
                        ? "border-[#0E6BA8]/60 bg-[#0E6BA8]/10 text-[#0E6BA8]"
                        : "border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] text-[#45566A] hover:bg-[var(--color-ocean-card)]"
                    }`}
                  >
                    <Check size={12} /> Confirm
                  </button>
                  <button
                    onClick={() => onStatusChange(selectedTarget.id, "false_positive")}
                    className={`flex flex-1 items-center justify-center gap-1.5 border py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                      selectedTarget.detectionStatus === "false_positive"
                        ? "border-[#E63946]/60 bg-[#E63946]/10 text-[#E63946]"
                        : "border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] text-[#45566A] hover:bg-[var(--color-ocean-card)]"
                    }`}
                  >
                    <X size={12} /> False Positive
                  </button>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#45566A]">
                    <StickyNote size={10} /> Analyst Notes
                  </label>
                  <NoteEditor
                    key={selectedTarget.id}
                    initial={selectedTarget.note ?? ""}
                    onCommit={(value) => onNoteChange(selectedTarget.id, value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-2.5 py-1.5">
                    <span className="text-[#45566A]">Depth:</span>{" "}
                    <span className="text-[#10202E]">{selectedTarget.depthM}m</span>
                  </div>
                  <div className="border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-2.5 py-1.5">
                    <span className="text-[#45566A]">Risk:</span>{" "}
                    <span style={{ color: SEVERITY_META[selectedTarget.severity].stroke }}>{SEVERITY_META[selectedTarget.severity].label}</span>
                  </div>
                  <div className="border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-2.5 py-1.5">
                    <span className="text-[#45566A]">Size:</span>{" "}
                    <span className="text-[#10202E]">{selectedTarget.dims.length} × {selectedTarget.dims.width}m</span>
                  </div>
                  <div className="border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-2.5 py-1.5">
                    <span className="text-[#45566A]">Lat:</span>{" "}
                    <span className="text-[#10202E]">{selectedTarget.lat.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="flex-1 min-h-0 overflow-hidden border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
            <div className="flex items-center gap-2 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
              <h3 className="font-mono text-[11px] font-bold tracking-wide text-[#10202E]">REGISTER OF FOUND OBJECTS</h3>
              <p className="ml-auto font-mono text-[8px] uppercase tracking-widest text-[#45566A]">
                {gatedTargets.length} / {displayTargets.length} contact{gatedTargets.length !== 1 ? "s" : ""}
              </p>
            </div>
            <ul className="divide-y divide-[var(--color-ocean-border)] overflow-y-auto" style={{ maxHeight: "calc(100vh - 560px)", minHeight: "80px" }}>
              {gatedTargets.length === 0 && (
                <li className="px-4 py-6 text-center font-mono text-[11px] text-[#45566A]">
                  {displayTargets.length === 0
                    ? "Select an image to view detections."
                    : confGate > 0
                      ? `All contacts masked by the ${confGate}% confidence gate.`
                      : "No anomalies in this image."}
                </li>
              )}
              {gatedTargets.map((t) => {
                const isSel = t.id === selectedId;
                const pos = swathPosition(t);
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        onSelect(isSel ? null : t.id);
                        setFocusId(isSel ? null : t.id);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSel ? "bg-[var(--color-ocean-surface)]" : "hover:bg-[var(--color-ocean-surface)]/50"
                      }`}
                    >
                      <SwathCone position={pos} color={coneColorForSeverity(t.severity)} />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate font-mono text-xs ${isSel ? "font-bold text-[#0E6BA8]" : "text-[#10202E]"}`}
                        >
                          {t.label}
                        </span>
                        <span className="block font-mono text-[9px] tracking-wide text-[#45566A]">
                          {t.id} · {pos.toUpperCase()} OFFSET · {Math.round(t.confidence * 100)}%
                          {t.detectionStatus === "confirmed" && <span className="ml-1 text-[#0E6BA8]">✓ confirmed</span>}
                          {t.detectionStatus === "false_positive" && <span className="ml-1 text-[#E63946]">✗ false +</span>}
                        </span>
                      </span>
                      <ChevronRight size={13} className={`shrink-0 ${isSel ? "text-[#0E6BA8]" : "text-[#45566A]/40"}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <TelemetryCard target={selectedTarget ?? null} />
        </div>
      </div>
    </div>
  );
}

function LedgerRow({
  label,
  value,
  strong = false,
  valueClass = "text-[#10202E]",
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline gap-2 py-[5px] font-mono text-[10px]">
      <span className={`shrink-0 uppercase tracking-wide ${strong ? "font-bold text-[#10202E]" : "text-[#45566A]"}`}>{label}</span>
      <span className="mx-1 flex-1 border-b border-dotted border-[#B9C6D2]" />
      <span className={`shrink-0 tabular-nums ${strong ? "font-bold" : "font-semibold"} ${valueClass}`}>{value}</span>
    </div>
  );
}

function NoteEditor({
  initial,
  onCommit,
}: {
  initial: string;
  onCommit: (value: string) => void;
}) {
  const [note, setNote] = useState(initial);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <textarea
      value={note}
      onChange={(e) => {
        const value = e.target.value;
        setNote(value);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => onCommit(value), 300);
      }}
      placeholder="Add notes about this detection..."
      rows={3}
      className="w-full resize-y border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-3 py-2 font-mono text-[11px] text-[#10202E] placeholder:text-[#45566A]/40 focus:border-[#0E6BA8] focus:outline-none"
    />
  );
}