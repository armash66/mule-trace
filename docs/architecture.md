# MuleTrace — System Architecture & Workflow

MuleTrace is an enterprise-grade mule account detection, money flow tracing, and fund recovery platform built for financial crime investigation units, fraud analysts, and regulatory compliance teams.

---

## 1. High-Level System Architecture

```mermaid
graph TD
    Client["Analyst Web UI (React + Vite + TypeScript)"]
    API["FastAPI Backend (Python 3.11)"]
    Ingest["CSV Ingestion & Normalizer"]
    Engine["Multi-Detector Graph Engine"]
    DB[("SQLite Ledger (WAL Mode)")]
    Audit[("SHA-256 Hash-Chained Audit Trail")]
    GraphStore[("In-Memory Graph Store (NetworkX / Neo4j)")]

    Client -->|REST & SSE Events| API
    API --> Ingest
    Ingest --> Engine
    Engine --> GraphStore
    Engine --> DB
    API --> DB
    API --> Audit
```

The frontend uses the Vite development proxy for local API calls. Set `VITE_API_URL` only when the API is hosted on another origin.

---

## 2. Detection Pipeline Architecture

The detection pipeline processes raw financial ledgers in chronological order through a sequence of modular stages:

```mermaid
flowchart LR
    A["Raw Bank CSV"] --> B["Ingest & Sanitize"]
    B --> C["Graph Construction"]
    C --> D{"Parallel Detectors"}
    D --> D1["Fan-In / Fan-Out"]
    D --> D2["Circular Loops"]
    D --> D3["Pass-Through Chains"]
    D --> D4["Device/IP Clusters"]
    D --> D5["Behavioral Spikes"]
    D1 & D2 & D3 & D4 & D5 --> E["Innocence Guards"]
    E --> F["Watchlist Matching"]
    F --> G["Scoring & Explainability Engine"]
    G --> H["Community Ring Detection (Louvain)"]
    H --> I["Alerts Queue & Command Center"]
```

---

## 3. Investigation & Freeze-First Fund Recovery Workflow

Unlike legacy rule engines that alert sequentially from victim to hop 1, MuleTrace traverses the entire propagation tree using proportional-split flow physics and identifies terminal holding accounts holding stolen funds.

```mermaid
sequenceDiagram
    autonumber
    actor Analyst as Fraud Analyst
    participant UI as Command Center
    participant Engine as Trace Engine
    participant MakerChecker as Dual-Authorization Service
    actor Lead as Team Lead

    Analyst->>UI: Select Victim Account
    UI->>Engine: POST /api/v1/trace
    Engine-->>UI: Trace Tree + Freeze Priority Ranking
    Note over UI: Ranks accounts holding > ₹0 recoverable funds
    Analyst->>UI: Draft Freeze Request
    UI->>MakerChecker: POST /api/v1/freeze-requests
    Note over MakerChecker: Dual-Control: Analyst cannot self-approve
    Lead->>UI: Review Evidence & Recoverable Amount
    Lead->>MakerChecker: POST /api/v1/freeze-requests/{id}/approve
    MakerChecker-->>UI: Cryptographic Freeze Order & Packet
```

---

## 4. Cryptographic Audit Chain Architecture

Every user action (login, PII reveal, decision, freeze, config override) is hashed and appended to an append-only cryptographic ledger.

$$\text{Hash}_n = \text{SHA256}\left(\text{Hash}_{n-1} \,\|\, \text{Payload}_n\right)$$

```mermaid
graph LR
    Genesis["Genesis Hash (000...000)"]
    Block1["Audit Entry #1\n(LOGIN: analyst)"]
    Block2["Audit Entry #2\n(DECISION: ACC-001)"]
    Block3["Audit Entry #3\n(REVEAL_PII: reason)"]

    Genesis --> Block1
    Block1 -->|prev_hash| Block2
    Block2 -->|prev_hash| Block3
```

Any retrospective alteration to database rows causes an immediate verification mismatch when `/api/v1/audit/verify` is triggered.
