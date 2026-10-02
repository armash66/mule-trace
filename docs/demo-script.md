# MuleTrace — 3-Minute Live Demo Script

Use this exact script for presenting MuleTrace to judges and evaluators.

---

### Step 1: The Problem & Opening Hook (0:00 – 0:30)
- *"Good morning judges. In India, cyber fraud victims lose crores daily to digital arrest and investment scams. Traditional AML systems take days to alert on mule accounts, by which time funds have already been layered across 5 hops and cashed out at ATMs."*
- *"We built **MuleTrace**: an end-to-end mule detection, money-tracing, and freeze-first fund recovery platform."*

---

### Step 2: Landing & Instant Ingestion (0:30 – 1:00)
- **Show Landing Page** (`http://localhost:5173`):
  - Highlight the animated money-flow network visualizer.
  - Mention: *"Everything runs locally in Docker or the browser with zero buffer lag."*
- Click **"Sign In"** as Analyst (`analyst` / `analyst123`).

---

### Step 3: Command Center & Detection Engine (1:00 – 1:45)
- **Point to Command Center** (`/app/command-center`):
  - *"Our engine runs 5 specialized topological detectors in parallel: Fan-In/Fan-Out funnels, Circular loops, Pass-through transit chains, New-account device clusters, and Behavioral spikes."*
  - Select the top alert in the queue.
  - Show the **Account Drawer**:
    - Highlight the **Plain-Language Reason**: *"Received ₹4.8L from 5 senders within 18 minutes, immediately disbursed 94% to 3 downstream accounts."*
    - Show the **Score Breakdown Bars** and the **Innocence Guard** checks (payroll/merchant suppression).
    - Demonstrate **PII Masking**: Click "Reveal Account ID", enter reason `Case-9021`, show the 60-second countdown.

---

### Step 4: The Game Changer — Freeze-First Replay (1:45 – 2:30)
- Click **"Trace Money"** from the victim node:
  - *"Legacy systems try to freeze hop 1, where the balance is already zero. MuleTrace performs proportional-split propagation across the entire graph to locate **where the money actually is right now**."*
  - Point to the **Freeze-First Priority List**:
    - *"It ranks terminal holding accounts with recoverable amounts: 'Recover ₹1,85,000 of ₹2,00,000'."*
  - Press **Play Replay**: Show the transaction flow animation and timeline synchronization.

---

### Step 5: Enterprise Governance & Tamper-Proof Audit (2:30 – 3:00)
- Open **Audit Page** (`/app/audit`):
  - Click **"Verify Hash Chain"**: Show **Chain Intact ✓**.
  - *"Every analyst action, unmask event, and freeze order is committed to an append-only SHA-256 cryptographic ledger."*
  - Mention Maker-Checker enforcement: *"Analysts cannot self-approve freezes or threshold modifications."*
- **Closing**: *"MuleTrace cuts investigation time from 4 days to 4 minutes, maximizing victim fund recovery. Thank you."*
