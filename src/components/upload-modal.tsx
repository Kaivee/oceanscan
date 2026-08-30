"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResponse } from "@/lib/targets";

const INFERENCE_URL =
  process.env.NEXT_PUBLIC_INFERENCE_URL?.replace(/\/+$/, "") ||
  "http://localhost:8000";

const VALID_EXT = [".xtf", ".jsf", ".png", ".jpg", ".jpeg", ".tiff"];

type Phase = "idle" | "uploading" | "detecting" | "done" | "error";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onDetect: (response: ApiResponse, imageUrl: string, fileName: string) => void;
  initialFile?: File | null;
}

export default function UploadModal({ open, onClose, onDetect, initialFile }: UploadModalProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [detectionCount, setDetectionCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Real edge inference only (POST /api/v1/detect). No fake fallback — if the
  // backend is unreachable we surface an error instead of fabricating detections.
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
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${INFERENCE_URL}/api/v1/detect?clahe_enabled=false`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(`Inference API returned ${res.status}`);
        const data: ApiResponse = await res.json();

        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(100);
        setDetectionCount(data.detections.length);
        setPhase("done");
        onDetect(data, imageUrl, file.name);
      } catch (err) {
        if (timerRef.current) clearInterval(timerRef.current);
        const detail =
          err instanceof Error && err.message
            ? err.message
            : "The inference API could not be reached";
        setError(
          `${detail}. Start the backend at ${INFERENCE_URL} (uvicorn api.main:app) and retry.`,
        );
        setPhase("error");
      }
    },
    [onDetect],
  );

  const handleFile = useCallback(
    (file: File) => {
      if (!VALID_EXT.some((ext) => file.name.toLowerCase().endsWith(ext))) {
        setError(`Unsupported format. Accepted: .XTF, .JSF, .PNG, .JPG, .TIFF`);
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
    setError("");
    setDetectionCount(0);
  }, []);

  const close = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open || !initialFile) return;
    const f = initialFile;
    const timer = setTimeout(() => handleFile(f), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFile]);

  if (!open) return null;

  const center = phase === "idle" || phase === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(20,20,20,0.4)" }}
      onClick={close}
    >
      <div
        className="w-full max-w-[440px]"
        style={{ background: "var(--surface)", border: "1px solid var(--ink)", boxShadow: "0 24px 64px rgba(20,20,20,0.3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid var(--ink)" }}>
          <div>
            <h3 style={{ fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "15px", color: "var(--ink)" }}>
              Ingest Survey Log
            </h3>
            <p style={{ fontFamily: "var(--f-mono)", fontSize: "10px", color: "var(--ink-soft)" }}>
              .XTF · .JSF · .PNG — edge inference
            </p>
          </div>
          <button onClick={close} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--ink-soft)" }}>
            ×
          </button>
        </div>

        <div className="p-5">
          {center ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className="flex cursor-pointer flex-col items-center justify-center text-center"
              style={{
                border: error ? "1.5px dashed var(--signal)" : "1.5px dashed var(--line-strong)",
                background: "var(--surface-2)",
                padding: "36px 20px",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="1.6" aria-hidden="true">
                <path d="M12 16V4 M6 10l6-6 6 6" />
                <path d="M4 20h16" />
              </svg>
              <p className="mt-4" style={{ fontFamily: "var(--f-mono)", fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                {error ? error : "Drop a sonar log here"}
              </p>
              <p className="mt-1" style={{ fontFamily: "var(--f-mono)", fontSize: "11px", color: "var(--ink-soft)" }}>
                or click to browse
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={phase === "done" ? "var(--signal)" : "#141414"} strokeWidth="1.8" aria-hidden="true">
                  {phase === "done" ? <path d="M4 12l5 5L20 6" /> : <circle cx="12" cy="12" r="9" />}
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="truncate" style={{ fontFamily: "var(--f-mono)", fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                    {fileName}
                  </p>
                  <p style={{ fontFamily: "var(--f-mono)", fontSize: "10px", color: "var(--ink-soft)" }}>
                    {phase === "done"
                      ? `${detectionCount} anomal${detectionCount === 1 ? "y" : "ies"} detected`
                      : phase === "detecting"
                        ? "Running inference..."
                        : `Transferring to edge node · ${Math.floor(progress)}%`}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden" style={{ background: "var(--line)" }}>
                <div className="h-full transition-all duration-200" style={{ width: `${progress}%`, background: "var(--signal)" }} />
              </div>
              {phase === "done" && (
                <button
                  onClick={close}
                  className="mt-5 w-full"
                  style={{ background: "var(--ink)", color: "#FFFFFF", padding: "11px", fontFamily: "var(--f-mono)", fontSize: "12px", cursor: "pointer" }}
                >
                  Continue to Frame
                </button>
              )}
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xtf,.jsf,.png,.jpg,.jpeg,.tiff,.tif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
