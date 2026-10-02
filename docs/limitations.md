# Limitations

- Demo data is synthetic and does not represent a real bank ledger.
- A risk score is a triage aid, not a determination of fraud or intent.
- SQLite and the in-memory graph are local-demo defaults. High-volume deployments need managed storage and an operational graph strategy.
- Recovery estimates depend on the completeness, ordering, and quality of uploaded transactions.
- Shared devices, payroll, merchants, and family transfers can look similar to suspicious movement; analysts must review guard explanations.
- The browser can render without the backend, but live alerts, decisions, uploads, freeze plans, and replay require the API.
