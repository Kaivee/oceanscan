"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp } from "lucide-react";

interface LaunchScreenProps {
  onFileDetect: (file: File) => void;
}

export default function LaunchScreen({ onFileDetect }: LaunchScreenProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      <div className="mx-auto w-full max-w-lg border border-[var(--color-ocean-border)] bg-[var(--color-ocean-card)] p-7 shadow-md">
        <div className="relative">
          <div className="font-mono text-[10px] tracking-[0.2em] text-[#8BE9FD]">
            <span className="text-[#8BE9FD]">[ • </span> HYDROGRAPHIC ACOUSTIC INTELLIGENCE
            <span className="text-[#8BE9FD]">]</span>
          </div>

          <h1 className="mt-3 font-display text-4xl font-semibold leading-none tracking-tight text-[#E6EDF3]">
            OCEANSCAN <span className="text-[#8BE9FD]">AI</span>
          </h1>
          <p className="mt-2 max-w-md font-mono text-[9px] uppercase tracking-[0.2em] text-[#7D8590]">
            Side-Scan Sonar Segmentation &amp; Hazard Triage · ARIS / EdgeTech
          </p>

          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed py-9 text-center transition-colors ${
              dragOver
                ? "border-[#8BE9FD] bg-[#8BE9FD]/[0.06]"
                : "border-[#8BE9FD]/25 bg-[var(--color-ocean-canvas)] hover:border-[#8BE9FD]/60"
            }`}
          >
            <FileUp size={22} className="text-[#8BE9FD]" />
            <p className="font-mono text-xs font-bold text-[#E6EDF3]">
              {dragOver ? "Release to ingest frame" : "Drop sonar frame"}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#7D8590]">
              .XTF · .JSF · .TIFF · .PNG · .JPG
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xtf,.jsf,.tiff,.tif,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          <p className="mt-6 flex items-center gap-2 border-t border-[#8BE9FD]/20 pt-4 font-mono text-[9px] uppercase tracking-[0.18em] text-[#7D8590]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8BE9FD] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8BE9FD]" />
            </span>
            Edge node · TensorRT INT8 · all systems nominal
          </p>
        </div>
      </div>
    </div>
  );
}