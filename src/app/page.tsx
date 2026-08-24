"use client";

import { useState } from "react";
import TopBar from "@/components/top-bar";
import TabBar, { type TabKey } from "@/components/tab-bar";
import AcquireTab from "@/components/acquire-tab";
import AnalyzeTab from "@/components/analyze-tab";
import ReportTab from "@/components/report-tab";
import UploadModal from "@/components/upload-modal";
import { GeojsonModal, RetrievalModal } from "@/components/export-modals";
import { TARGETS } from "@/lib/targets";

export default function Home() {
  const [tab, setTab] = useState<TabKey>("acquire");
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [scanDone, setScanDone] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showGeojson, setShowGeojson] = useState(false);
  const [showRoute, setShowRoute] = useState(false);

  const revealed = TARGETS.filter((t) => revealedIds.includes(t.id));

  const handleReveal = (id: string) => {
    setRevealedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSelectedId(id);
  };

  const handleReset = () => {
    setRevealedIds([]);
    setScanDone(false);
    setSelectedId(null);
  };

  return (
    <div className="flex min-h-screen flex-col text-[#1b2a4a]">
      <TopBar onUpload={() => setShowUpload(true)} />
      <TabBar
        active={tab}
        onChange={setTab}
        scanDone={scanDone}
        foundCount={revealedIds.length}
      />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-3 py-4 sm:px-4">
        {/* Kept mounted with `hidden` so the scan canvas + log survive tab switches */}
        <div className={tab === "acquire" ? "" : "hidden"}>
          <AcquireTab
            onReveal={handleReveal}
            onComplete={() => setScanDone(true)}
            onReset={handleReset}
            onGoAnalyze={() => {
              setTab("analyze");
              if (!selectedId && revealed.length > 0) setSelectedId(revealed[0].id);
            }}
          />
        </div>
        <div className={tab === "analyze" ? "" : "hidden"}>
          <AnalyzeTab
            targets={revealed}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onGoAcquire={() => setTab("acquire")}
          />
        </div>
        <div className={tab === "report" ? "" : "hidden"}>
          <ReportTab
            targets={revealed}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onExportGeojson={() => setShowGeojson(true)}
            onRetrievalPath={() => setShowRoute(true)}
            onGoAcquire={() => setTab("acquire")}
          />
        </div>
      </main>

      <footer className="py-4 text-center font-mono text-[10px] tracking-wide text-[#8a8574]">
        OceanScan AI · prototype · simulated survey data (GOA_SURVEY_L04)
      </footer>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} />
      <GeojsonModal open={showGeojson} onClose={() => setShowGeojson(false)} targets={revealed} />
      <RetrievalModal open={showRoute} onClose={() => setShowRoute(false)} targets={revealed} />
    </div>
  );
}
