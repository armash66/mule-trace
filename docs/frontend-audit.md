# MuleTrace Frontend Audit & Phase Verification

> **Date:** October 2026  
> **Repository:** `muletrace` (`github.com/armash66/muletrace`)  
> **Branch:** `fawwaz`  
> **Audit Status:** Phase 1 Discovery & Phase 2 Foundation Tokens Complete  

---

## 1. Stack & Runtime Versions

Dependencies and exact versions inspected from `web/package.json` and active build outputs:

| Layer | Package / Technology | Exact Version / Specifier | Role / Status |
|---|---|---|---|
| **Framework** | React | `^19.3.0` (`@types/react`, `@types/react-dom`) | Core UI library |
| **Bundler** | Vite | `^8.3.0` (Runtime `v8.3.2`) | ESM dev server & build |
| **Language** | TypeScript | `~6.0.2` | Strict typed API & domain contracts |
| **Motion** | Framer Motion | `^13.5.0` | Declarative page & component motion |
| **Animation Engine** | GSAP + `@gsap/react` | `3.15.0` / `2.1.2` | Timeline and tweening animations |
| **State Management** | Zustand | `^5.0.15` | Global reactive store (`store/store.ts`) |
| **Routing** | React Router DOM | `^7.18.4` | Route hierarchy & AppShell |
| **Graph Visualizer** | Cytoscape.js | `^3.34.3` (`react-cytoscapejs ^2.0.0`) | Network topology canvas |
| **Charts** | Recharts | `^3.10.1` | Telemetry & analytic charts |
| **Tables** | TanStack React Table | `^9.2.4` | Headless table state |
| **Virtualization** | TanStack React Virtual | `^3.14.13` | High-frequency ledger scrolling |
| **Command Palette** | cmdk | `^1.1.1` | Keyboard navigation overlay (`⌘K`) |
| **Data Ingestion** | PapaParse | `^5.7.0` | Client CSV intake & parsing |
| **Form Validation** | Zod + React Hook Form | `^3.25.76` / `^7.89.0` | Schema validation |
| **Display Font** | `@fontsource-variable/space-grotesk` | `5.3.0` | Display headlines |
| **Body Font** | `@fontsource-variable/inter` | `5.3.0` | Body typography |
| **Monospace Font** | `@fontsource-variable/jetbrains-mono` | `5.3.0` | Labels, metrics, tabular numbers |
| **Legacy Display** | `@fontsource/instrument-serif` | `^5.3.0` | Editorial display font |
| **Icons** | Lucide React | `^1.49.0` | Monochromatic icons |
| **Testing Engine** | Puppeteer | `^25.12.0` | Automated headless browser verification |
| **Backend** | FastAPI + Uvicorn | Python 3.11 (`fastapi`, `sqlalchemy 2.0`, `networkx`) | Port 8000 REST API |
| **Database** | SQLite | `muletrace.db` | Local storage |

---

## 2. Route Map

The application features 18 registered route patterns supporting both standalone public/landing views and an integrated forensic command workspace:

| Path | Component | Shell? | Page Title / Purpose | Status |
|---|---|---|---|---|
| `/` | `Landing` | Standalone | Forensic AML Pitch & Interactive Architecture Story | Active |
| `/welcome` | `Landing` | Standalone | Alternate entry point for landing experience | Active |
| `/m/alert/:ringId` | `MobileOnCall` | Standalone | Mobile on-call emergency response triage | Active |
| `/command` | `CommandCenter` | `AppShell` | Overview KPIs, intake trigger, risk overview | Active |
| `/overview` | `CommandCenter` | `AppShell` | Secondary alias for overview command center | Active |
| `/alerts` | `Alerts` | `AppShell` | Real-time queue of flagged accounts and clusters | Active |
| `/workspace` | `Investigate` | `AppShell` | Primary graph investigation workbench | Active |
| `/workspace/:accountId` | `Investigate` | `AppShell` | Focused account investigation & multi-hop BFS | Active |
| `/freezes` | `FreezeTracker` | `AppShell` | Kanban board for min-cut freeze orders | Active |
| `/cases` | `Cases` | `AppShell` | Compliance case management & SAR reports | Active |
| `/cases/:ringId` | `Cases` | `AppShell` | Focused case dossier for specific mule ring | Active |
| `/replay` | `HeistReplay` | `AppShell` | Step-by-step transaction velocity replay | Active |
| `/replay/:ringId` | `HeistReplay` | `AppShell` | Ring-specific chronological layering replay | Active |
| `/rules` | `RulesLab` | `AppShell` | Heuristic threshold tuning & backtesting | Active |
| `/performance` | `Performance` | `AppShell` | Model precision, recall, and detection metrics | Active |
| `/audit` | `Audit` | `AppShell` | Immutable compliance analyst action ledger | Active |
| `/data` | `DataHub` | `AppShell` | Multi-stage CSV/Excel transaction intake wizard | Active |
| `/patterns` | `PatternsGuide` | `AppShell` | Typology reference manual with SVG diagrams | Active |
| `*` | Redirect → `/` | — | Fallback route redirecting to root | Active |

