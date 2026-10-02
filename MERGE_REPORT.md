# Merge Report

## Safety Inventory

Backup tag: `backup-before-merge` -> `f799417`

| Branch name | Last commit message | Commits ahead of main |
|---|---|---:|
| `fawwaz` | Second-commit | 0 |
| `feature/muletrace-backend` | feat: complete MuleTrace mule-network detection and response platform (Phases 0-12) | 0 |
| `phase/08b-data-hub` | feat(data-hub): implement Phase 8b multi-format data intake, auto-mapping, validation, and execution pipeline | 0 |
| `redesign/r1-tokens` | feat(design): R1 tokens, fonts, theme helper, and design checker | 0 |
| `redesign/r2-sweep` | feat(design): R2 colour and wording sweep per Evidence Ledger rename table | 0 |
| `redesign/r3-appshell` | feat(design): R3 rebuild AppShell sidebar, top bar, and footer | 0 |
| `redesign/r4-patterns` | feat(design): R4 rebuild How it works page with 4 rows, serif hero numbers, and diagrams | 0 |
| `redesign/r5-overview` | Step R5: Evidence Ledger Overview (CommandCenter) with paper-and-ink styling | 0 |
| `redesign/r6-alerts-investigate` | Step R6: Evidence Ledger Alerts table and Investigate panel with rubber-stamp and paper-and-ink styling | 0 |
| `redesign/r7-graph` | Step R7: Evidence Ledger Cytoscape graph restyling with paper-and-ink and single signal node | 0 |
| `redesign/r8-data` | Step R8: Evidence Ledger Data page, dropzone, and progress styling | 0 |
| `redesign/r9-final` | Step R9: Final Evidence Ledger design sweep, banned words removal, and compliance checks | 0 |

## Merge Order

Oldest first, with redesign branches last: `fawwaz`, `feature/muletrace-backend`, `phase/08b-data-hub`, `redesign/r1-tokens`, `redesign/r2-sweep`, `redesign/r3-appshell`, `redesign/r4-patterns`, `redesign/r5-overview`, `redesign/r6-alerts-investigate`, `redesign/r7-graph`, `redesign/r8-data`, `redesign/r9-final`.

## Results

### Branches Merged

All requested branches were already ancestors of `main`; each prescribed merge returned `Already up to date`:

- `fawwaz`
- `feature/muletrace-backend`
- `phase/08b-data-hub`
- `redesign/r1-tokens`
- `redesign/r2-sweep`
- `redesign/r3-appshell`
- `redesign/r4-patterns`
- `redesign/r5-overview`
- `redesign/r6-alerts-investigate`
- `redesign/r7-graph`
- `redesign/r8-data`
- `redesign/r9-final`

### Conflicts

No textual merge conflicts occurred. Post-merge checks found two package/module collisions: `app.schemas` and `app.models` each exist as both a module and package. Compatibility exports were added so both schema/model generations remain available, and both SQLAlchemy metadata sets are initialized.

### Verification

- Conflict-marker scan: passed; no `<<<<<<<`, `=======`, or `>>>>>>>` markers.
- Frontend `npm install`: passed in `web/`.
- Frontend `npm run build`: passed after fixing doubled font quotes from the R2 token sweep. Vite reported only its existing large-chunk warning.
- Design check: passed (`design ok`).
- Tracked artifact check: passed after untracking `data/accounts.csv` and `data/transactions.csv` and adding `data/*.csv` to `.gitignore`.
- Backend import probe: passed (`MuleTrace API`).
- Pydantic schema resolution probe: passed for `FileInfo`, `Finding`, `FreezePlanResponse`, and `ExplainResponse`.
- Backend pytest: initial run was 36 passed, 10 failed. After compatibility fixes, the latest completed full run reached 45 passed, 1 failed because an existing SQLite `decisions` table lacked `user_id`. A migration for that column is now included; the focused rerun was skipped by tool confirmation, so a fully green pytest result is not claimed.
- App smoke test: Docker Compose was blocked because Docker Desktop's Linux engine was unavailable. A local backend reached `/health`, but seeded API smoke testing remained blocked by the long-running demo initialization. Browser routes rendered; backend-dependent Alerts data, decisions, upload persistence, freeze plans, and replay were not fully verified.

### Branch Cleanup

- Deleted as fully merged: `fawwaz`, `feature/muletrace-backend`, `phase/08b-data-hub`, and `redesign/r1-tokens` through `redesign/r9-final`.
- Left: `main` and the required `dev` working branch. No feature branches remain under `git branch --no-merged main`.
- Created the required working branch `dev`, then switched back to `main`.
