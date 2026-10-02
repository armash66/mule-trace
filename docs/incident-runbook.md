# Incident Runbook

## API Is Unavailable

1. Check `GET /health`.
2. Check the backend terminal for startup and database errors.
3. Confirm the frontend `VITE_API_URL` value and Vite proxy.
4. Do not make a freeze decision from stale browser data.

## Unexpected Detector Results

1. Record the run ID and source file names.
2. Open the data health report.
3. Check timestamps, duplicate rows, self-transfers, and missing identifiers.
4. Review the account evidence and innocence guard explanation.
5. Re-run with a known synthetic fixture before changing thresholds.

## Audit Verification Failure

1. Stop exports and case handoffs from the affected run.
2. Preserve the database and application logs.
3. Record the first broken audit entry and the operator who found it.
4. Restrict write access while the database is copied for investigation.
5. Re-run audit verification after remediation and document the result.

## Production Note

The local SQLite setup is for development and demos. Use backups, access controls, monitoring, and an approved incident process before connecting real financial data.