---

## 3. Reusable Components & New Primitives

| Component | File Path | Exports / Features |
|---|---|---|
| `ProvenanceLabel` | `web/src/components/ProvenanceLabel.tsx` | Strict truthfulness tagging: `LIVE` (green #34D399), `RECORDED` (blue #7C93B8), `SAMPLE` (amber #FF9F1C), `ILLUSTRATIVE` (neutral #A5A9B3). 1px hairline border, JetBrains Mono tabular nums. |
| `ProvenanceBadge` | `web/src/components/ProvenanceBadge.tsx` | Legacy badge component, now re-exporting `ProvenanceLabel`. |
| `useReducedMotion` | `web/src/hooks/useReducedMotion.ts` | Reactive hook listening to `(prefers-reduced-motion: reduce)` via `MediaQueryList` event listeners. Also re-exported from `web/src/lib/useReducedMotion.ts`. |
| `EntityGlyphs` | `web/src/components/EntityGlyphs.tsx` | Reusable SVG symbol glyphs with 1.5px stroke: `ACCOUNT` (rounded square), `TRANSACTION` (diamond), `DEVICE` (rectangle with notch), `IP` (hexagon), `CASHOUT` (square with outward arrow). Includes individual exports, unified `<EntityGlyph />`, and `<EntityGlyphsDefs />` SVG symbol bundle. |
| `AppShell` | `web/src/components/AppShell.tsx` | Sidebar nav, top bar, dataset switcher, search trigger (`⌘K`), footer metadata. |
| `CytoscapeGraph` | `web/src/components/CytoscapeGraph.tsx` | High-performance graph canvas with BFS traversal and mule node styling. |
| `FreezePlanModal` | `web/src/components/FreezePlanModal.tsx` | Min-cut intervention plan and alternative cut-set options. |
| `CommandPalette` | `web/src/components/CommandPalette.tsx` | Global `cmdk` quick action palette. |
| `WhyScoreDrawer` | `web/src/components/WhyScoreDrawer.tsx` | Slide-over drawer presenting XAI signal attribution and counterfactuals. |

---

## 4. API Endpoints & Response Shapes

Client wrapper (`web/src/api/client.ts`) targets `/api/v1` with automatic mock fallbacks (`web/src/api/mockData.ts`).

### 4.1 Key Endpoints and Response Shapes

#### `GET /api/v1/stats`
```json
{
  "total_accounts": 1048,
  "flagged_accounts": 42,
  "active_rings": 4,
  "total_transfers": 10482,
  "volume_analyzed": 4825000.0,
  "volume_at_risk": 480000.0,
  "volume_preserved": 410000.0,
  "avg_detection_latency_ms": 140
}
```

#### `GET /api/v1/accounts/:id`
```json
{
  "account_id": "ACC_05001",
  "risk_score": 94,
  "classification": "CONFIRMED_MONEY_MULE",
  "first_seen": "2026-03-01T08:14:00Z",
  "last_seen": "2026-03-14T10:45:00Z",
  "patterns": ["STRUCTURING", "RAPID_TRANSIT"],
  "reasons": [
    "Receives funds from 9 disparate accounts and disperses 96% within 11 minutes",
    "Transfers are structured in round amounts (₹49,000) below threshold"
  ],
  "features": {
    "in_degree": 9,
    "out_degree": 4,
    "total_in": 480000.0,
    "total_out": 461000.0,
    "forward_ratio": 0.96,
    "hourly_velocity": 4.8
  },
  "findings": [
    {
      "signal": "PASS_THROUGH",
      "severity": "CRITICAL",
      "detail": "Hold time < 15 mins for 96% of incoming balance"
    }
  ]
}
```

#### `GET /api/v1/accounts/:id/network?hops=2`
```json
{
  "nodes": [
    {
      "data": {
        "id": "ACC_05001",
        "label": "ACC-5001",
        "type": "mule",
        "risk_score": 94,
        "is_subject": true
      }
    }
  ],
  "edges": [
    {
      "data": {
        "id": "tx_88192",
        "source": "SRC_1001",
        "target": "ACC_05001",
        "amount": 49000.0,
        "timestamp": "2026-03-14T10:11:00Z"
      }
    }
  ]
}
```

#### `GET /api/v1/rings/:id/freeze-plan`
```json
{
  "ring_id": "fan_1",
  "recommended_freeze_accounts": ["ACC_05001"],
  "funds_stoppable": 410000.0,
  "leakage_if_unfrozen": 480000.0,
  "min_cut_nodes": 1,
  "alternatives": [
    {
      "accounts": ["DEST_8801", "DEST_8802", "DEST_8803", "DEST_8804"],
      "funds_stoppable": 220000.0,
      "efficiency": "Suboptimal: 4 freezes required after dispersion"
    }
  ]
}
```

#### `GET /api/v1/accounts/:id/explain`
```json
{
  "account_id": "ACC_05001",
  "risk_score": 94,
  "top_features": [
    {
      "feature": "forward_ratio",
      "label": "Fund pass-through ratio",
      "value": 0.96,
      "shap_value": 34.5,
      "direction": "increases_risk"
    },
    {
      "feature": "hourly_velocity",
      "label": "Hourly transaction velocity",
      "value": 4.8,
      "shap_value": 28.2,
      "direction": "increases_risk"
    }
  ],
  "counterfactual": "Score drops below the flag threshold (50) if forward ratio were under 60%."
}
```

#### `GET /api/v1/cases/:id/report`
```json
{
  "ring_id": "fan_1",
  "pattern": "FAN_IN_OUT",
  "summary_sentence": "Multi-hop fan-in/fan-out ring encompassing 14 accounts flagged for review.",
  "accounts": [
    {
      "account_id": "ACC_05001",
      "kyc_phone_masked": "+91 98••••12",
      "is_recommended_freeze": true
    }
  ],
  "draft_str": "SUSPICIOUS TRANSACTION REPORT (STR) — DRAFT FOR COMPLIANCE REVIEW\n..."
}
```

---

## 5. Capabilities Matrix

Verified against the repository's backend detectors, analytics, and schema definitions:

| Capability | Status | Implementation Details in Repository |
|---|---|---|
| **Graph Visualization & Traversal** | `IMPLEMENTED` | Backed by NetworkX in backend (`backend/app/engine/graph.py`) and Cytoscape.js in frontend (`components/CytoscapeGraph.tsx`). Multi-hop BFS neighbourhood extraction up to 3 hops. |
| **Risk Scoring** | `IMPLEMENTED` | Multi-signal weighted scoring engine in `backend/app/engine/scoring.py` combining topological features, rule indicators, and Isolation Forest ML anomaly scores. |
| **Structuring Detection** | `IMPLEMENTED` | Heuristic detector in `backend/app/engine/detectors/behavioral.py` flagging repeated transactions just below statutory reporting limits (e.g. ₹49,000 threshold avoidance with >70% round amount frequency). |
| **Rapid Cash-Out Detection** | `IMPLEMENTED` | Proximity and channel detection in `backend/app/engine/detectors/behavioral.py` monitoring ATM, MERCHANT, and crypto WALLET exits accounting for >50% of recent outflows within a short window. |
| **Shared-Device Rings** | `IMPLEMENTED` | Connected-components bipartite cluster detector in `backend/app/engine/detectors/new_cluster.py` linking accounts that share hardware fingerprints, device IDs, IP addresses, or KYC hashes. |
| **Sub-Threshold Velocity** | `IMPLEMENTED` | Transit chain detector in `backend/app/engine/detectors/pass_through.py` measuring forwarding latency under `passthrough_max_hold_min` (15 mins) and retention below 5%. |
| **Explainable AI (XAI)** | `PARTIAL` | Implemented in `backend/app/analytics/explain.py` and `components/WhyScoreDrawer.tsx`. Computes heuristic feature contributions, directional impact, and rule-based counterfactuals. *(Note: Approximate TreeSHAP proxy rather than exact game-theoretic Shapley values).* |
| **SAR / STR Reporting** | `PARTIAL` | Implemented in `backend/app/api/reports.py` and `pages/Cases.tsx`. Automatically synthesizes structured regulatory narrative drafts and exportable JSON payloads. *(Note: Human analyst review mandatory; direct XML filing gateway to FIU-IND is absent).* |
| **Execution Trace** | `PARTIAL` | Implemented in `pages/HeistReplay.tsx` and `components/data-hub/RunHistoryTable.tsx` for step-by-step transaction chronologies and pipeline step logging. *(Note: Chronological ledger trace, not an autonomous LLM step-by-step reasoning trace).* |
| **Agent Planner** | `ABSENT` | No dynamic autonomous LLM multi-turn agent planner exists in the repository. The guided investigation flow uses deterministic state progression and predefined heuristics. |

---

## 6. Data Provenance & Truthfulness Mapping

In strict compliance with the truthfulness rules, all data visuals across the application must be tagged with their exact provenance:

| UI View / Visual Element | Data Source | Valid Provenance Tag | Notes |
|---|---|---|---|
| **Command Center KPI Cards** | `/api/v1/stats` via backend DB | `LIVE` (backend active) / `SAMPLE` (mock fallback) | Real aggregate counts of processed accounts and transactions. |
| **Live Telemetry Ticker** | System state / benchmark run metrics | `RECORDED` | Replay of a benchmark dataset execution run. |
| **Hero Ring Topology Graph** | Inline SVG demonstration graph | `SAMPLE` | Pre-calibrated demo ring (`#fan_1`) showing transit structure. |
| **Workspace Cytoscape Graph** | `/api/v1/accounts/:id/network` | `LIVE` (backend) / `SAMPLE` (mock) | Subgraph rendered directly from active GraphStore. |
| **Heist Replay Timeline** | `/api/v1/rings/:id/replay` | `RECORDED` | Chronological replay of multi-hop transaction steps. |
| **Min-Cut Freeze Plan** | `/api/v1/rings/:id/freeze-plan` | `LIVE` | Mathematically computed cut-set halting fund dissipation. |
| **Why Score / XAI Drawer** | `/api/v1/accounts/:id/explain` | `LIVE` | Feature contribution breakdown from pipeline state. |
| **Concept Typology Diagrams** | Inline SVG in `Landing.tsx` & `PatternsGuide.tsx` | `ILLUSTRATIVE` | Structural educational diagrams explaining ring typologies. |
| **Count-up Animation Counter** | JavaScript `setInterval` in `CommandCenter.tsx` | `ILLUSTRATIVE` | Visual counter transition from zero to target value. |

---

## 7. Animation Audit & Verification

### 7.1 Complete Animation Inventory

Every animation, keyframe, and transition in the frontend codebase was identified, inspected, and verified:

| # | Animation / Effect | File Location | Mechanism | Trigger Condition | Status | Reduced-Motion Behavior |
|---|---|---|---|---|---|---|
| 1 | **Page Scroll Reveal** (`#problem`, `#approach`, `#features`, `#workbench`, `#scroll`, `#xai`, `#sar`) | `web/src/pages/Landing.tsx` | Framer Motion (`activeEnterVariants`) | `useScrollReveal` (IntersectionObserver at 10% intersection, -40px root margin) | **Fixed & Verified** (previously stuck at `opacity: 0` due to disconnected refs; now fully attached) | Snaps immediately to `opacity: 1`, `transform: none` |
| 2 | **Hero Inbound SVG Paths** (`.edge-path`) | `web/src/pages/Landing.css` | CSS `@keyframes hero-edge-appear` | CSS `animation` (stroke-dashoffset from 200 to 0) | **Fixed & Verified** (previously invisible under reduced motion; now overrides to static visible stroke) | `animation: none !important; opacity: 0.35 !important; stroke-dashoffset: 0 !important;` |
| 3 | **Hero Outbound SVG Paths** (`.edge-path.edge-out`) | `web/src/pages/Landing.css` | CSS `@keyframes hero-edge-appear-out` | CSS `animation` (stroke-dashoffset from 200 to 0) | **Fixed & Verified** | `animation: none !important; opacity: 0.70 !important; stroke-dashoffset: 0 !important;` |
| 4 | **Pulsing Mule Hub Ring** (`.pulse-ring`) | `web/src/pages/Landing.css` | CSS `@keyframes pulse-out` | Continuous infinite CSS animation (`scale(1)` to `scale(1.6)`, fade out) | **Verified Playing** | `animation: none !important; opacity: 0.3 !important; transform: none !important;` |
| 5 | **Telemetry Ticker Tape** (`.ticker-track`) | `web/src/pages/Landing.css` | CSS `@keyframes ticker-slide` | Continuous linear translation (`translateX(0)` to `translateX(-50%)` over 28s) | **Verified Playing** | `animation: none !important; transform: none !important; overflow-x: auto;` |
| 6 | **Forensic Spine Progress Beam** (`.spine-pulse`) | `web/src/pages/Landing.css` | CSS `@keyframes spine-travel` | Continuous infinite CSS animation (`translateY(-100%)` to `translateY(100%)`) | **Verified Playing** | `display: none !important;` |
| 7 | **Interactive Node Pulse** (`.node-circle`, `.hot-hub`) | `web/src/pages/Landing.css` | CSS transition on hover | User mouse hover over SVG nodes | **Verified Playing** | `transform: scale(1.15)` on hover |
| 8 | **KPI Count-Up Number Increment** | `web/src/pages/CommandCenter.tsx` | JavaScript `setInterval` | Page load / dataset selection (24 steps over 600ms) | **Verified Playing** | Renders final amount statically |
| 9 | **Network Replay Playback** | `web/src/pages/HeistReplay.tsx` | JavaScript `setInterval` timer | User clicking Play button (advances 1 step every 1200ms) | **Verified Playing** | Playhead controllable, steps visibly |
| 10 | **Audit Stamp Placement** (`.stamp`, `.stamp.ok`) | `web/src/styles/tokens.css` | CSS `@keyframes stampIn` | Component mount (scale 1.3 to 1.0, rotate -1deg) | **Verified Playing** | Snaps to final rotation without zoom |
| 11 | **Status Indicator Pulse** (`.dot.hot`, `.dot.live`) | `web/src/styles/tokens.css` | CSS `@keyframes provPulse` | Continuous infinite opacity fade (1.0 to 0.4 to 1.0) | **Verified Playing** | Static opacity 1.0 |
| 12 | **Explanation Drawer Slide** | `web/src/pages/Landing.css` / `WhyScoreDrawer.tsx` | CSS `@keyframes slideLeft` | Analyst clicks "Why this score?" | **Verified Playing** | Static slide without ease delay |
| 13 | **Loading Spinner** (`.spin`) | `web/src/pages/Landing.css` | CSS `@keyframes spin` | Background fetch or dataset ingestion | **Verified Playing** | Fixed static icon |

---

## 8. Verification Results & Visual Evidence

Automated headless browser audit executed via Puppeteer against the running Vite server:

### 8.1 Section Opacity, Transform, and Spacing Audit (1440px Viewport)

| Section ID | Rendered? | Computed Opacity | Visibility | Transform | Height | Spacing |
|---|---|---|---|---|---|---|
| `#problem` | ✅ Yes | `1` | `visible` | `none` | 1132px | Uneven clamp (120-200px) |
| `#approach` | ✅ Yes | `1` | `visible` | `none` | 921px | Uneven clamp (120-200px) |
| `#features` | ✅ Yes | `1` | `visible` | `none` | 1154px | Uneven clamp (120-200px) |
| `#workbench` | ✅ Yes | `1` | `visible` | `none` | 1046px | Uneven clamp (120-200px) |
| `#scroll` | ✅ Yes | `1` | `visible` | `none` | 1020px | Uneven clamp (120-200px) |
| `#xai` | ✅ Yes | `1` | `visible` | `none` | 1010px | Uneven clamp (120-200px) |
| `#sar` | ✅ Yes | `1` | `visible` | `none` | 1038px | Uneven clamp (120-200px) |

### 8.2 Console Output Verbatim

- **Landing Page (`/welcome`):**
  ```text
  [debug] [vite] connecting...
  [debug] [vite] connected.
  [info] %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold
  ```
  **Errors:** `none`

- **Command Center (`/command`):**
  ```text
  [debug] [vite] connecting...
  [debug] [vite] connected.
  [info] %cDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools font-weight:bold
  [error] Failed to load resource: the server responded with a status of 422 (Unprocessable Entity)
  [error] Failed to load resource: the server responded with a status of 422 (Unprocessable Entity)
  ```
  *(Note: 422 error is expected on fresh database when no dataset run has been executed; caught gracefully by frontend mock/empty-state adapter).*

### 8.3 Screenshots Captured

1. **Desktop Landing Hero (1440px):** `docs/screenshots/landing-hero-1440px.png`  
   *Cinematic dark aesthetic (#07080A), Space Grotesk display typography, interactive SVG hero topology graph with live pulsing hub and cut-line, and telemetry ticker tape.*
2. **Desktop Landing Scrolled (1440px):** `docs/screenshots/landing-1440px.png`  
   *Fully revealed sections with uneven purposeful spacing (120-200px), XAI drawer preview, and Decision & Action SAR summary.*
3. **Mobile Landing View (390px):** `docs/screenshots/landing-390px.png`  
   *Responsive mobile viewport layout, scaled typography, compact action buttons, and touch-ready metrics.*
4. **Desktop App Overview (1440px):** `docs/screenshots/app-overview-1440px.png`  
   *Complete forensic `AppShell` with dark sidebar navigation, dataset intake drop area, and system status indicators.*


---

## 9. Accounts & Transactions Data Schema Audit (Identity & Device Fingerprint)

Inspection of underlying synthetic/recorded dataset files (`data/accounts.csv`, `data/transactions.csv`, `backend/app/data/*.csv`, and `CaseReport` schema):

| Field / Attribute | Present in Dataset? | Source Column / Property | Verified Format / Sample Values | Handling in Forensic UI |
|---|---|---|---|---|
| **KYC Phone** | ✅ Yes | `accounts.csv` (`kyc_phone_hash`), `CaseReport.accounts` (`kyc_phone_masked`) | `PH-000914`, masked `+91 98••••12` | Masked in UI (`+91 98****21`); revealed only upon explicit analyst click; cross-matched across accounts for phone link rings. |
| **KYC Address** | ✅ Yes | `accounts.csv` (`kyc_address_hash`), `CaseReport.accounts` (`kyc_address_masked`) | `AD-000285`, masked `Flat 4••, Andheri West, Mumbai, MH` | Truncated/masked; shared address links counted and mapped to identity cards. |
| **KYC ID / PAN Hash** | ✅ Yes | `accounts.csv` (`kyc_pan_hash`), `CaseReport.accounts` (`kyc_id_hash_masked`) | `PN-000000`, masked `a8••••4f` | Never raw PAN/Aadhaar; truncated hashes only. |
| **Device ID** | ✅ Yes | `accounts.csv` (`device_ids`), `transactions.csv` (`device_id`) | `D-0188`, `D-0008`, `D-0050` | Mapped to distinct accounts and transaction timestamps to calculate device velocity span (e.g. "3 accounts within 12 minutes"). |
| **IP Address** | ✅ Yes | `accounts.csv` (`ip_addresses`), `transactions.csv` (`ip_address`) | `192.168.0.52`, `192.168.0.15` | Distinct accounts per IP tracked for high velocity clusters; masked in UI (`192.168.***.***`). |
| **Opening Date** | ✅ Yes | `accounts.csv` (`opened_date`, `age_days`) | `2026-05-09T00:00:00+00:00` | Account age and opening timestamp computed. |
| **Opening City / Branch**| ✅ Yes | `accounts.csv` (`branch`) | `MUMBAI-01`, `DELHI-01`, `HYD-01` | City extracted from branch code prefix. |
| **Geolocation Fields** | ❌ **No** | None | No lat/long or IP geolocation fields exist | **Strict Truthfulness:** Never fabricate fake countries or cities. Explicitly rendered as *"Geolocation not available in this dataset"*. |

---
*Audit and Foundation Tokens verified by MuleTrace Frontend Agent.*

