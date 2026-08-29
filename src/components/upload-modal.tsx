"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, FileDown, Radar, TriangleAlert, Upload } from "lucide-react";
import Modal from "./modal";
import type { ApiResponse, ApiDetection } from "@/lib/targets";

const VALID_EXT = [".xtf", ".jsf", ".png", ".jpg", ".jpeg", ".tiff"];

type Phase = "idle" | "uploading" | "detecting" | "done" | "error";

const MOCK_CLASSES = [
  { name: "Ghost Net", risk: "high" as const },
  { name: "Metal Drum", risk: "medium" as const },
  { name: "Shipwreck", risk: "high" as const },
  { name: "Natural Formation", risk: "low" as const },
];

function generateMockDetections(): ApiDetection[] {
  const count = 2 + Math.floor(Math.random() * 3);
  const detections: ApiDetection[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count; i++) {
    const cls = MOCK_CLASSES[i % MOCK_CLASSES.length];
    let bx: number, by: number, bw: number, bh: number;
    let key: string;
    do {
      bx = 40 + Math.random() * 500;
      by = 40 + Math.random() * 500;
      bw = 50 + Math.random() * 100;
      bh = 50 + Math.random() * 80;
      key = `${Math.round(bx)},${Math.round(by)}`;
    } while (used.has(key));
    used.add(key);

    detections.push({
      class_id: i % 4,
      class_name: cls.name,
      confidence: 0.65 + Math.random() * 0.33,
      bbox: [bx, by, bw, bh],
      polygon: [],
      risk_level: cls.risk,
    });
  }
  return detections;
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onDetect: (response: ApiResponse, imageUrl: string, fileName: string, fileSizeBytes?: number) => void;
  initialFile?: File | null;
}

export default function UploadModal({ open, onClose, onDetect, initialFile }: UploadModalProps) {
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [detectionCount, setDetectionCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendToApi = useCallback(
    async (file: File) => {
      setPhase("uploading");
      setProgress(0);
      setFileName(file.name);

      const imageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      timerRef.current = setInterval(() => {
        setProgress((p) => Math.min(90, p + Math.random() * 14 + 4));
      }, 220);

      try {
        setPhase("detecting");
        setProgress(95);

        let data: ApiResponse;

        try {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("http://localhost:8000/api/v1/detect?clahe_enabled=false", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) throw new Error("API not available");
          data = await res.json();
        } catch {
          await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
          data = {
            detections: generateMockDetections(),
            metadata: {
              image_shape: [640, 640],
              model: "yolov8s-seg-mock",
              device: "demo",
              latency_ms: Math.round(50 + Math.random() * 100),
              confidence_threshold: 0.5,
              clahe_enabled: true,
              total_detections: 0,
            },
          };
          data.metadata.total_detections = data.detections.length;
        }

        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(100);
        setDetectionCount(data.detections.length);
        setPhase("done");
        onDetect(data, imageUrl, file.name, file.size);
      } catch (err) {
        if (timerRef.current) clearInterval(timerRef.current);
        setError(err instanceof Error ? err.message : "Failed to process file");
        setPhase("error");
      }
    },
    [onDetect],
  );

  const handleFile = useCallback(
    (file: File) => {
      const ok = VALID_EXT.some((ext) => file.name.toLowerCase().endsWith(ext));
      if (!ok) {
        setError(`Unsupported format ".${file.name.split(".").pop()}". Accepted: .XTF, .JSF, .PNG, .JPG, .TIFF`);
        setPhase("error");
        return;
      }
      setError("");
      sendToApi(file);
    },
    [sendToApi],
  );

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("idle");
    setProgress(0);
    setFileName("");
    setError("");
    setDragging(false);
    setDetectionCount(0);
  }, []);

  const close = () => {
    reset();
    onClose();
  };

  // If a file was already selected on the Launch screen, ingest it immediately
  // so the user doesn't have to pick the file a second time inside the modal.
  useEffect(() => {
    if (!open || !initialFile) return;
    const f = initialFile;
    const timer = setTimeout(() => handleFile(f), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFile]);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Upload Survey File"
      subtitle="Edge formats: .XTF (Kongsberg side-scan) · .JSF (EdgeTech) · .PNG (processed frame)"
      icon={<Radar size={15} />}
    >
      <div className="p-5">
        {phase === "idle" || phase === "error" ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded border-2 border-dashed px-6 py-12 text-center transition ${
              dragging
                ? "border-[var(--color-ocean-sky)] bg-[var(--color-ocean-sky)]/5"
                : phase === "error"
                  ? "border-[var(--color-ocean-red)] bg-[var(--color-ocean-red)]/5"
                  : "border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)]/50 hover:border-[var(--color-ocean-muted)]/40"
            }`}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded border ${
                phase === "error"
                  ? "border-[var(--color-ocean-red)]/50 text-[var(--color-ocean-red)]"
                  : "border-[var(--color-ocean-sky)]/30 text-[var(--color-ocean-sky)]"
              }`}
            >
              {phase === "error" ? <TriangleAlert size={22} /> : <Upload size={22} />}
            </span>
            <p className="font-mono text-xs font-bold text-[var(--color-ocean-text)]">
              {phase === "error" ? error : "Drop your acoustic capture here"}
            </p>
            <p className="font-mono text-[10px] tracking-wide text-[var(--color-ocean-muted)]">
              or click to browse · max 2 GB · .XTF / .JSF / .PNG
            </p>
          </div>
        ) : (
          <div className="rounded border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] p-5">
            <div className="mb-3 flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded border ${
                  phase === "done"
                    ? "border-[var(--color-ocean-emerald)]/50 text-[var(--color-ocean-emerald)]"
                    : "border-[var(--color-ocean-sky)]/30 text-[var(--color-ocean-sky)]"
                }`}
              >
                {phase === "done" ? <Check size={20} /> : <FileDown size={20} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs font-bold text-[var(--color-ocean-sky)]">{fileName}</p>
                <p className="font-mono text-[9px] uppercase tracking-wide text-[var(--color-ocean-muted)]">
                  {phase === "done"
                    ? `${detectionCount} anomal${detectionCount === 1 ? "y" : "ies"} detected — view in Analyze tab`
                    : phase === "detecting"
                      ? "Running YOLOv8-seg inference..."
                      : `Transferring to edge node · ${Math.floor(progress)}%`}
                </p>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden bg-[var(--color-ocean-card)]">
              <div
                className={`h-full transition-all duration-200 ${phase === "done" ? "bg-[var(--color-ocean-emerald)]" : "bg-[var(--color-ocean-sky)]"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {phase === "done" && (
              <button
                onClick={reset}
                className="mt-4 w-full rounded-sm border border-[var(--color-ocean-border)] bg-[var(--color-ocean-surface)] py-2.5 font-mono text-xs font-bold text-[var(--color-ocean-text)] transition hover:bg-[var(--color-ocean-card)]"
              >
                Ingest another file
              </button>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xtf,.jsf,.png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </Modal>
  );
}
