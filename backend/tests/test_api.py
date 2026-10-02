"""Tests for MuleTrace REST API endpoints."""

from __future__ import annotations

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db import init_db
from backend.app.core.security import Role, TokenData, get_current_user

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = REPO_ROOT / "data"

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db()
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        user_id="test-analyst",
        username="test-analyst",
        role=Role.ANALYST,
        exp=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
    )
    yield
    app.dependency_overrides.clear()


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "MuleTrace"}


def test_demo_load_and_accounts_api():
    # 1. Trigger demo data load
    res = client.post("/api/demo/load")
    assert res.status_code == 200
    data = res.json()
    assert "run_id" in data
    assert data["flagged_count"] > 0

    # 2. Query accounts list
    res = client.get("/api/accounts?page=1&page_size=10")
    assert res.status_code == 200
    accts = res.json()
    assert accts["total"] > 0
    assert len(accts["items"]) <= 10

    first_account = accts["items"][0]["account_id"]

    # 3. Filter by min_score
    res = client.get("/api/accounts?min_score=50")
    assert res.status_code == 200
    for item in res.json()["items"]:
        assert item["risk_score"] >= 50

    # 4. Get account detail
    res = client.get(f"/api/accounts/{first_account}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["account_id"] == first_account
    assert "risk_score" in detail
    assert "reasons" in detail

    # 5. Record analyst decision
    decision_payload = {
        "status": "confirmed",
        "note": "Suspicious cyclic transfer detected with zero retained balance.",
        "analyst": "Alex Chen",
    }
    res = client.post(f"/api/accounts/{first_account}/decisions", json=decision_payload)
    assert res.status_code == 200
    dec_out = res.json()
    assert dec_out["status"] == "confirmed"
    assert dec_out["analyst"] == "Alex Chen"

    # 6. Verify decision shows in account detail
    res = client.get(f"/api/accounts/{first_account}")
    assert res.status_code == 200
    detail = res.json()
    assert len(detail["decisions"]) >= 1
    assert detail["decisions"][0]["status"] == "confirmed"

    # 7. Get graph neighbourhood
    res = client.get(f"/api/graph/{first_account}?hops=1&max_nodes=25")
    assert res.status_code == 200
    graph_data = res.json()
    assert "nodes" in graph_data
    assert "edges" in graph_data
    assert any(n["id"] == first_account for n in graph_data["nodes"])

    # 8. Check stats endpoint
    res = client.get("/api/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_accounts"] > 0
    assert stats["flagged_count"] > 0
    assert stats["confirmed_count"] >= 1

    # 9. Test SAR export
    res = client.get(f"/api/export/sar/{first_account}")
    assert res.status_code == 200
    sar = res.json()
    assert sar["report_type"] == "SUSPICIOUS_ACTIVITY_REPORT_EVIDENCE"
    assert sar["subject_account_id"] == first_account
    assert sar["classification"] == "CONFIRMED_MONEY_MULE"

    # 10. Test CSV export
    res = client.get("/api/export/csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "account_id,risk_score" in res.text
