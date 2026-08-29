"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Compass, Image as ImageIcon, CircleCheck, CircleX, MousePointer2, Check, X, StickyNote } from "lucide-react";
import TelemetryCard from "@/components/telemetry-card";
import { SEVERITY_META, CLASS_COLORS, type SonarTarget, type ViewMode, type DetectionStatus } from "@/lib/targets";
import { EmptyState } from "@/components/analyze-tab-empty";
import SonarPreview from "@/components/sonar-preview";
import AcousticIntensityProfile from "@/components/acoustic-intensity-profile";

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
        const clsColor = CLASS_COLORS[t.label] ?? { stroke: "#6b7280", fill: "rgba(107,114,128,0.12)" };
        const isSelected = t.id === selectedId;
        const status = t.detectionStatus;
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
              className="absolute inset-0 rounded-sm transition-all"
              style={{
                borderColor: status === "false_positive" ? "#6B7280" : clsColor.stroke,
                // Max 8–10% fill so the underlying acoustic texture/shadow stays visible
                backgroundColor: status === "false_positive" ? "rgba(107,114,128,0.05)" : "rgba(42,217,248,0.06)",
                borderStyle: isSelected ? "solid" : "dashed",
                borderWidth: "1.5px",
                boxShadow: isSelected
                  ? `0 0 0 1px ${clsColor.stroke}66, 0 0 12px ${clsColor.stroke}66`
                  : `0 0 6px ${clsColor.stroke}33`,
              }}
            />
            {!dimmed && (
              <div
                className="absolute -top-5 left-0 whitespace-nowrap font-mono text-[10px] font-bold rounded-sm px-1"
                style={{
                  color: status === "false_positive" ? "#9CA3AF" : clsColor.stroke,
                  backgroundColor: "rgba(6,11,18,0.8)",
                }}
              >
                {t.label} [{Math.round(t.confidence * 100)}%]{status === "confirmed" ? " ✓" : status === "false_positive" ? " ✗" : ""}
              </div>
            )}
          </div>
        );
      })}
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
  const [noteInput, setNoteInput] = useState("");
  const noteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [verifyPulseId, setVerifyPulseId] = useState<string | null>(null);
  const verifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Zoomed-in slew target. Only set by an explicit click (box / register row),
  // never by selection alone, so the viewport always loads zoomed-out.
  const [focusId, setFocusId] = useState<string | null>(null);

  const hasUploads = uploadedImages.length > 0;
  const displayTargets = selectedImageUrl
    ? targets.filter((t) => t.imageUrl === selectedImageUrl)
    : targets;
  const selectedTarget = displayTargets.find((t) => t.id === selectedId);

  // Slew-to-cue: when the operator CLICKS a target (box or register row), centre
  // + zoom the viewport onto its box. Passing selection alone (from upload/scan)
  // does NOT zoom — the viewport always loads zoomed-out until the user clicks.
  // ox/oy are the numeric center in image % (0..100); the % strings are derived
  // only for CSS. The numeric values are used to invert the transform so hover
  // coordinates can be reported back in image space. Memoised so the hover
  // useCallback dependency stays stable.
  const focusTarget = displayTargets.find((t) => t.id === focusId) ?? null;
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

  const confirmedCount = displayTargets.filter((t) => t.detectionStatus === "confirmed").length;
  const falsePositiveCount = displayTargets.filter((t) => t.detectionStatus === "false_positive").length;
  const pendingCount = displayTargets.filter((t) => t.detectionStatus === "pending").length;

  useEffect(() => {
    if (selectedTarget) {
      setNoteInput(selectedTarget.note ?? "");
    }
  }, [selectedTarget?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (displayTargets.length === 0) return;
      const idx = displayTargets.findIndex((t) => t.id === selectedId);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = idx < displayTargets.length - 1 ? idx + 1 : 0;
        onSelect(displayTargets[next].id);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = idx > 0 ? idx - 1 : displayTargets.length - 1;
        onSelect(displayTargets[prev].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [displayTargets, selectedId, onSelect]);

  const handleNoteChange = useCallback((value: string) => {
    setNoteInput(value);
    if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current);
    noteTimeoutRef.current = setTimeout(() => {
      if (selectedId) onNoteChange(selectedId, value);
    }, 300);
  }, [selectedId, onNoteChange]);

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
        body="Upload a sonar image — the AI will detect debris and show results here."
        cta="Upload Image"
        onCta={onGoAcquire}
      />
    );
  }

  return (
    <div className="space-y-3">
      {displayTargets.length > 0 && (
        <div className="flex items-center gap-4 rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] px-4 py-2.5 font-mono text-[10px]">
          <span className="text-[var(--color-ocean-muted)] uppercase tracking-wider">Inspector:</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {confirmedCount} confirmed
          </span>
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            {falsePositiveCount} false positive
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-ocean-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ocean-muted)]" />
            {pendingCount} pending
          </span>
          <span className="ml-auto text-[var(--color-ocean-muted)]/60">← → to cycle</span>
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <section className="overflow-hidden rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
            <div className="flex items-center gap-3 border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
              <div className="mr-auto min-w-0">
                <h2 className="font-mono text-xs font-bold text-[var(--color-ocean-text)]">ACOUSTIC VIEWPORT</h2>
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-ocean-muted)]">
                  {selectedImageUrl
                    ? `${displayTargets.length} detection${displayTargets.length !== 1 ? "s" : ""} · ${uploadedImages.find((i) => i.url === selectedImageUrl)?.name ?? "uploaded image"}`
                    : "Upload an image to view detections"}
                </p>
              </div>

              {hasUploads && (
                <div className="flex rounded-sm border border-[var(--color-ocean-border)] bg-[var(--color-ocean-slate)]">
                  {viewModes.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setViewMode(m.key)}
                      className={`px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                        viewMode === m.key
                          ? "bg-[#3709A5] text-white"
                          : "text-[#6B6280] hover:text-[#030507]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              ref={containerRef}
              className="relative h-[380px] select-none overflow-hidden bg-[#060B12] sm:h-[440px]"
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
                      <img
                        src={selectedImageUrl}
                        alt="Uploaded sonar"
                        className="absolute inset-0 h-full w-full object-fill"
                      />
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
                      >
                        <BoundingBoxOverlay targets={displayTargets} selectedId={selectedId} onBoxClick={handleBoxClick} onDeselect={handleDeselect} />
                      </div>
                    </>
                  ) : (
                    <>
                      <img
                        src={selectedImageUrl}
                        alt="Uploaded sonar"
                        className="absolute inset-0 h-full w-full object-fill"
                      />
                      {viewMode === "boxes" && (
                        <BoundingBoxOverlay targets={displayTargets} selectedId={selectedId} onBoxClick={handleBoxClick} onDeselect={handleDeselect} />
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  <SonarPreview opacity={0.3} label="IDLE · SELECT A SURVEY FRAME TO ANALYSE" />
                  <div className="absolute inset-0 grid place-items-center bg-[var(--color-ocean-slate)]/40 p-4">
                    <div className="max-w-sm rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]/90 p-6 text-center glow-border">
                      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded border border-[var(--color-ocean-sky)]/30 bg-[var(--color-ocean-sky)]/10 text-[var(--color-ocean-sky)]">
                        <ImageIcon size={22} />
                      </span>
                      <h3 className="mt-3 font-mono text-sm font-bold text-[var(--color-ocean-text)]">No image selected</h3>
                      <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-[var(--color-ocean-muted)]">
                        Select an uploaded image from the list to view detections.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Dim surrounding non-target seabed when a target is in focus (slew-to-cue).
                  Radial cutout keeps the ROI + selected box bright, dims the rest. */}
              {slew && (
                <div
                  className="slew-dim pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at ${slew.oxPct} ${slew.oyPct}, transparent 0%, transparent 24%, rgba(2,4,8,0.66) 52%, rgba(2,4,8,0.86) 100%)`,
                  }}
                />
              )}

              {/* Legend / mode labels stay above the slew layer */}
              {viewMode !== "compare" && (
                <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-sm bg-[var(--color-ocean-slate)]/90 px-2 py-1 font-mono text-[9px] tracking-wider text-[var(--color-ocean-muted)]">
                  {viewMode === "raw" ? "UPLOADED IMAGE" : "CLICK BOX TO INSPECT"}
                </div>
              )}
              {viewMode === "compare" && (
                <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-sm bg-[var(--color-ocean-slate)]/90 px-2 py-1 font-mono text-[9px] tracking-wider text-[var(--color-ocean-muted)]">
                  DRAG TO COMPARE · RAW ← → AI
                </div>
              )}

              {viewMode === "compare" && (
                <div
                  className="absolute top-0 z-20 flex h-full w-8 -translate-x-1/2 cursor-col-resize flex-col items-center"
                  style={{ left: `${splitPos}%` }}
                  onMouseDown={handleSplitDown}
                  onTouchStart={handleSplitDown}
                >
                  <div className="h-full w-0.5 bg-[#2AD9F8] shadow-[0_0_8px_rgba(42,217,248,0.6)]" />
                  <div className="absolute top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-[#2AD9F8]/60 bg-[var(--color-ocean-card)]/95 shadow-lg">
                    <MousePointer2 size={13} className="text-[#2AD9F8] -rotate-45" />
                  </div>
                </div>
              )}

              <div className="scanlines pointer-events-none absolute inset-0" />
            </div>

            <AcousticIntensityProfile hover={hoverPos} targets={displayTargets} />

            <div className="flex items-center justify-between border-t border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-1.5">
              <span className="font-mono text-[9px] text-[var(--color-ocean-muted)]">
                {selectedImageUrl
                  ? viewMode === "compare"
                    ? "Drag slider to compare raw sonar vs AI detections"
                    : "Click a bounding box to inspect and annotate"
                  : "Upload an image to get started"}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-ocean-muted)]">
                Datum WGS-84
              </span>
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-3 xl:self-start xl:max-h-[calc(100vh-80px)] xl:overflow-y-auto">
          {hasUploads && (
            <section className="overflow-hidden rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)]">
              <div className="border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
                <h3 className="font-mono text-xs font-bold text-[var(--color-ocean-text)]">UPLOADED IMAGES</h3>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-ocean-muted)]">
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
                          <CircleCheck size={14} className="shrink-0 text-[var(--color-ocean-emerald)]" />
                        ) : (
                          <CircleX size={14} className="shrink-0 text-[var(--color-ocean-muted)]/40" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate font-mono text-xs ${isSelected ? "font-bold text-[var(--color-ocean-sky)]" : "text-[var(--color-ocean-text)]"}`}
                          >
                            {img.name}
                          </span>
                          <span className="block font-mono text-[9px] tracking-wide text-[var(--color-ocean-muted)]">
                            {hasDetections
                              ? `${img.targetCount} anomal${img.targetCount === 1 ? "y" : "ies"} found`
                              : "No anomalies detected"}
                          </span>
                        </span>
                        <ChevronRight size={13} className={`shrink-0 ${isSelected ? "text-[var(--color-ocean-sky)]" : "text-[var(--color-ocean-muted)]/40"}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {selectedTarget && (
            <section className="rounded border border-[var(--color-ocean-sky)]/30 bg-[var(--color-ocean-card)]">
              <div className="border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
                <h3 className="font-mono text-xs font-bold text-[var(--color-ocean-sky)]">INSPECT: {selectedTarget.id}</h3>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-ocean-muted)]">
                  {selectedTarget.label} · {Math.round(selectedTarget.confidence * 100)}% confidence
                </p>
              </div>
              <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirm(selectedTarget.id)}
                    className={`${verifyPulseId === selectedTarget.id ? "verify-pulse" : ""} flex flex-1 items-center justify-center gap-1.5 rounded-sm border py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                      selectedTarget.detectionStatus === "confirmed"
                        ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
                        : "border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] text-[var(--color-ocean-muted)] hover:bg-[var(--color-ocean-card)]"
                    }`}
                  >
                    <Check size={12} /> Confirm
                  </button>
                  <button
                    onClick={() => onStatusChange(selectedTarget.id, "false_positive")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm border py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                      selectedTarget.detectionStatus === "false_positive"
                        ? "border-red-500/60 bg-red-500/15 text-red-400"
                        : "border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] text-[var(--color-ocean-muted)] hover:bg-[var(--color-ocean-card)]"
                    }`}
                  >
                    <X size={12} /> False Positive
                  </button>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--color-ocean-muted)]">
                    <StickyNote size={10} /> Analyst Notes
                  </label>
                  <textarea
                    value={noteInput}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    placeholder="Add notes about this detection..."
                    rows={3}
                    className="w-full rounded-sm border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-3 py-2 font-mono text-[11px] text-[var(--color-ocean-text)] placeholder:text-[var(--color-ocean-muted)]/40 focus:border-[var(--color-ocean-sky)] focus:outline-none resize-y"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="rounded-sm bg-[var(--color-ocean-surface)] px-2.5 py-1.5">
                    <span className="text-[var(--color-ocean-muted)]">Depth:</span>{" "}
                    <span className="text-[var(--color-ocean-text)]">{selectedTarget.depthM}m</span>
                  </div>
                  <div className="rounded-sm bg-[var(--color-ocean-surface)] px-2.5 py-1.5">
                    <span className="text-[var(--color-ocean-muted)]">Risk:</span>{" "}
                    <span style={{ color: SEVERITY_META[selectedTarget.severity].stroke }}>{SEVERITY_META[selectedTarget.severity].label}</span>
                  </div>
                  <div className="rounded-sm bg-[var(--color-ocean-surface)] px-2.5 py-1.5">
                    <span className="text-[var(--color-ocean-muted)]">Size:</span>{" "}
                    <span className="text-[var(--color-ocean-text)]">{selectedTarget.dims.length} × {selectedTarget.dims.width}m</span>
                  </div>
                  <div className="rounded-sm bg-[var(--color-ocean-surface)] px-2.5 py-1.5">
                    <span className="text-[var(--color-ocean-muted)]">Lat:</span>{" "}
                    <span className="text-[var(--color-ocean-text)]">{selectedTarget.lat.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] flex-1 min-h-0 overflow-hidden">
            <div className="border-b border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] px-4 py-2.5">
              <h3 className="font-mono text-xs font-bold text-[var(--color-ocean-text)]">REGISTER OF FOUND OBJECTS</h3>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-ocean-muted)]">
                {displayTargets.length} detection{displayTargets.length !== 1 ? "s" : ""}
              </p>
            </div>
            <ul className="divide-y divide-[var(--color-ocean-border)] overflow-y-auto" style={{ maxHeight: "calc(100vh - 560px)", minHeight: "80px" }}>
              {displayTargets.length === 0 && (
                <li className="px-4 py-6 text-center font-mono text-[11px] text-[var(--color-ocean-muted)]">
                  {selectedImageUrl ? "No anomalies in this image." : "Select an image to view detections."}
                </li>
              )}
              {displayTargets.map((t) => {
                const isSel = t.id === selectedId;
                const clsColor = CLASS_COLORS[t.label] ?? { stroke: "#6b7280", fill: "rgba(107,114,128,0.12)" };
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
                      <span className="h-2 w-2 shrink-0 rotate-45" style={{ backgroundColor: clsColor.stroke }} />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate font-mono text-xs ${isSel ? "font-bold text-[var(--color-ocean-sky)]" : "text-[var(--color-ocean-text)]"}`}
                        >
                          {t.label}
                        </span>
                        <span className="block font-mono text-[9px] tracking-wide text-[var(--color-ocean-muted)]">
                          {t.id} · {Math.round(t.confidence * 100)}%
                          {t.detectionStatus === "confirmed" && <span className="ml-1 text-emerald-400">✓ confirmed</span>}
                          {t.detectionStatus === "false_positive" && <span className="ml-1 text-red-400">✗ false +</span>}
                        </span>
                      </span>
                      <ChevronRight size={13} className={`shrink-0 ${isSel ? "text-[var(--color-ocean-sky)]" : "text-[var(--color-ocean-muted)]/40"}`} />
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
