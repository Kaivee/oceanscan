"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp } from "lucide-react";

interface LaunchScreenProps {
  onFileDetect: (file: File) => void;
}

export default function LaunchScreen({ onFileDetect }: LaunchScreenProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Card spotlight — set CSS vars directly on the DOM, no re-render.
  const handleCardMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--glow-x", `${e.clientX - r.left}px`);
    el.style.setProperty("--glow-y", `${e.clientY - r.top}px`);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && /\.(xtf|jsf|tiff?|png)$/i.test(f.name)) onFileDetect(f);
  }, [onFileDetect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileDetect(f);
  }, [onFileDetect]);

  return (
    <div className="launch-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      {/* Centered ingestion card */}
      <div
        ref={cardRef}
        onMouseMove={handleCardMove}
        className="relative mx-auto w-full max-w-lg rounded-lg border border-[#3709A5]/15 bg-[#FFFFFF] p-7 shadow-md"
      >
        {/* Cursor-following radial spotlight */}
        <div
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{
            background:
              "radial-gradient(150px circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(55,9,165,0.07), transparent 70%)",
          }}
        />

        <div className="relative">
          <div className="font-mono text-[10px] tracking-[0.2em] text-[#3709A5]">
            <span className="text-[#3709A5]">[ ✦ </span> HYDROGRAPHIC ACOUSTIC INTELLIGENCE
            <span className="text-[#3709A5]">]</span>
          </div>

          <h1 className="mt-3 font-sans text-4xl font-bold leading-none tracking-tight text-[#030507]">
            OCEANSCAN <span className="text-[#2AD9F8]">AI</span>
          </h1>
          <p className="mt-2 max-w-md font-sans text-xs text-[#6B6280]">
            Autonomous Side-Scan Sonar Segmentation &amp; Hazard Triage
          </p>

          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed py-9 text-center transition-colors ${
              dragOver
                ? "border-[#3709A5] bg-[#3709A5]/[0.06]"
                : "border-[#3709A5]/25 bg-[#F3F0F9] hover:border-[#3709A5]/60"
            }`}
          >
            <FileUp size={22} className="text-[#3709A5]" />
            <p className="font-mono text-xs font-bold text-[#030507]">
              {dragOver ? "Release to ingest frame" : "Drop sonar frame"}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#6B6280]">
              .XTF · .JSF · .TIFF · .PNG
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xtf,.jsf,.tiff,.tif,.png"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* 1-click benchmark presets: removed — synthetic survey loaders were
              fake/buggy and provided no real data. Use a real upload instead. */}

          <p className="mt-6 flex items-center gap-2 border-t border-[#3709A5]/12 pt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-[#6B6280]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
            </span>
            Edge node · TensorRT INT8 · all systems nominal
          </p>
        </div>
      </div>
    </div>
  );
}
