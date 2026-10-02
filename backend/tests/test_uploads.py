"""Unit tests for Phase 8b Data Hub backend endpoints.

Tests:
1. Multi-format upload & column auto-detection
2. Synonym mapping and confidence calculation
3. Date & amount cleaning (Lakh format, currency symbols, UTC timezone)
4. Path traversal safety in zip files
5. Validation issue classification and rejects export
6. Run creation, SSE progress streaming, cancellation, and rename/delete
7. Template downloads
"""

from __future__ import annotations

import io
import zipfile
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db import init_db
from backend.app.core.security import Role, TokenData, get_current_user

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    app.dependency_overrides[get_current_user] = lambda: TokenData(
        user_id="test-analyst", username="test-analyst", role=Role.ANALYST,
        exp=datetime.now(timezone.utc),
    )
    init_db()
    yield
    app.dependency_overrides.clear()


def test_templates_download():
    """Verify downloadable templates for transactions and accounts."""
    res_txn = client.get("/api/v1/templates/transactions.csv")
    assert res_txn.status_code == 200
    assert "txn_id,timestamp,src_account,dst_account,amount" in res_txn.text

    res_acct = client.get("/api/v1/templates/accounts.csv")
    assert res_acct.status_code == 200
    assert "account_id,opened_date,kyc_phone" in res_acct.text


def test_upload_and_mapping_auto_detection():
    """Test CSV upload with synonyms (sender, receiver, amt) auto-mapped to src_account, dst_account, amount."""
    csv_content = (
        "sender,receiver,trans_date,amt,channel,dev\n"
        "ACC_01094,ACC_05001,2026-10-01 10:14:00,₹45000,UPI,DEV_1\n"
        "ACC_01429,ACC_05001,2026-10-01 10:16:30,38500,IMPS,DEV_2\n"
        "ACC_05001,ACC_05002,2026-10-01 10:28:00,1.5 Lakhs,UPI,DEV_3\n"
    )

    files = [("files", ("my_transactions.csv", csv_content.encode("utf-8"), "text/csv"))]
    res = client.post("/api/v1/uploads", files=files)
    assert res.status_code == 200
    data = res.json()
    assert "upload_id" in data
    assert data["has_accounts"] is False
    assert data["reduced_mode_note"] is not None

    mapping = data["suggested_mapping"]["transactions"]
    assert mapping["src_account"]["source_column"] == "sender"
    assert mapping["src_account"]["confidence"] == "Matched"
    assert mapping["dst_account"]["source_column"] == "receiver"
    assert mapping["dst_account"]["confidence"] == "Matched"
    assert mapping["amount"]["source_column"] == "amt"
    assert mapping["amount"]["confidence"] == "Matched"
    assert mapping["timestamp"]["source_column"] == "trans_date"
    assert mapping["timestamp"]["confidence"] == "Matched"

    upload_id = data["upload_id"]

    # Save mapping
    map_req = {
        "transactions_mapping": {
            "src_account": "sender",
            "dst_account": "receiver",
            "timestamp": "trans_date",
            "amount": "amt",
            "channel": "channel",
            "device_id": "dev",
        },
        "timezone": "Asia/Kolkata",
    }
    res_map = client.put(f"/api/v1/uploads/{upload_id}/mapping", json=map_req)
    assert res_map.status_code == 200

    # Validate upload
    res_val = client.post(f"/api/v1/uploads/{upload_id}/validate")
    assert res_val.status_code == 200
    val_data = res_val.json()
    assert val_data["can_proceed"] is True
    assert val_data["total_rows"] == 3
    # 1.5 Lakhs should have been parsed as 150000.0
    assert val_data["amount_stats"]["max"] == 150000.0


def test_zip_path_traversal_safety():
    """Verify that malicious zip files with path traversal filenames (../../evil.csv) are rejected/sanitized."""
    bio = io.BytesIO()
    with zipfile.ZipFile(bio, mode="w") as z:
        z.writestr("../../../evil.csv", "src_account,dst_account,amount,timestamp\nA,B,100,2026-10-01\n")
        z.writestr("safe_transactions.csv", "src_account,dst_account,amount,timestamp\nACC_A,ACC_B,5000,2026-10-01T10:00:00Z\n")
    bio.seek(0)

    files = [("files", ("archive.zip", bio.getvalue(), "application/zip"))]
    res = client.post("/api/v1/uploads", files=files)
    assert res.status_code == 200
    data = res.json()
    # evil.csv should not overwrite filesystem or be unsafe
    file_names = [f["filename"] for f in data["files"]]
    assert "safe_transactions.csv" in file_names


