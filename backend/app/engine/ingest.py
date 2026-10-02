"""CSV ingest: parse, validate, clean, deduplicate."""
from __future__ import annotations

import io
import logging
from datetime import datetime, timezone
from typing import Any

import numpy as np
import pandas as pd

from app.core.config import get_settings
from app.core.errors import InvalidCSVError
from app.schemas.schemas import DataQuality

logger = logging.getLogger(__name__)

# Common header aliases → canonical names
COLUMN_ALIASES: dict[str, list[str]] = {
    "txn_id": ["txn_id", "transaction_id", "tx_id", "id", "ref"],
    "timestamp": ["timestamp", "ts", "date", "datetime", "txn_time", "time"],
    "sender_account": ["sender_account", "sender", "from_account", "from", "debit_account", "source"],
    "receiver_account": ["receiver_account", "receiver", "to_account", "to", "credit_account", "target"],
    "amount": ["amount", "value", "amt", "txn_amount"],
    "currency": ["currency", "ccy"],
    "channel": ["channel", "mode", "payment_mode", "type"],
    "sender_balance_after": ["sender_balance_after", "sender_balance", "balance_after_debit"],
    "receiver_balance_after": ["receiver_balance_after", "receiver_balance", "balance_after_credit"],
    "device_id": ["device_id", "device", "device_fingerprint"],
    "ip_address": ["ip_address", "ip", "source_ip"],
    "is_victim_report": ["is_victim_report", "victim", "fraud_report", "reported"],
}

REQUIRED_COLUMNS = ["txn_id", "timestamp", "sender_account", "receiver_account", "amount"]
VALID_CHANNELS = {"UPI", "IMPS", "NEFT", "RTGS", "CARD", "WALLET", "ATM", "MERCHANT"}


def auto_map_columns(df: pd.DataFrame) -> dict[str, str]:
    """Auto-detect column mappings from CSV headers."""
    mapping: dict[str, str] = {}
    lower_cols = {c.lower().strip().replace(" ", "_"): c for c in df.columns}

    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias.lower() in lower_cols:
                mapping[canonical] = lower_cols[alias.lower()]
                break

    return mapping


