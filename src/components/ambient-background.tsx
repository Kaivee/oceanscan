"use client";

import { useEffect } from "react";

export default function AmbientBackground() {
  // Track the cursor so both the component spotlight and body::after base glow
  // can read --spot-x / --spot-y.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const root = document.documentElement;
      root.style.setProperty("--spot-x", `${e.clientX}px`);
      root.style.setProperty("--spot-y", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Compact cursor glow over the app. soft-light is gentle on both the light
  // canvas and the dark sonar wells, so it reads as a soft halo on the UI but
  // barely tints the imagery.
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(150px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(55,9,165,0.12), rgba(55,9,165,0.03) 55%, transparent 75%)",
          mixBlendMode: "soft-light",
        }}
      />
    </div>
  );
}
