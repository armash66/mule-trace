#!/usr/bin/env python3
"""
MuleTrace Demo Seeder.

Loads data/transactions.csv and data/accounts.csv into SQLite database,
executes detection pipeline, and primes the system for the live sandbox demo.

Usage::

    python scripts/seed_demo.py
"""

from __future__ import annotations

import logging
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from backend.app.db import SessionLocal, init_db
from backend.app.pipeline import run_pipeline

DATA_DIR = REPO_ROOT / "data"

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("muletrace.seed")


def seed_demo() -> None:
    logger.info("Initializing MuleTrace database...")
    init_db()

    txn_file = DATA_DIR / "transactions.csv"
    acct_file = DATA_DIR / "accounts.csv"

    if not txn_file.exists():
        logger.error("Error: data/transactions.csv not found. Run python scripts/generate_data.py first.")
        sys.exit(1)

    logger.info("Reading synthetic dataset files from data/...")
    with open(txn_file, "rb") as f:
        txn_bytes = f.read()

    acct_bytes = None
    if acct_file.exists():
        with open(acct_file, "rb") as f:
            acct_bytes = f.read()

    db = SessionLocal()
    try:
        logger.info("Running detection pipeline and priming cache...")
        res = run_pipeline(txn_bytes, acct_bytes, db)
        logger.info("✓ Demo dataset successfully seeded!")
        logger.info(f"  Run ID:        {res.run_id}")
        logger.info(f"  Transactions:  {res.txn_count:,}")
        logger.info(f"  Accounts:      {res.acct_count:,}")
        logger.info(f"  Flagged mules: {res.flagged_count:,}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()
