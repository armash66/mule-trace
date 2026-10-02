"""Pytest fixtures for MuleTrace."""
from __future__ import annotations

import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.models import User, gen_id

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
