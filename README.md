# OceanScan AI — Marine Sonar Debris Detection

Hydrographic survey workstation prototype for AI marine sonar debris detection, styled as a vintage admiralty chart office.
Built with **Next.js (App Router) · TypeScript · Tailwind CSS v4 · Lucide React**.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## What's inside

| Panel | Features |
|---|---|
| **Sonar record (Acquire)** | Procedurally generated grainy side-scan texture (canvas), animated beam sweep that reveals contacts in real time, live detection log with timestamps |
| **Mission chart (Analyse)** | Custom SVG nautical chart: ink graticule, depth contours, Goa coast, dashed boat track with launch mark, severity-colored clickable contact pins, acoustic ping ripple at live AUV position, compass rose & scale bar |
| **Object details** | Class icon, confidence ticker, estimated L×W×H dimensions, depth, GPS readout per selected target |
| **Findings register (Report)** | Ledger-style survey table with rotated severity stamps; Export GeoJSON (payload preview modal), Download CSV, Generate Retrieval Path (priority-weighted ROV route) |

All data is mock (`src/lib/targets.ts`) — 4 debris contacts off the Goa coast:
ghost net 94%, metal cylinder 91%, sunken pipe 88%, lost shipping container 76%.

No API keys, no external tiles, no backend required — fully client-side state.

## Structure

```
src/
  app/            layout, page (all dashboard state), theme css
  components/     top-bar, tab-bar, acquire-tab, map-panel, telemetry-card,
                  report-tab, marine-ui (ping ripple, grid, tickers, survey table),
                  upload-modal, export-modals, modal shell
  lib/targets.ts  types, dummy data, GeoJSON/CSV/route helpers
```
