#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
port="${MULETRACE_SMOKE_PORT:-8765}"
log_file="${TMPDIR:-/tmp}/muletrace-smoke-${port}.log"

cleanup() { kill "$server_pid" 2>/dev/null || true; }
trap cleanup EXIT

cd "$repo_root"
PYTHONPATH="$repo_root/backend${PYTHONPATH:+:$PYTHONPATH}" python -m uvicorn backend.app.main:app --host 127.0.0.1 --port "$port" >"$log_file" 2>&1 &
server_pid=$!

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${port}/health" >/dev/null; then break; fi
  sleep 1
done
curl -fsS "http://127.0.0.1:${port}/health" >/dev/null
token="$(PYTHONPATH="$repo_root/backend${PYTHONPATH:+:$PYTHONPATH}" python -c 'from app.core.security import create_access_token, Role; print(create_access_token("smoke", "smoke", Role.ADMIN))')"
curl -fsS -X POST "http://127.0.0.1:${port}/api/demo/load" -H "authorization: Bearer $token" >/dev/null
status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:${port}/api/v1/freeze-requests" -H 'content-type: application/json' -d '{}')"
test "$status" = "401"
(cd web && npm run build)
echo "smoke passed"
