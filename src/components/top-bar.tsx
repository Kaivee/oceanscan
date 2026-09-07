"use client";

import type { TabKey } from "@/lib/targets";
import { useI18n, type Lang, type UiKey } from "@/lib/i18n";

const STEPS: { key: TabKey }[] = [{ key: "frame" }, { key: "map" }, { key: "brief" }];

function RadarMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8.2" fill="none" stroke="#141414" strokeWidth="1.2" opacity="0.55" />
      <circle cx="10" cy="10" r="4.6" fill="none" stroke="#141414" strokeWidth="1.2" opacity="0.28" />
      <line x1="10" y1="10" x2="16.6" y2="4.4" stroke="#FF5A1F" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="2.6" fill="#141414" />
    </svg>
  );
}

interface TopBarProps {
  view: TabKey;
  onViewChange: (v: TabKey) => void;
  hasSurvey: boolean;
  onUploadLog: () => void;
  onRunDetection: () => void;
  surveyName?: string | null;
}

export default function TopBar({
  view,
  onViewChange,
  hasSurvey,
  onUploadLog,
  onRunDetection,
  surveyName,
}: TopBarProps) {
  const onStart = view === "start";
  const { lang, setLang, t } = useI18n();

  return (
    <header
      className="flex items-center px-8 py-[18px]"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--ink)" }}
    >
      {/* Brand unit — clicking returns to the Start / New Survey screen */}
      <button
        onClick={() => onViewChange("start")}
        className="flex items-center"
        style={{ gap: "11px", background: "transparent", border: "none", cursor: "pointer" }}
        title={t("newSurvey")}
      >
        <RadarMark />
        <span
          className="font-display tracking-[0.01em]"
          style={{ fontFamily: "var(--f-display)", fontSize: "16px", fontWeight: 800, color: "var(--ink)" }}
        >
          OCEANSCAN
        </span>
      </button>

      {/* Language switcher — always visible */}
      <div
        className="flex items-center"
        style={{ marginLeft: "22px", border: "1px solid var(--line-strong)" }}
      >
        {(["en", "hi"] as Lang[]).map((l) => {
          const active = lang === l;
          return (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={active}
              style={{
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--surface)" : "var(--ink)",
                border: "none",
                padding: "6px 12px",
                fontFamily: "var(--f-mono)",
                fontSize: "11px",
                letterSpacing: "0.06em",
                fontWeight: active ? 700 : 400,
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {l === "en" ? "EN" : "हिंदी"}
            </button>
          );
        })}
      </div>

      {/* Start / New Survey control — moved out of the stepper, renamed */}
      <button
        onClick={() => onViewChange("start")}
        className="hidden sm:inline-block uppercase"
        style={{
          marginLeft: "32px",
          fontFamily: "var(--f-mono)",
          fontSize: "12px",
          letterSpacing: "0.08em",
          color: "var(--ink)",
          fontWeight: 600,
          border: onStart ? "1px solid var(--signal)" : "1px solid var(--line-strong)",
          background: onStart ? "var(--signal-dim)" : "transparent",
          padding: "7px 14px",
          cursor: "pointer",
        }}
      >
        {t("newSurvey")}
      </button>

      {/* Pipeline stepper — no numbers */}
      <nav className="flex items-center" style={{ marginLeft: "44px", gap: "26px" }}>
        {STEPS.map((s) => {
          const active = view === s.key;
          const locked = !hasSurvey && s.key !== "start";
          return (
            <button
              key={s.key}
              onClick={() => !locked && onViewChange(s.key)}
              disabled={locked}
              className="bg-transparent pb-1 text-left uppercase transition-colors"
              style={{
                fontFamily: "var(--f-mono)",
                fontSize: "12px",
                letterSpacing: "0.08em",
                color: active ? "var(--ink)" : "var(--ink-soft)",
                fontWeight: active ? 600 : 400,
                opacity: locked ? 0.32 : 1,
                cursor: locked ? "not-allowed" : "pointer",
                borderBottom: active ? "2px solid var(--signal)" : "2px solid transparent",
              }}
            >
              {t(`tab.${s.key}` as UiKey)}
            </button>
          );
        })}
      </nav>

      {/* Top-right controls — hidden on Start view */}
      {!onStart && (
        <div className="ml-auto flex items-center" style={{ gap: "12px" }}>
          {SurveyTag({ surveyName })}
          <span
            className="hidden md:inline"
            style={{ fontFamily: "var(--f-mono)", fontSize: "10.5px", color: "var(--ink-soft)" }}
          >
            {t("modelChip")}
          </span>
          <button
            onClick={onUploadLog}
            style={{
              background: "transparent",
              border: "1px solid var(--ink)",
              color: "var(--ink)",
              padding: "9px 15px",
              fontFamily: "var(--f-mono)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {t("uploadLog")}
          </button>
          <button
            onClick={onRunDetection}
            style={{
              background: "var(--signal)",
              border: "1px solid var(--signal)",
              color: "#FFFFFF",
              fontWeight: 600,
              padding: "9px 15px",
              fontFamily: "var(--f-mono)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {t("runDetection")}
          </button>
        </div>
      )}
    </header>
  );
}

function SurveyTag({ surveyName }: { surveyName?: string | null }) {
  if (!surveyName) return null;
  return (
    <span
      className="hidden lg:inline truncate max-w-[180px]"
      style={{ fontFamily: "var(--f-mono)", fontSize: "10.5px", color: "var(--ink-soft)" }}
    >
      {surveyName}
    </span>
  );
}
