# MuleTrace Red-Team Audit

Audit date: 2026-10-02. Scope: repository inspection plus runnable benchmark and import checks. All performance and detection figures below are synthetic or local-process measurements; no production or browser measurement was available.

## Verdict

1. The documented clean-start path is broken: importing `backend.app.main` fails without an undocumented `PYTHONPATH=backend`.
2. The main evaluation command refuses to run with the checked-in thresholds, so the README headline metrics are not reproducible from the documented command.
3. The benchmark passes only after adding a hidden import-path environment variable.
4. The legacy `/api` and `/api/v1` routers expose account decisions and freeze-request mutation routes without auth dependencies.
5. The project is a synthetic, in-process demo; claims about real-time/production scale, seed variance, and browser resilience are not measured here.
6. The full suite still fails against the existing local SQLite file because an older `decisions.id` schema is incompatible with the current string-ID model.

## Findings

| ID | Severity | Area | Finding | Evidence | How a judge would exploit it | Fix effort | Impact on score | Status |
|---|---|---|---|---|---|---|---|---|
| AUDIT-001 | CRITICAL | Clean start | The README/Makefile startup import path was broken from a normal repository-root Python process. | Before fix: `python -c "from backend.app.main import app"` -> `ModuleNotFoundError: No module named 'app'`. | Run the documented backend command on a clean machine; the server exits before `/health` is available. | S | Demo/setup failure | fixed; root import now reports `root import ok 9` |
| AUDIT-002 | HIGH | Evaluation | The primary evaluator refused to run against the checked-in thresholds. | Before fix: `python scripts/evaluate.py` -> frozen-threshold error. | Ask for a fresh reproduction of the README numbers; the old command could not produce them. | S | Credibility | fixed operationally; measured result is much weaker than old claims |
| AUDIT-003 | HIGH | Security | Both compatibility routers included mutation routes without auth dependencies. | Before fix: `backend/app/api/__init__.py:19-42` included reports; freeze create/update had only `Depends(get_db)`. | POST or PATCH a freeze request without a bearer token and alter response workflow state. | M | Security/compliance | partially fixed; freeze requests and account decisions now require JWT/RBAC, other mutations remain |
| AUDIT-004 | HIGH | Benchmark reproducibility | The benchmark failed from the documented root invocation because it imported `app` as a top-level package. | Before fix: `python scripts/benchmark_ingest.py` -> `ModuleNotFoundError`; after import shim, root benchmark passed at 11.16s. | Follow the README/Makefile command and get a traceback instead of a number. | S | Reproducibility | fixed |
| AUDIT-005 | HIGH | Claims vs evidence | README and evaluation docs published stale seed-42 metrics without committed raw artifacts. | Old claims were at `README.md:141-151` and `docs/evaluation.md:3-47`; current evaluator measured 0.1% precision, 98.5% recall, 0.3% F1. | Ask “show me the command and raw output”; old headline numbers were not reproducible. | M | Trust | cut/replaced with current measured labels |
| AUDIT-006 | MEDIUM | Scale | Only one local 100k-row intake benchmark was runnable; the requested 1k/5k/10k tx/s, p50/p95/p99, depth, queue-growth, and 10-minute leak measurements are absent. | Root `python scripts/benchmark_ingest.py` measured parse `0.26s`, validation `10.90s`, total `11.16s`; no tx/s or latency distribution is emitted. | Ask for real-time throughput or p99 latency; the repository has no measured answer. | L | Systems score | won't fix in this pass |
| AUDIT-007 | MEDIUM | Demo | No `npm run demo`, `npm run eval`, or `npm run bench` scripts exist in `web/package.json`; Makefile starts backend only and `demo` runs a long-lived server. | `web/package.json` scripts contain only `dev`, `build`, `preview`; Makefile now exposes `eval` and `bench`, but no repeatable end-to-end demo harness. | Try the prompt’s requested commands from a clean checkout; demo still requires manual process management. | M | Demo reliability | partially fixed |
| AUDIT-008 | MEDIUM | Fallback behavior | The frontend API client silently substitutes large mock datasets whenever requests fail, which can make an offline/broken backend look healthy. | `web/src/api/client.ts:50-221` catches request errors and returns `mockStats`, `mockAccounts`, `mockReplay`, and other mock responses. | Disconnect the backend and click through the dashboard; the UI still shows plausible results without a visible global “offline/mock” state. | M | Demo honesty | remains risky |
| AUDIT-009 | MEDIUM | Data model | The replay and ring reports are explicitly synthetic and use heuristic/fallback values when graph data is missing. | `backend/app/api/rings.py:132-151` returns hard-coded fallback totals; `backend/app/analytics/replay.py:76-110` labels an approximation as taint and uses `total_tainted * 0.85` when no freeze set. | Use an empty or partial dataset and present the result as a measured recovery plan. | M | Explainability | remains risky |
| AUDIT-010 | LOW | Claims | Optional production integrations are configuration flags, not implemented runtime integrations in the checked-in requirements. | `backend/app/core/config.py:82-103` has `neo4j_enabled`, `streaming_mode`, and Neo4j settings; `backend/requirements.txt` has no Neo4j/Kafka client. | Ask where the stream or graph database is; the answer is “not enabled/implemented in this repo.” | M | Scope clarity | won't fix; cut claim |
| AUDIT-011 | HIGH | Database migration | Existing local databases created by the older model can fail account-decision writes after upgrade. | Final `pytest backend/tests -q`: `1 failed, 57 passed`; `sqlite3.IntegrityError: datatype mismatch` inserting string decision ID into the existing integer `decisions.id` column. | Run the demo with an existing database and record a decision; the workflow errors instead of saving it. | L | Demo reliability |

