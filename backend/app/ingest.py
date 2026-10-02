"""CSV ingestion: validate, dedupe, normalise timestamps, drop bad rows.

Pure functions — no DB or network I/O.
"""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

REQUIRED_TXN_COLS = {
    "txn_id", "timestamp", "src_account", "dst_account",
    "amount", "channel",
}

REQUIRED_ACCT_COLS = {
    "account_id", "opened_date",
}


@dataclass
class IngestStats:
    """Counters collected during ingestion."""

    raw_txn_count: int = 0
    raw_acct_count: int = 0
    dropped_duplicates: int = 0
    dropped_self_transfers: int = 0
    dropped_bad_rows: int = 0
    final_txn_count: int = 0
    final_acct_count: int = 0
    errors: list[dict[str, Any]] = field(default_factory=list)


def _validate_columns(df: pd.DataFrame, required: set[str], label: str) -> None:
    """Raise if required columns are missing."""
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"{label} missing columns: {sorted(missing)}")


def ingest_transactions(raw: bytes | str | pd.DataFrame) -> tuple[pd.DataFrame, IngestStats]:
    """Clean a transaction CSV.

    Steps:
        1. Read CSV
        2. Validate required columns
        3. Parse & normalise timestamps to UTC
        4. Deduplicate on txn_id (keep first)
        5. Drop self-transfers (src == dst)
        6. Drop rows with invalid amounts
        7. Sort by timestamp

    Returns:
        (cleaned DataFrame, stats)
    """
    stats = IngestStats()

    # Read
    if isinstance(raw, pd.DataFrame):
        df = raw.copy()
    else:
        buf = io.BytesIO(raw) if isinstance(raw, bytes) else io.StringIO(raw)
        df = pd.read_csv(buf)

    stats.raw_txn_count = len(df)
    _validate_columns(df, REQUIRED_TXN_COLS, "transactions.csv")

    # Parse timestamps → UTC
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
    bad_ts = df["timestamp"].isna()
    if bad_ts.any():
        n = int(bad_ts.sum())
        stats.dropped_bad_rows += n
        stats.errors.append({"type": "bad_timestamp", "count": n})
        df = df[~bad_ts]

    # Validate amounts
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    bad_amt = df["amount"].isna() | (df["amount"] <= 0)
    if bad_amt.any():
        n = int(bad_amt.sum())
        stats.dropped_bad_rows += n
        stats.errors.append({"type": "bad_amount", "count": n})
        df = df[~bad_amt]

    # Deduplicate on txn_id (keep first occurrence)
    before = len(df)
    df = df.drop_duplicates(subset=["txn_id"], keep="first")
    stats.dropped_duplicates = before - len(df)

    # Drop self-transfers
    self_mask = df["src_account"] == df["dst_account"]
    stats.dropped_self_transfers = int(self_mask.sum())
    if stats.dropped_self_transfers:
        logger.info("Dropped %d self-transfer(s)", stats.dropped_self_transfers)
    df = df[~self_mask]

    # Sort by time
    df = df.sort_values("timestamp").reset_index(drop=True)

    stats.final_txn_count = len(df)
    return df, stats


def ingest_accounts(raw: bytes | str | pd.DataFrame) -> tuple[pd.DataFrame, IngestStats]:
    """Clean an accounts CSV.

    Returns:
        (cleaned DataFrame, stats)
    """
    stats = IngestStats()

    if isinstance(raw, pd.DataFrame):
        df = raw.copy()
    else:
        buf = io.BytesIO(raw) if isinstance(raw, bytes) else io.StringIO(raw)
        df = pd.read_csv(buf)

    stats.raw_acct_count = len(df)
    _validate_columns(df, REQUIRED_ACCT_COLS, "accounts.csv")

    # Parse opened_date
    df["opened_date"] = pd.to_datetime(df["opened_date"], errors="coerce")
    bad = df["opened_date"].isna()
    if bad.any():
        n = int(bad.sum())
        stats.dropped_bad_rows += n
        df = df[~bad]

    # Deduplicate on account_id
    before = len(df)
    df = df.drop_duplicates(subset=["account_id"], keep="first")
    stats.dropped_duplicates = before - len(df)

    stats.final_acct_count = len(df)
    return df, stats