def parse_csv(file_content: bytes, filename: str = "upload.csv") -> tuple[pd.DataFrame, DataQuality]:
    """Parse and validate a transactions CSV.
    
    Returns cleaned DataFrame and data quality report.
    Handles: BOM, encoding, quoting, whitespace, deduplication, type coercion.
    """
    quality = DataQuality()
    warnings: list[str] = []

    # Try parsing with different encodings
    for encoding in ["utf-8-sig", "utf-8", "latin-1"]:
        try:
            df = pd.read_csv(
                io.BytesIO(file_content),
                encoding=encoding,
                dtype=str,
                skipinitialspace=True,
                on_bad_lines="warn",
            )
            break
        except Exception:
            continue
    else:
        raise InvalidCSVError("Could not parse CSV. Check encoding (UTF-8 expected).")

    if df.empty:
        raise InvalidCSVError("CSV file is empty.")

    quality.total_rows = len(df)

    # Strip whitespace from headers and values
    df.columns = df.columns.str.strip()
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].str.strip()

    # Auto-map columns
    col_map = auto_map_columns(df)

    # Validate required columns
    missing = [c for c in REQUIRED_COLUMNS if c not in col_map]
    if missing:
        raise InvalidCSVError(
            f"Missing required columns: {', '.join(missing)}. "
            f"Found: {', '.join(df.columns.tolist())}. "
            f"Expected: txn_id, timestamp, sender_account, receiver_account, amount"
        )

    # Rename to canonical
    rename_map = {v: k for k, v in col_map.items()}
    df = df.rename(columns=rename_map)

    # ── Deduplicate by txn_id ──
    dupes = df.duplicated(subset=["txn_id"], keep="first")
    quality.duplicate_rows = int(dupes.sum())
    if quality.duplicate_rows > 0:
        warnings.append(f"Dropped {quality.duplicate_rows} duplicate transactions")
    df = df[~dupes].copy()

    # ── Parse timestamps ──
    bad_ts_mask = pd.Series(False, index=df.index)
    for fmt in [None, "%d/%m/%Y %H:%M", "%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%m/%d/%Y %H:%M"]:
        try:
            parsed = pd.to_datetime(df["timestamp"], format=fmt, errors="coerce", utc=True)
            newly_parsed = parsed.notna() & bad_ts_mask.eq(False)
            if newly_parsed.any():
                df.loc[newly_parsed, "timestamp"] = parsed[newly_parsed]
                break
        except Exception:
            continue

    # Ensure timestamp is datetime
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    bad_ts = df["timestamp"].isna()
    quality.bad_timestamps = int(bad_ts.sum())
    if quality.bad_timestamps > 0:
        warnings.append(f"{quality.bad_timestamps} rows with unparseable timestamps dropped")
    
    # Remove future timestamps
    now = pd.Timestamp.now(tz=timezone.utc)
    future = df["timestamp"] > now
    if future.any():
        warnings.append(f"{future.sum()} future-dated transactions dropped")
        bad_ts = bad_ts | future

    df = df[~bad_ts].copy()

    # ── Parse amounts ──
    df["amount"] = pd.to_numeric(df["amount"].str.replace(",", ""), errors="coerce")
    bad_amt = df["amount"].isna() | (df["amount"] <= 0)
    quality.invalid_rows += int(bad_amt.sum())
    if bad_amt.any():
        warnings.append(f"{bad_amt.sum()} rows with invalid amounts dropped")
    df = df[~bad_amt].copy()

    # ── Remove self-transfers ──
    self_transfer = df["sender_account"] == df["receiver_account"]
    if self_transfer.any():
        warnings.append(f"{self_transfer.sum()} self-transfers dropped")
        df = df[~self_transfer].copy()

    # ── Remove null accounts ──
    null_acct = df["sender_account"].isna() | df["receiver_account"].isna()
    if null_acct.any():
        warnings.append(f"{null_acct.sum()} rows with null accounts dropped")
        df = df[~null_acct].copy()

    # ── Normalize account IDs (case + whitespace) ──
    df["sender_account"] = df["sender_account"].str.upper().str.strip()
    df["receiver_account"] = df["receiver_account"].str.upper().str.strip()

    # ── Parse optional numeric columns ──
    for col in ["sender_balance_after", "receiver_balance_after"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        else:
            df[col] = np.nan

    # ── Check balance availability ──
    quality.has_balances = df["sender_balance_after"].notna().any() or df["receiver_balance_after"].notna().any()
    quality.missing_balances = int(df["sender_balance_after"].isna().sum())
    if not quality.has_balances:
        warnings.append("No balance data found — pass-through detection will use estimated retention")

    # ── Check device/IP availability ──
    has_device = "device_id" in df.columns and df["device_id"].notna().any()
    has_ip = "ip_address" in df.columns and df["ip_address"].notna().any()
    quality.has_device_ip = has_device or has_ip
    quality.missing_device_ip = 0
    if not quality.has_device_ip:
        warnings.append("No device/IP data found — cluster detector will not be evaluated")
    else:
        quality.missing_device_ip = int(
            (df.get("device_id", pd.Series(dtype=str)).isna() & df.get("ip_address", pd.Series(dtype=str)).isna()).sum()
        )

    # ── Parse boolean columns ──
    if "is_victim_report" in df.columns:
        df["is_victim_report"] = df["is_victim_report"].map(
            {"true": True, "1": True, "yes": True, "false": False, "0": False, "no": False}
        ).fillna(False).astype(bool)
    else:
        df["is_victim_report"] = False

    # ── Channel normalization ──
    if "channel" in df.columns:
        df["channel"] = df["channel"].str.upper()
    else:
        df["channel"] = None

    # ── Currency default ──
    if "currency" not in df.columns:
        df["currency"] = get_settings().default_currency

    # ── Sort by timestamp (deterministic on ties) ──
    df = df.sort_values(["timestamp", "txn_id"]).reset_index(drop=True)

    quality.valid_rows = len(df)
    quality.warnings = warnings

    logger.info(
        f"Parsed {filename}: {quality.total_rows} rows → {quality.valid_rows} valid "
        f"({quality.duplicate_rows} dupes, {quality.invalid_rows} invalid, {quality.bad_timestamps} bad timestamps)"
    )

    return df, quality
