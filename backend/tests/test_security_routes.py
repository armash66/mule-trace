from fastapi.testclient import TestClient

from backend.app.main import app


def test_freeze_request_requires_authentication():
    client = TestClient(app)
    response = client.post(
        "/api/v1/freeze-requests",
        json={"case_id": "case-1", "account_ids": ["ACC_1"], "total_recoverable": 100.0},
    )
    assert response.status_code == 401
