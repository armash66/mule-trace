# MuleTrace — Implementation Assumptions

This document records the architectural and operational defaults chosen during implementation in accordance with the Builder Rule (V3 Section 0.4).

1. **Default Currency & Timezone**:
   - Primary currency: `INR` (₹).
   - Reference timezone: `Asia/Kolkata` (IST, UTC+05:30), treated as UTC in storage timestamps unless explicitly provided.
2. **Storage Architecture**:
   - Primary operational store: SQLite with Write-Ahead Logging (WAL) enabled for high concurrent read throughput. Suitable for the demo and local deployment.
   - Graph representation: Directed multigraph loaded into in-memory NetworkX with adjacency index caching for sub-100ms path lookups.
3. **Dual-Control (Maker-Checker)**:
   - Freeze requests initiated by an Analyst require approval from a Lead or Compliance officer.
   - Threshold configuration modifications require separate approval before taking effect.
   - A human confirms account decisions and freeze actions.
4. **Data Quality & Sanitization**:
   - Zero-amount or negative-amount records are rejected during CSV ingest and cataloged in the `DataQuality` summary card.
   - Transactions with non-parseable timestamps are discarded without aborting the ingest batch.
   - Uploaded data can alter detector output; benchmark numbers apply to the documented synthetic dataset.
