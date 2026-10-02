# Judge preparation

All answers below use the current repository and the 2026-10-02 local measurements. Demo data is synthetic. Where evidence is missing, the honest answer is stated explicitly.

## Hard questions we can't dodge

### Judge A — bank fraud-operations lead

1. **Are these accounts proven criminals?** No. The README safety notice says accounts are flagged for human review; synthetic labels are not legal evidence (`README.md:7`).
2. **How many false positives are there?** We cannot give a production false-positive rate. The evaluator explicitly says the data has no real merchant labels; current overall precision was 0.1% on the held-out synthetic transaction split.
3. **Can an analyst explain a flag?** Yes, the account detail exposes observed evidence, patterns, reasons, and decisions (`backend/app/api/accounts.py:172-233`), but we have not run a browser usability study.
4. **Can an analyst undo a bad freeze?** The workflow has freeze statuses and audit rows (`backend/app/api/reports.py:37-112`), but full authenticated end-to-end release testing is not measured.
5. **Does the system freeze automatically?** No. The UI and docs describe recommended freeze actions with human review; the safety notice requires a person to confirm.
6. **Does it protect customer PII?** Some report fields are masked by `_mask` (`backend/app/api/reports.py:25-35`), but we have not completed a full log/error/event privacy audit.
7. **Does it handle a legitimate high-volume merchant?** The evaluator has a high-degree guard, but no real merchant labels exist, so this is not a validated merchant false-positive result.
8. **What would you show first?** The synthetic injected ring replay, then the observed flow evidence and freeze recommendation; I would disclose synthetic data before showing the score.

### Judge B — distributed-systems engineer

1. **Is “real-time” measured?** No. The only rerun benchmark is local 100k-row parse plus validation: 11.16s. No p50/p95/p99 or sustained tx/s measurement exists.
2. **Does it use Kafka or a streaming queue?** No checked-in Kafka client or runtime path was found; `streaming_mode` is only a configuration flag (`backend/app/core/config.py:82-103`).
3. **What is the measured throughput?** Not available. The benchmark emits total intake/validation time, not transaction throughput or queue growth.
4. **What happens when the backend dies?** The frontend catches request failures and returns mock data (`web/src/api/client.ts:50-221`), which can preserve a demo view but can also mask an outage.
5. **Does a fresh process start from the repo root?** After the import-alias fix, `python -c "from backend.app.main import app"` succeeds and reports `root import ok 9`.
6. **Does the primary evaluator run?** Yes after `python scripts/evaluate.py --freeze`; the command now freezes thresholds and the next run scores the held-out split.
7. **What are the current measured metrics?** Overall precision 0.1%, recall 98.5%, F1 0.3% on the checked-in AMLSim/HI-Small split. These are not the old README numbers.
8. **What are the operational limits?** Dense-graph depth, 1k/5k/10k tx/s, ten-minute memory behavior, and browser performance at 500+ nodes remain unmeasured.

### Judge C — security/privacy researcher

1. **Are mutation endpoints authenticated?** Freeze-request create/update and account decisions now require JWT roles (`backend/app/api/reports.py:37-87`, `backend/app/api/accounts.py:315-349`); other mutation coverage still needs completion.
2. **Can I call a freeze request anonymously?** The added security test expects `401` for unauthenticated `POST /api/v1/freeze-requests` (`backend/tests/test_security_routes.py`).
3. **Is the auth router actually mounted?** It is included for both `/api/v1` and `/api` in `backend/app/api/__init__.py`.
4. **Is the default secret safe?** No. `backend/app/core/config.py:72` contains a development fallback secret and must be overridden in deployment.
5. **Is CORS production-safe?** No. `backend/app/main.py:55-63` currently allows all origins with credentials; this is a deployment blocker.
6. **Does federated mode avoid raw identifiers?** We cannot answer yes. No federated-learning runtime was found, and no end-to-end privacy proof or test exists.
7. **Does Neo4j run?** No checked-in Neo4j dependency or active adapter was found; it is optional configuration only.
8. **Are inputs robust to hostile uploads?** Upload validation exists and has tests (`backend/tests/test_uploads.py`), but a complete fuzzing, NaN, huge-batch, and duplicate-ID security run was not completed.

## Rehearsed honest answer

“MuleTrace is a synthetic-data investigation prototype. It demonstrates graph evidence, time-aware tracing, and human-reviewed response workflow. We measured the included local benchmarks, but we do not claim production real-time scale, real-bank false-positive rates, federated privacy, or live Kafka/Neo4j operation.”
