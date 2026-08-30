"use client";

import { useCallback, useRef, useState } from "react";
import { SAMPLE_SURVEY } from "@/lib/targets";

interface LaunchScreenProps {
  onFileChosen: (file: File) => void;
  onLoadSample: () => void;
}

const RECENT = [
  { file: "LN-014 · ARIS3K-9.XTF", when: "TODAY 09:40", contacts: 3 },
  { file: "LN-011 · Harbour-East.JSF", when: "TODAY 08:12", contacts: 1 },
  { file: "LN-009 · Reef-North.XTF", when: "YESTERDAY 17:04", contacts: 2 },
];

function RadarRings() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg width="720" height="720" viewBox="0 0 720 720" aria-hidden="true">
          {[44, 84, 124, 164, 204, 244, 284, 324].map((r) => (
            <circle
              key={r}
              cx="360"
              cy="360"
              r={r}
              fill="none"
              stroke="#141414"
              strokeWidth="1"
              opacity="0.05"
            />
          ))}
          {[0, 1, 2, 3].map((i) => (
            <circle
              key={i}
              cx="360"
              cy="360"
              r="60"
              fill="none"
              stroke="#FF5A1F"
              strokeWidth="1.4"
              opacity="0.5"
              className="ringpulse"
              style={{ animationDelay: `${i * 1.25}s` }}
            />
          ))}
          <line x1="360" y1="360" x2="360" y2="20" stroke="#141414" strokeWidth="1" opacity="0.12" />
          <line x1="360" y1="360" x2="680" y2="360" stroke="#141414" strokeWidth="1" opacity="0.12" />
        </svg>
        <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2"
          style={{ background: "#FF5A1F" }}
        />
      </div>
    </div>
  );
}

export default function LaunchScreen({ onFileChosen, onLoadSample }: LaunchScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (file?: File | null) => {
      if (file) onFileChosen(file);
    },
    [onFileChosen],
  );

  const validExt = (name: string) => /\.(xtf|jsf|png|jpg|jpeg|tiff)$/i.test(name);

  return (
    <div className="relative flex min-h-[calc(100vh-65px)] flex-col items-center justify-center px-6 py-16"
      style={{ background: "var(--bg)" }}
    >
      <RadarRings />

      <div className="relative z-10 flex max-w-3xl flex-col items-center text-center">
        <p
          className="uppercase"
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: "11px",
            letterSpacing: "0.16em",
            color: "var(--ink-soft)",
          }}
        >
          Hydrographic Debris Survey
        </p>
        <h1
          className="mt-5 max-w-2xl leading-[1.04] tracking-[-0.02em]"
          style={{ fontFamily: "var(--f-display)", fontSize: "44px", fontWeight: 800, color: "var(--ink)" }}
        >
          Find the <span style={{ color: "var(--signal)" }}>ghost nets</span> before they find the reef.
        </h1>
        <p className="mt-5 max-w-lg leading-relaxed" style={{ color: "var(--ink-soft)", fontSize: "15px" }}>
          Upload a side-scan sonar log. OceanScan separates man-made debris from seafloor clutter and
          hands back a geotagged, priority-ordered cleanup report.
        </p>
      </div>

      {/* Dropzone */}
      <div className="relative z-10 mt-12 w-full max-w-[460px]">
        <input
          ref={inputRef}
          type="file"
          accept=".xtf,.jsf,.png,.jpg,.jpeg,.tiff"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
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
            if (f && validExt(f.name)) handleFiles(f);
          }}
          className="flex flex-col items-center justify-center text-center"
          style={{
            width: "460px",
            maxWidth: "100%",
            border: dragging ? "1.5px dashed var(--signal)" : "1.5px dashed var(--line-strong)",
            background: "var(--surface)",
            padding: "34px 24px",
            color: "var(--ink)",
            cursor: "pointer",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#141414" strokeWidth="1.6" aria-hidden="true">
            <path d="M12 16V4 M6 10l6-6 6 6" />
            <path d="M4 20h16" />
          </svg>
          <p className="mt-4" style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: "16px" }}>
            Drop a sonar log, or click to browse
          </p>
          <p className="mt-1.5" style={{ fontFamily: "var(--f-mono)", fontSize: "11px", color: "var(--ink-soft)" }}>
            .XTF · .JSF · .PNG — up to 500MB
          </p>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={onLoadSample}
            className="bg-transparent underline underline-offset-4"
            style={{ fontFamily: "var(--f-mono)", fontSize: "12px", color: "var(--ink)", border: "none", cursor: "pointer" }}
          >
            No file handy? Load a sample survey →
          </button>
        </div>
      </div>

      {/* Recent surveys ledger */}
      <div className="relative z-10 mt-14 w-full max-w-[460px]">
        <p className="uppercase" style={{ fontFamily: "var(--f-mono)", fontSize: "10px", letterSpacing: "0.14em", color: "var(--ink-soft)" }}>
          Recent Surveys — {SAMPLE_SURVEY.area}
        </p>
        <div className="mt-3 border-t" style={{ borderColor: "var(--line)" }}>
          {RECENT.map((r) => (
            <div
              key={r.file}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: "1px solid var(--line)" }}
            >
              <span className="truncate" style={{ fontFamily: "var(--f-mono)", fontSize: "13px", color: "var(--ink)" }}>
                {r.file}
              </span>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: "11px", color: "var(--ink-soft)" }}>
                {r.when}
              </span>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: "13px", fontWeight: 700, color: "var(--signal)" }}>
                {r.contacts} cont.
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
