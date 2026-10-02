# MuleTrace — Limitations and Scope Disclosures

As required by the V3 specification and responsible AI/Fintech practices, this document outlines the current limitations, operational boundaries, and planned mitigations for MuleTrace.

---

## 1. Evaluation on Synthetic Datasets
- **Current State**: Benchmark metrics (Precision, Recall, F1, Latency) are measured against deterministic synthetic datasets generated with realistic topological graph patterns (fan-in/fan-out funnels, cyclic loops, rapid pass-through chains, and device-clustered rings) alongside benign financial look-alikes (merchants, payroll, family sharing).
- **Limitation**: Demo data is synthetic and does not represent a real bank ledger. While synthetic generators replicate known typologies from FIU-IND and RBI advisories, real-world banking transaction distributions possess heavier tails, complex non-standard transaction descriptions, and regional batch processing irregularities.
- **Mitigation**: Pilot deployments must run shadow evaluations on anonymized historical transaction logs with domain-expert calibration.

---

## 2. In-Memory Graph Processing
- **Current State**: The active detection engine uses an in-memory NetworkX directed multigraph with custom chronological indexing for ultra-low latency graph traversals on sub-500k transaction windows.
- **Limitation**: Memory consumption scales linearly with edge count. Extreme dataset sizes (>5,000,000 transactions) require significant RAM or persistent graph databases.
- **Mitigation**: MuleTrace includes an architectural abstraction (`GraphStore`) designed to swap seamlessly to a distributed graph database (such as Neo4j or Memgraph) via Docker compose profile (`--profile neo4j`).

---

## 3. Balance Estimation Graceful Degradation
- **Current State**: The pass-through chain detector and freeze-first fund tracking prefer explicit `sender_balance_after` and `receiver_balance_after` fields when available in core banking dumps.
- **Limitation**: If bank extracts omit post-transaction balance columns, retention and holding balances are approximated from net chronological transfer deltas.
- **Mitigation**: The system explicitly tags alerts derived without raw balances as **`estimated`** in both API responses and UI cards, ensuring investigators never mistake approximations for ledger truths.

---

## 4. Shared Device / IP Heuristic Bias
- **Current State**: The `new_cluster` detector identifies newly activated accounts sharing device fingerprints, IPs, or KYC hash links.
- **Limitation**: In developing economies, low-income households, rural cyber cafés, and public Wi-Fi access points frequently exhibit device and IP sharing among completely benign, unrelated citizens.
- **Mitigation**: MuleTrace incorporates guard filters that automatically discount IPs or devices shared by >50 accounts (public Wi-Fi/café guard) and applies explicit innocent explanation banners (`Why this might be innocent`) for analyst review.

---

## 5. Regulatory Compliance & Human-in-the-Loop
- **Current State**: MuleTrace outputs draft Suspicious Transaction Reports (STRs) aligned with FIU-IND reporting formats.
- **Limitation**: Automated filings are strictly prohibited by law. All outputs are marked **"Draft for Human Review Only"**. A risk score is a triage prioritization aid, never an automated determination of guilt or intent.
- **Action Required**: Compliance officers and legal counsel must review and sign off before submission to regulatory authorities.
