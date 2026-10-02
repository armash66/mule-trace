# Implementation Assumptions

- Currency is INR and timestamps are treated as UTC unless the uploaded data says otherwise.
- SQLite is the default local store. It is suitable for the demo, not a complete production ledger strategy.
- The transaction graph is built in memory for fast investigation queries.
- Invalid, duplicate, zero-value, and self-transfer rows are reported or dropped according to the ingest result.
- Uploaded data can change detector output; benchmark numbers apply only to the documented synthetic dataset.
- A human confirms account decisions and freeze actions.
