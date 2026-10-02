# MuleTrace — Fraud Incident Response & Operational Runbook

This runbook guides fraud response teams when responding to active mule rings or security events detected by MuleTrace.

---

## 1. High-Severity Active Mule Ring Detected
1. **Triage**:
   - Filter Command Center alerts by `Risk Band = CRITICAL`.
   - Identify the primary community ring identifier on the Rings page.
2. **Trace & Freeze-First**:
   - Select the earliest victim transaction feeding the ring.
   - Run **Trace Money** (`/api/v1/trace`).
   - Export the **Freeze-First Priority List** to identify which accounts currently hold positive recoverable balances.
3. **Dual-Control Authorization**:
   - Analyst drafts freeze order (`POST /api/v1/freeze-requests`).
   - Lead reviewer verifies evidence notes and approves (`POST /api/v1/freeze-requests/{id}/approve`).
4. **Law Enforcement & Bank Notification**:
   - Generate standard STR / LEA dossier (`/api/v1/reports`).
   - Dispatch freeze packet to receiving bank nodal officer and 1930 / I4C portal.

---

## 2. Audit Chain Tamper Alert
If `/api/v1/audit/verify` returns `valid: false`:
1. **Immediate Escalation**: Alert the Chief Information Security Officer (CISO) and Lead Auditor.
2. **Identification**: Note the specific `broken_entries` IDs reported by the verification endpoint.
3. **Database Isolation**: Disconnect the application instance to prevent further state changes.
4. **Forensic Reconciliation**: Compare row hashes against offline cold backups and forensic WAL logs to determine the exact modified field and timestamp.
