"""Shared fixtures for MuleTrace tests."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.models import User, gen_id

SCRIPT = REPO_ROOT / "scripts" / "generate_data.py"
CONFIG = REPO_ROOT / "config.yaml"
TEST_DB_URL = "sqlite:///:memory:"


@pytest.fixture(scope="session")
def engine():
    eng = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=eng)
    return eng


@pytest.fixture
def db_session(engine):
    connection = engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection, autocommit=False, autoflush=False)()

    # Seed baseline users
    users = [
        {"username": "analyst", "role": "analyst", "pwd": "analyst123"},
        {"username": "lead", "role": "lead", "pwd": "lead123"},
        {"username": "compliance", "role": "compliance", "pwd": "compliance123"},
        {"username": "admin", "role": "admin", "pwd": "admin123"},
        {"username": "auditor", "role": "auditor", "pwd": "auditor123"},
    ]
    for u in users:
        user = User(
            id=gen_id(),
            username=u["username"],
            email=f"{u['username']}@muletrace.dev",
            password_hash=hash_password(u["pwd"]),
            role=u["role"],
            display_name=u["username"].capitalize(),
            is_active=True,
        )
        session.add(user)
    session.commit()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def gen_data(tmp_path_factory: pytest.TempPathFactory) -> dict[str, Any]:
    """Run the generator once (seed=42) and return output artefacts."""
    out = tmp_path_factory.mktemp("gendata")
    if not SCRIPT.exists():
        return {"dir": out, "txn": pd.DataFrame(), "acct": pd.DataFrame(), "gt": {}, "stdout": ""}
    result = subprocess.run(
        [
            sys.executable, str(SCRIPT),
            "--seed", "42",
            "--output-dir", str(out),
            "--config", str(CONFIG),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    txn = pd.read_csv(out / "transactions.csv")
    acct = pd.read_csv(out / "accounts.csv")
    with open(out / "ground_truth.json", encoding="utf-8") as f:
        gt = json.load(f)

    return {
        "dir": out,
        "txn": txn,
        "acct": acct,
        "gt": gt,
        "stdout": result.stdout,
    }
