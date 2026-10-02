"""Tests for MuleTrace end-to-end pipeline."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.config import load_config
from backend.app.models import AccountResult, Base, Run
from backend.app.pipeline import get_neighbourhood, run_pipeline

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = REPO_ROOT / "data"
CONFIG_PATH = REPO_ROOT / "config.yaml"


@pytest.fixture
def in_memory_db():
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


def test_pipeline_runs_and_flags_rings(in_memory_db):
    """Verify that running the pipeline on synthetic data detects planted rings."""
    txn_file = DATA_DIR / "transactions.csv"
    acct_file = DATA_DIR / "accounts.csv"
    gt_file = DATA_DIR / "ground_truth.json"

    assert txn_file.exists(), "transactions.csv must exist"
    assert acct_file.exists(), "accounts.csv must exist"

    with open(txn_file, "rb") as f:
        txn_bytes = f.read()
    with open(acct_file, "rb") as f:
        acct_bytes = f.read()

    config = load_config(CONFIG_PATH)
    response = run_pipeline(txn_bytes, acct_bytes, in_memory_db, config=config)

    assert response.run_id is not None
    assert response.txn_count > 0
    assert response.acct_count > 0
    assert response.flagged_count > 0

    # Check database persistence
    run = in_memory_db.query(Run).filter(Run.id == response.run_id).first()
    assert run is not None
    assert run.flagged_count == response.flagged_count

    flagged_records = in_memory_db.query(AccountResult).filter(AccountResult.run_id == response.run_id).all()
    assert len(flagged_records) == response.flagged_count

    # Check detection of planted rings from ground_truth.json
    if gt_file.exists():
        with open(gt_file, "r", encoding="utf-8") as f:
            gt = json.load(f)

        flagged_acct_ids = {r.account_id for r in flagged_records}
        for ring in gt.get("planted_rings", []):
            pattern = ring["pattern"]
            mule_accts = set(ring["accounts"])
            detected_overlap = mule_accts.intersection(flagged_acct_ids)
            # Every planted ring should have at least one account flagged
            assert len(detected_overlap) > 0, f"Planted ring {ring['ring_id']} ({pattern}) was not detected"

    # Test ego network retrieval
    sample_acct = flagged_records[0].account_id
    network = get_neighbourhood(sample_acct, hops=1, max_nodes=20)
    assert len(network.nodes) >= 1
    assert any(n.id == sample_acct for n in network.nodes)