## Claims we cannot back up

- `README.md:147-151` benchmark results: no reproducible `evaluate.py` run with checked-in thresholds and no raw result artifact.
- `docs/evaluation.md:21-47` seed-42 recall, false-positive, stopped-funds, and 14-second claims: the docs identify synthetic data but do not link to committed raw outputs; only the independent 100k intake benchmark was rerun here.
- Any real-time, millisecond, 1k/5k/10k tx/s, p99, queue-growth, or 10-minute memory claim: no such measurement exists in the repository audit output.
- Any Kafka, Neo4j, federated-learning, or homomorphic-encryption capability claim: no corresponding runtime dependency or working path was found.

## Demo kill-switches

1. Backend startup from the documented root command fails because of the `app` import path.
2. A judge asks to rerun evaluation and `scripts/evaluate.py` refuses the checked-in thresholds.
3. Freeze-request state can be changed through the unauthenticated compatibility API.
4. A backend outage is masked by frontend mock fallbacks instead of a clear offline state.
5. The replay/freeze UI can display heuristic fallback totals when graph data is unavailable.

## Seed variance

| Measurement | Result |
|---|---|
| Seed 42 | Not rerun: primary evaluator refused unfrozen thresholds. |
| Seeds 1, 2, 3, 4, 5 | Not measured: evaluator has no seed CLI and no committed result artifact. |

## Measured performance

| Command | Result | Conditions |
|---|---:|---|
| `python scripts/benchmark_ingest.py` | 11.16s total | Synthetic 100,000-row parse + validation; parse 0.26s, validation 10.90s. |
| `python scripts/benchmark_ingest.py` | Failed | Root invocation; `ModuleNotFoundError: No module named 'app'`. |
| `python scripts/evaluate_evasion.py` | Completed | Synthetic evasion curve: overall recall 94.4% at level 0.0 and 70.7% at level 1.0. |

## Prioritized fix plan

### Next 1 hour

1. Fix package imports so `python -m uvicorn backend.app.main:app` and the benchmark work from the repo root.
2. Protect mutation routes with the existing JWT/RBAC dependency, or remove the unauthenticated legacy router before demo.
3. Add an explicit evaluator setup/result command and stop publishing numbers that cannot be reproduced as checked in.

### Next 3 hours

1. Add a small repeatable smoke harness for health, demo load, freeze-request authorization, and frontend build.
2. Make offline/mock mode visible in the UI instead of silently replacing server failures.
3. Add measured multi-seed evaluation output and retain raw JSON/CSV artifacts.

### Next 6 hours

1. Measure only the supported local workload and remove unsupported real-time/production wording.
2. Add malformed-upload, auth-bypass, and empty-graph tests.
3. Rehearse the synthetic-data and heuristic-fallback limitations with judges.

Cut or stop claiming: production real-time scale, millisecond latency, multi-seed robustness, and optional integrations that are only flags.

## Status after fix phase

The import path, evaluator setup, benchmark root invocation, stale README benchmark table, and selected mutation authorization paths were addressed. Remaining high-risk items are frontend silent mock fallback, incomplete auth coverage across every mutation route, missing multi-seed/performance evidence, and heuristic synthetic replay fallbacks.
