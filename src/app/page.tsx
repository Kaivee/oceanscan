"use client";

import { useState, useCallback } from "react";
import TopBar from "@/components/top-bar";
import AcquireTab from "@/components/acquire-tab";
import AnalyzeTab from "@/components/analyze-tab";
import ReportTab from "@/components/report-tab";
import UploadModal from "@/components/upload-modal";
import { GeojsonModal, RetrievalModal } from "@/components/export-modals";
import { TARGETS, apiDetectionToTarget, type SonarTarget, type ApiResponse, type DetectionStatus } from "@/lib/targets";
import type { TabKey } from "@/components/tab-bar";

export interface PendingUpload {
  imageUrl: string;
  fileName: string;
  response: ApiResponse;
  targets: SonarTarget[];
}

export default function Home() {
  const [tab, setTab] = useState<TabKey>("acquire");
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [scanDone, setScanDone] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showGeojson, setShowGeojson] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [apiTargets, setApiTargets] = useState<SonarTarget[]>([]);
  const [uploadedImages, setUploadedImages] = useState<Array<{ name: string; url: string; targetCount: number }>>([]);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  const [detectionNotes, setDetectionNotes] = useState<Record<string, string>>({});
  const [detectionStatus, setDetectionStatus] = useState<Record<string, DetectionStatus>>({});

  const allTargets = [...TARGETS, ...apiTargets];
  const revealed = allTargets.filter((t) => revealedIds.includes(t.id));

  const handleReveal = (id: string) => {
    setRevealedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSelectedId(id);
  };

  const handleDetect = useCallback((response: ApiResponse, imageUrl: string, fileName: string) => {
    const offset = apiTargets.length;
    const newTargets = response.detections.map((det, i) =>
      apiDetectionToTarget(det, offset + i + 1, response.metadata, imageUrl, fileName)
    );
    setApiTargets((prev) => [...prev, ...newTargets]);
    setRevealedIds((prev) => [...prev, ...newTargets.map((t) => t.id)]);
    setUploadedImages((prev) => [...prev, { name: fileName, url: imageUrl, targetCount: response.detections.length }]);
    setSelectedImageUrl(imageUrl);
    setPendingUpload({ imageUrl, fileName, response, targets: newTargets });
    setShowUpload(false);
    setTab("acquire");
    setScanDone(false);
  }, [apiTargets.length]);

  const handleScanComplete = useCallback(() => {
    setScanDone(true);
    setTab("analyze");
    const apiRevealed = apiTargets.filter((t) => revealedIds.includes(t.id));
    if (apiRevealed.length > 0 && !selectedId) {
      setSelectedId(apiRevealed[apiRevealed.length - 1].id);
    }
  }, [apiTargets, revealedIds, selectedId]);

  const handleReset = () => {
    setRevealedIds([]);
    setScanDone(false);
    setSelectedId(null);
  };

  const handleTabChange = useCallback((newTab: TabKey) => {
    setTab(newTab);
  }, []);

  const handleNoteChange = useCallback((id: string, note: string) => {
    setDetectionNotes((prev) => ({ ...prev, [id]: note }));
  }, []);

  const handleStatusChange = useCallback((id: string, status: DetectionStatus) => {
    setDetectionStatus((prev) => ({ ...prev, [id]: status }));
  }, []);

  const targetsWithMeta = revealed.map((t) => ({
    ...t,
    note: detectionNotes[t.id] ?? t.note,
    detectionStatus: detectionStatus[t.id] ?? "pending" as DetectionStatus,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        onUpload={() => setShowUpload(true)}
        activeTab={tab}
        onTabChange={handleTabChange}
        scanDone={scanDone}
        foundCount={revealedIds.length}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-3 py-3 sm:px-4">
        <div className={tab === "acquire" ? "" : "hidden"}>
          <AcquireTab
            onReveal={handleReveal}
            onComplete={handleScanComplete}
            onReset={handleReset}
            onGoAnalyze={() => {
              setTab("analyze");
              if (!selectedId && revealed.length > 0) setSelectedId(revealed[0].id);
            }}
            pendingUpload={pendingUpload}
          />
        </div>
        <div className={tab === "analyze" ? "" : "hidden"}>
          <AnalyzeTab
            targets={targetsWithMeta}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onGoAcquire={() => setTab("acquire")}
            uploadedImages={uploadedImages}
            selectedImageUrl={selectedImageUrl}
            onSelectImage={setSelectedImageUrl}
            onNoteChange={handleNoteChange}
            onStatusChange={handleStatusChange}
          />
        </div>
        <div className={tab === "report" ? "" : "hidden"}>
          <ReportTab
            targets={targetsWithMeta}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onExportGeojson={() => setShowGeojson(true)}
            onRetrievalPath={() => setShowRoute(true)}
            onGoAcquire={() => setTab("acquire")}
            uploadedImageCount={uploadedImages.length}
          />
        </div>
      </main>

      <footer className="py-3 text-center font-mono text-[9px] tracking-widest text-[var(--color-ocean-muted)]/50 uppercase">
        OceanScan AI v3.0 · Tactical Hydrographic Workstation · Simulated Data (GOA_SURVEY_L04)
      </footer>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onDetect={handleDetect} />
      <GeojsonModal open={showGeojson} onClose={() => setShowGeojson(false)} targets={revealed} />
      <RetrievalModal open={showRoute} onClose={() => setShowRoute(false)} targets={revealed} />
    </div>
  );
}
