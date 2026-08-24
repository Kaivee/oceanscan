"use client";

import { useCallback, useRef, useState } from "react";
import { Check, FileDown, Radar, TriangleAlert, Upload } from "lucide-react";
import Modal from "./modal";

const VALID_EXT = [".xtf", ".png"];

type Phase = "idle" | "uploading" | "done" | "error";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UploadModal({ open, onClose }: UploadModalProps) {
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startFakeIngest = useCallback((name: string) => {
    setFileName(name);
    setPhase("uploading");
    setProgress(0);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase("done");
          return 100;
        }
        return Math.min(100, p + Math.random() * 14 + 4);
      });
    }, 220);
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const ok = VALID_EXT.some((ext) => file.name.toLowerCase().endsWith(ext));
      if (!ok) {
        setError(`Unsupported format "${file.name.split(".").pop()}". Accepted: .XTF, .PNG`);
        setPhase("error");
        return;
      }
      setError("");
      startFakeIngest(file.name);
    },
    [startFakeIngest],
  );

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("idle");
    setProgress(0);
    setFileName("");
    setError("");
    setDragging(false);
  }, []);

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Upload sonar file"
      subtitle="Edge formats: .XTF (Kongsberg side-scan) · .PNG (processed frame)"
      icon={<Radar size={17} />}
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
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed px-6 py-12 text-center transition ${
              dragging
                ? "border-[#22385c] bg-[#efe6cf]"
                : phase === "error"
                  ? "border-[#b03a2e] bg-[#b03a2e]/[0.06]"
                  : "border-[#22385c]/50 bg-[#f4eddc]/60 hover:border-[#22385c] hover:bg-[#efe6cf]"
            }`}
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full border-2 ${
                phase === "error" ? "border-[#b03a2e] text-[#b03a2e]" : "border-[#22385c] text-[#22385c]"
              }`}
            >
              {phase === "error" ? <TriangleAlert size={26} /> : <Upload size={26} />}
            </span>
            <p className="font-serif text-sm font-bold text-[#1b2a4a]">
              {phase === "error" ? error : "Drop your acoustic capture here"}
            </p>
            <p className="font-mono text-[11px] tracking-wide text-[#8a8574]">
              or click to browse · max 2 GB · .XTF / .PNG
            </p>
          </div>
        ) : (
          <div className="rounded-sm border-2 border-[#22385c]/40 bg-[#f4eddc] p-5">
            <div className="mb-3 flex items-center gap-3">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${
                  phase === "done" ? "border-[#3e6b4f] text-[#3e6b4f]" : "border-[#22385c] text-[#22385c]"
                }`}
              >
                {phase === "done" ? <Check size={22} /> : <FileDown size={22} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs font-bold text-[#22385c]">{fileName}</p>
                <p className="font-mono text-[10px] uppercase tracking-wide text-[#8a8574]">
                  {phase === "done"
                    ? "Queued for ingest → TFM reconstruction → inference"
                    : `Transferring to edge node · ${Math.floor(progress)}%`}
                </p>
              </div>
            </div>
            <div className="h-2 overflow-hidden bg-[#e6ddc8]">
              <div
                className={`h-full transition-all duration-200 ${phase === "done" ? "bg-[#3e6b4f]" : "bg-[#22385c]"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {phase === "done" && (
              <button
                onClick={reset}
                className="mt-4 w-full rounded-sm border-2 border-[#22385c] py-2.5 font-serif text-sm font-bold text-[#22385c] transition hover:bg-[#22385c] hover:text-[#f6f1e7]"
              >
                Ingest another file
              </button>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xtf,.png"
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
