"use client";

import { useState, useCallback } from "react";
import TopBar from "@/components/top-bar";
import LaunchScreen from "@/components/launch-screen";
import FrameView from "@/components/analyze-tab";
import MapPanel from "@/components/map-panel";
import BriefView from "@/components/report-tab";
import UploadModal from "@/components/upload-modal";
import {
  SAMPLE_TARGETS,
  SAMPLE_SURVEY,
  apiDetectionToTarget,
  type TabKey,
  type SonarTarget,
  type SampleSurvey,
  type ApiResponse,
} from "@/lib/targets";

export default function Home() {
  const [view, setView] = useState<TabKey>("start");
  const [hasSurvey, setHasSurvey] = useState(false);
  const [targets, setTargets] = useState<SonarTarget[]>([]);
  const [survey, setSurvey] = useState<SampleSurvey>(SAMPLE_SURVEY);
  const [showUpload, setShowUpload] = useState(false);
  const [launchFile, setLaunchFile] = useState<File | null>(null);

  const handleLoadSample = useCallback(() => {
    setTargets(SAMPLE_TARGETS);
    setSurvey(SAMPLE_SURVEY);
    setHasSurvey(true);
    setView("frame");
  }, []);

  const handleFileChosen = useCallback((file: File) => {
    setLaunchFile(file);
    setShowUpload(true);
  }, []);

  // Real backend path — see upload-modal.tsx (POST /api/v1/detect).
  // A new upload REPLACES the previous frame's detections rather than appending.
  const handleDetect = useCallback(
    (response: ApiResponse, imageUrl: string, fileName: string) => {
      const newTargets = response.detections.map((det, i) =>
        apiDetectionToTarget(det, i + 1, response.metadata, imageUrl, fileName),
      );
      setTargets(newTargets);
      const lat = response.metadata.latitude ?? 51.4715;
      const lon = response.metadata.longitude ?? -2.2348;
      setSurvey({
        id: "LN-014",
        sensor: fileName,
        file: fileName,
        area: "Bristol Channel",
        coordinates: `${lat.toFixed(2)}°N ${Math.abs(lon).toFixed(2)}°W`,
        generated: new Date().toLocaleTimeString("en-GB", { hour12: false }),
        targetCount: newTargets.length,
      });
      setHasSurvey(true);
      setView("frame");
      setShowUpload(false);
      setLaunchFile(null);
    },
    [],
  );

  const openUpload = useCallback(() => setShowUpload(true), []);

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      <TopBar
        view={view}
        onViewChange={setView}
        hasSurvey={hasSurvey}
        onUploadLog={openUpload}
        onRunDetection={openUpload}
        surveyName={survey.file}
      />

      <main className="flex-1 px-8 py-6">
        {view === "start" && <LaunchScreen onFileChosen={handleFileChosen} onLoadSample={handleLoadSample} />}
        {view === "frame" && <FrameView targets={targets} onGoMap={() => setView("map")} />}
        {view === "map" && <MapPanel targets={targets} />}
        {view === "brief" && <BriefView survey={survey} targets={targets} />}
      </main>

      <footer className="py-4 text-center" style={{ fontFamily: "var(--f-mono)", fontSize: "10px", color: "var(--ink-soft)" }}>
        OCEANSCAN · HYDROGRAPHIC DEBRIS SURVEY
      </footer>

      <UploadModal
        open={showUpload}
        onClose={() => {
          setShowUpload(false);
          setLaunchFile(null);
        }}
        onDetect={handleDetect}
        initialFile={launchFile}
      />
    </div>
  );
}
