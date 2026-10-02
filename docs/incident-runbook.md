# MuleTrace — Incident Runbook & Operational Response

This runbook guides fraud response teams, system administrators, and security officers when responding to active mule rings or platform incidents.

---

## 1. High-Severity Active Mule Ring Detected

1. **Triage**:
   - Filter alerts by `Risk Band = CRITICAL`.
   - Identify the primary community ring identifier on the Rings page or Investigation Workspace.
2. **Trace & Freeze-First**:
   - Select the earliest victim transaction feeding the ring.
   - Run **Trace Money** / **Freeze Plan** to identify which accounts currently hold positive recoverable balances.
3. **Dual-Control Authorization**:
   - Analyst drafts freeze order (`POST /api/v1/freeze-requests`).
   - Lead reviewer verifies evidence notes and approves (`POST /api/v1/freeze-requests/{id}/approve`).
4. **Law Enforcement & Bank Notification**:
   - Generate standard STR / LEA dossier (`/api/v1/reports` or `/api/v1/cases/{ring_id}/report`).
   - Dispatch freeze packet to receiving bank nodal officer and 1930 / I4C portal.

---

## 2. API Is Unavailable

1. Check `GET /health` or `GET /api/v1/health`.
2. Check backend console logs for startup or database exceptions.
3. Confirm frontend `VITE_API_URL` value and Vite proxy settings.
4. Do not make a freeze decision from stale browser state.

---

## 3. Unexpected Detector Results

1. Record the run ID and source file names.
2. Open the Data Health / Quality card.
3. Check timestamps, duplicate rows, self-transfers, and missing identifiers.
4. Review the account evidence and innocence guard explanation.
5. Re-run with a known synthetic fixture before altering detector thresholds.

---

## 4. Audit Chain Verification Failure

If audit verification flags an integrity mismatch:
1. Stop exports and case handoffs from the affected database immediately.
2. Preserve the database file and application logs.
3. Record the first broken audit entry and timestamp.
4. Restrict write access while the database is cloned for forensic investigation.
5. Re-verify the hash chain after remediation and document the findings.

---

## 5. Production Operations Note

The local SQLite configuration is optimized for demos, evaluations, and development. Production deployments require managed databases, automated WAL backups, strict role-based access controls, and encrypted storage.