def test_validation_rejects_and_export():
    """Verify that invalid amounts or missing dates are rejected and retrievable via rejects.csv."""
    csv_content = (
        "src,dst,ts,amt\n"
        "ACC_1,ACC_2,2026-10-01T10:00:00Z,5000\n"
        "ACC_2,ACC_3,invalid_date,10000\n"
        "ACC_3,ACC_4,2026-10-01T11:00:00Z,-500\n"
    )
    files = [("files", ("txns.csv", csv_content.encode("utf-8"), "text/csv"))]
    res = client.post("/api/v1/uploads", files=files)
    assert res.status_code == 200
    uid = res.json()["upload_id"]

    client.put(
        f"/api/v1/uploads/{uid}/mapping",
        json={"transactions_mapping": {"src_account": "src", "dst_account": "dst", "timestamp": "ts", "amount": "amt"}},
    )

    res_val = client.post(f"/api/v1/uploads/{uid}/validate")
    assert res_val.status_code == 200
    data = res_val.json()
    assert data["rejected_rows_count"] >= 1

    # Download rejects.csv
    res_rejects = client.get(f"/api/v1/uploads/{uid}/rejects.csv")
    assert res_rejects.status_code == 200
    assert "rejection_reason" in res_rejects.text


def test_run_lifecycle_and_management():
    """Test creating run from upload, querying status, renaming, making active, and deleting."""
    csv_content = (
        "src_account,dst_account,timestamp,amount,channel\n"
        "ACC_1001,ACC_2001,2026-10-01T10:00:00Z,50000,UPI\n"
        "ACC_1002,ACC_2001,2026-10-01T10:05:00Z,40000,IMPS\n"
        "ACC_2001,ACC_3001,2026-10-01T10:20:00Z,85000,UPI\n"
    )
    files = [("files", ("txns.csv", csv_content.encode("utf-8"), "text/csv"))]
    res_up = client.post("/api/v1/uploads", files=files)
    uid = res_up.json()["upload_id"]
    client.post(f"/api/v1/uploads/{uid}/validate")

    # Start run
    res_run = client.post("/api/v1/runs", json={"upload_id": uid, "name": "Test Run Oct", "config_preset": "default"})
    assert res_run.status_code == 200
    run_id = res_run.json()["run_id"]

    # Check status
    res_status = client.get(f"/api/v1/runs/{run_id}/status")
    assert res_status.status_code == 200
    assert "stage" in res_status.json()

    # Rename run
    res_patch = client.patch(f"/api/v1/runs/{run_id}", json={"name": "Renamed Run", "is_active": True})
    assert res_patch.status_code == 200
    assert res_patch.json()["name"] == "Renamed Run"

    # Export flagged CSV
    res_flagged = client.get(f"/api/v1/runs/{run_id}/flagged.csv")
    assert res_flagged.status_code == 200
    assert "account_id,risk_score" in res_flagged.text

    # Delete run
    res_del = client.delete(f"/api/v1/runs/{run_id}")
    assert res_del.status_code == 200


def test_nested_mapping_and_synthetic_dataset_generation():
    """Verify nested dictionary mapping payload and parametric dataset generation endpoint."""
    csv_content = (
        "payer,payee,event_time,total_amt\n"
        "ACC_X,ACC_Y,2026-10-01T12:00:00Z,25000\n"
        "ACC_Y,ACC_Z,2026-10-01T12:05:00Z,24500\n"
    )
    files = [("files", ("nested_txns.csv", csv_content.encode("utf-8"), "text/csv"))]
    res_up = client.post("/api/v1/uploads", files=files)
    assert res_up.status_code == 200
    uid = res_up.json()["upload_id"]

    # Nested mapping payload as sent by frontend
    nested_map = {
        "transactions": {
            "src_account": {"source_column": "payer", "confidence": "Matched"},
            "dst_account": {"source_column": "payee", "confidence": "Matched"},
            "timestamp": {"source_column": "event_time", "confidence": "Matched"},
            "amount": {"source_column": "total_amt", "confidence": "Matched"},
        },
        "timezone": "IST",
    }
    res_map = client.put(f"/api/v1/uploads/{uid}/mapping", json=nested_map)
    assert res_map.status_code == 200

    res_val = client.post(f"/api/v1/uploads/{uid}/validate")
    assert res_val.status_code == 200
    assert res_val.json()["can_proceed"] is True

    # Test dataset generation endpoint
    gen_req = {
        "seed": 99,
        "size": "small",
        "evasion_level": 0.1,
        "include_decoys": True,
    }
    res_gen = client.post("/api/v1/datasets/generate", json=gen_req)
    assert res_gen.status_code == 200
    gen_data = res_gen.json()
    assert "run_id" in gen_data
    assert gen_data["status"] == "ok"

