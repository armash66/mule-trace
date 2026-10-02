"""Security and authentication test suite."""
from __future__ import annotations

from jose import jwt
import pytest
from app.core.config import get_settings
from app.core.security import (
    Role,
    create_access_token,
    decode_token,
    verify_password,
)
from app.models.models import FreezeRequest, User, gen_id


def test_login_success(client):
    """Test successful authentication."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "analyst", "password": "analyst123"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "access_token" in data
    assert data["role"] == "analyst"
    assert data["username"] == "analyst"


def test_login_invalid_password(client):
    """Test login failure with bad credentials."""
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "analyst", "password": "wrong_password"},
    )
    assert resp.status_code == 401
    assert "Invalid username or password" in resp.json()["detail"]


def test_jwt_alg_none_rejected():
    """Security P0: Ensure JWT with alg=none is strictly rejected."""
    # base64url of {"alg":"none","typ":"JWT"}.{"sub":"victim-user","role":"admin"}.
    fake_none_token = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ2aWN0aW0tdXNlciIsInJvbGUiOiJhZG1pbiJ9."
    with pytest.raises(Exception):
        decode_token(fake_none_token)


def test_role_matrix_auditor_read_only(client, db_session):
    """Security P0: Auditor cannot perform mutating actions (e.g. create decision)."""
    # Login as auditor
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "auditor", "password": "auditor123"},
    )
    token = resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt mutating action: POST /decisions
    decision_resp = client.post(
        "/api/v1/decisions",
        json={"account_id": "ACC-000001", "action": "CONFIRMED_MULE", "note": "Auditor test"},
        headers=headers,
    )
    assert decision_resp.status_code == 403


def test_maker_checker_freeze_approval(client, db_session):
    """Security P0: Same user cannot approve their own freeze request."""
    from app.models.models import Case, gen_id
    case = Case(id=gen_id(), title="Investigation Case 1", status="UNREVIEWED")
    db_session.add(case)
    db_session.commit()

    # 1. Login as lead
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "lead", "password": "lead123"},
    )
    token = resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Lead creates freeze request
    create_resp = client.post(
        "/api/v1/freeze-requests",
        json={
            "case_id": case.id,
            "account_ids": ["ACC-000099"],
            "total_recoverable": 50000.0,
            "note": "Suspicious rapid layering",
        },
        headers=headers,
    )
    assert create_resp.status_code == 200
    req_id = create_resp.json()["data"]["id"]

    # 3. Same lead tries to approve it -> must fail with 400 or 403 or 409
    approve_resp = client.post(
        f"/api/v1/freeze-requests/{req_id}/approve",
        json={"note": "Self approval attempt"},
        headers=headers,
    )
    assert approve_resp.status_code in (400, 403, 409)
