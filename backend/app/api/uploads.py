"""Upload and Data Intake API endpoints for MuleTrace (Phase 8b)."""

from __future__ import annotations

import io
import json
import logging
import os
import re
import time
import uuid
import zipfile
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from ..schemas import (
    ColumnMappingItem,
    FileInfo,
    SaveMappingRequest,
    UploadResponse,
    ValidationIssue,
    ValidationReport,
)
from ..core.security import Role, TokenData, require_role

logger = logging.getLogger(__name__)
router = APIRouter(tags=["uploads"])

# In-memory store for uploads with 24-hour expiration
UPLOAD_STORE: dict[str, dict[str, Any]] = {}
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB

# Field synonym lists for fuzzy mapping
TXN_SYNONYMS: dict[str, list[str]] = {
    "src_account": ["src_account", "src", "sender", "from", "payer", "debit_account", "source", "source_account", "origin_account", "sender_account", "debited_acc"],
    "dst_account": ["dst_account", "dst", "receiver", "to", "beneficiary", "credit_account", "destination", "dest_account", "target_account", "recipient", "credited_acc"],
    "timestamp": ["timestamp", "ts", "date", "datetime", "value_date", "txn_date", "trans_date", "time", "txn_timestamp", "transaction_time"],
    "amount": ["amount", "amt", "value", "txn_amount", "inr", "transfer_amount", "transaction_amount", "debit_amount", "credit_amount"],
    "txn_id": ["txn_id", "transaction_id", "ref_no", "reference", "utr", "txn_ref", "transaction_reference", "payment_id"],
    "channel": ["channel", "type", "mode", "payment_mode", "payment_channel", "method", "txn_type"],
    "device_id": ["device_id", "device", "device_hash", "hardware_id", "imei", "device_fingerprint"],
    "ip": ["ip", "ip_address", "client_ip", "remote_ip", "ip_addr", "ipaddress"],
}

ACCT_SYNONYMS: dict[str, list[str]] = {
    "account_id": ["account_id", "account", "acc_no", "acct_id", "customer_id", "account_number", "acc_id", "cust_id"],
    "opened_date": ["opened_date", "created_at", "opening_date", "open_date", "onboarding_date", "reg_date", "account_open_date"],
    "kyc_phone": ["kyc_phone", "phone", "mobile", "contact_no", "phone_number", "mobile_no"],
    "kyc_address": ["kyc_address", "address", "residential_address", "residence", "city_address"],
    "kyc_id_hash": ["kyc_id_hash", "id_hash", "pan_hash", "aadhaar_hash", "id_number", "document_hash", "national_id"],
    "balance_after": ["balance_after", "balance", "ending_balance", "closing_balance", "current_balance"],
}


def cleanup_expired_uploads() -> None:
    """Purge upload sessions older than 24 hours."""
    now = time.time()
    expired = [uid for uid, item in UPLOAD_STORE.items() if now - item.get("created_at", 0) > 86400]
    for uid in expired:
        UPLOAD_STORE.pop(uid, None)


def _safe_str(val: Any) -> str:
    if pd.isna(val):
        return ""
    return str(val)


def _match_confidence(target: str, source_cols: list[str], synonyms: dict[str, list[str]]) -> tuple[str | None, str]:
    """Find best matching source column for a target field using exact, synonym, and fuzzy similarity."""
    target_lower = target.lower()
    source_lower = [c.lower() for c in source_cols]

    # 1. Exact match
    if target_lower in source_lower:
        idx = source_lower.index(target_lower)
        return source_cols[idx], "Matched"

    # 2. Synonym match
    syns = synonyms.get(target, [])
    for syn in syns:
        if syn in source_lower:
            idx = source_lower.index(syn)
            return source_cols[idx], "Matched"

    # 3. Fuzzy match (only consider words with len >= 4 to avoid false positive short collisions)
    best_col = None
    best_score = 0.0
    for original, lower in zip(source_cols, source_lower):
        score1 = SequenceMatcher(None, target_lower, lower).ratio()
        score2 = max(
            (SequenceMatcher(None, s, lower).ratio() for s in syns if len(s) >= 4 and len(lower) >= 4),
            default=0.0
        )
        score = max(score1, score2)
        if score > best_score:
            best_score = score
            best_col = original

    if best_score >= 0.75 and best_col is not None:
        return best_col, "Matched"
    if best_score >= 0.60 and best_col is not None:
        return best_col, "Check"

    return None, "Unmapped"


def parse_dataframe_from_bytes(filename: str, content: bytes) -> pd.DataFrame:
    """Parse bytes into a pandas DataFrame supporting csv, tsv, xlsx, json/ndjson."""
    ext = os.path.splitext(filename)[1].lower()
    bio = io.BytesIO(content)

    if ext == ".tsv":
        return pd.read_csv(bio, sep="\t", dtype=str)
    if ext == ".xlsx":
        return pd.read_excel(bio, dtype=str, engine="openpyxl")
    if ext == ".json":
        try:
            bio.seek(0)
            data = json.loads(content.decode("utf-8", errors="replace"))
            if isinstance(data, list):
                return pd.DataFrame(data).astype(str)
            if isinstance(data, dict):
                for k in ["transactions", "accounts", "records", "data", "items"]:
                    if k in data and isinstance(data[k], list):
                        return pd.DataFrame(data[k]).astype(str)
                return pd.DataFrame([data]).astype(str)
        except Exception:
            bio.seek(0)
            return pd.read_json(bio, lines=True, dtype=str)
    bio.seek(0)
    try:
        return pd.read_csv(bio, dtype=str)
    except Exception:
        bio.seek(0)
        return pd.read_csv(bio, sep=";", dtype=str)


def detect_file_typology(df: pd.DataFrame) -> str:
    """Detect if DataFrame represents transactions vs accounts based on column signatures."""
    cols = [c.lower() for c in df.columns]

    txn_score = sum(1 for target, syns in TXN_SYNONYMS.items() if any(s in cols for s in syns))
    acct_score = sum(1 for target, syns in ACCT_SYNONYMS.items() if any(s in cols for s in syns))

    has_src_dst = (
        any("src" in c or "sender" in c or "from" in c for c in cols) and
        any("dst" in c or "receiver" in c or "to" in c for c in cols)
    )
    has_opened_date = any("opened" in c or "open_date" in c or "kyc" in c for c in cols)

    if has_src_dst or txn_score > acct_score:
        return "transactions"
    if has_opened_date or acct_score > txn_score:
        return "accounts"
    return "ambiguous"


@router.post("/uploads", response_model=UploadResponse)
async def upload_files(files: list[UploadFile] = File(...), user: TokenData = Depends(require_role(Role.ANALYST))) -> UploadResponse:
    """Accept multi-file upload (.csv, .tsv, .xlsx, .json, .zip), extract, auto-classify, and suggest mappings."""
    cleanup_expired_uploads()

    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    upload_id = str(uuid.uuid4())
    parsed_files: dict[str, pd.DataFrame] = {}
    file_infos: list[FileInfo] = []

    for file in files:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File '{file.filename}' exceeds the maximum allowed size of 100 MB."
            )

        filename = file.filename or "uploaded_file.csv"
        ext = os.path.splitext(filename)[1].lower()

        if ext == ".zip":
            try:
                with zipfile.ZipFile(io.BytesIO(content)) as z:
                    for zip_info in z.infolist():
                        if zip_info.is_dir():
                            continue
                        norm_name = os.path.normpath(zip_info.filename)
                        if norm_name.startswith("..") or os.path.isabs(norm_name):
                            logger.warning("Rejected unsafe zip path: %s", zip_info.filename)
                            continue

                        base_name = os.path.basename(norm_name)
                        zip_content = z.read(zip_info)
                        if len(zip_content) > MAX_FILE_SIZE_BYTES:
                            continue

                        df = parse_dataframe_from_bytes(base_name, zip_content)
                        parsed_files[base_name] = df
            except Exception as e:
                logger.error("Failed to parse zip archive: %s", e)
                raise HTTPException(status_code=400, detail=f"Invalid or corrupted zip archive: {e}") from e
        else:
            try:
                df = parse_dataframe_from_bytes(filename, content)
                parsed_files[filename] = df
            except Exception as e:
                logger.error("Failed to parse file '%s': %s", filename, e)
                raise HTTPException(status_code=400, detail=f"Could not parse file '{filename}': {e}") from e

    if not parsed_files:
        raise HTTPException(status_code=400, detail="No valid data files found in upload.")

    classified_files: dict[str, str] = {}
    txn_df: pd.DataFrame | None = None
    acct_df: pd.DataFrame | None = None
    txn_file_name: str | None = None
    acct_file_name: str | None = None

    for fname, df in parsed_files.items():
        typology = detect_file_typology(df)
        classified_files[fname] = typology
        cols = list(df.columns)

        file_infos.append(
            FileInfo(
                filename=fname,
                size_bytes=len(df.to_csv(index=False).encode("utf-8")),
                detected_type=typology if typology in ["transactions", "accounts"] else "ambiguous",
                row_count=len(df),
                columns=cols,
            )
        )

        if typology == "transactions" and txn_df is None:
            txn_df = df
            txn_file_name = fname
        elif typology == "accounts" and acct_df is None:
            acct_df = df
            acct_file_name = fname

    if txn_df is None and parsed_files:
        largest_fname = max(parsed_files.keys(), key=lambda k: len(parsed_files[k]))
        txn_df = parsed_files[largest_fname]
        txn_file_name = largest_fname
        classified_files[largest_fname] = "transactions"

    suggested_mappings: dict[str, dict[str, ColumnMappingItem]] = {"transactions": {}, "accounts": {}}

    if txn_df is not None:
        source_cols = list(txn_df.columns)
        used_cols: set[str] = set()
        priority_txn_targets = ["src_account", "dst_account", "amount", "timestamp", "txn_id", "channel", "device_id", "ip"]
        for target in priority_txn_targets:
            available = [c for c in source_cols if c not in used_cols]
            matched_col, conf = _match_confidence(target, available, TXN_SYNONYMS)
            sample_vals = []
            if matched_col and matched_col in txn_df.columns:
                used_cols.add(matched_col)
                sample_vals = [_safe_str(x) for x in txn_df[matched_col].dropna().head(3).tolist()]
            suggested_mappings["transactions"][target] = ColumnMappingItem(
                source_column=matched_col,
                confidence=conf,  # type: ignore[arg-type]
                sample_values=sample_vals,
            )

    if acct_df is not None:
        source_cols = list(acct_df.columns)
        used_acct_cols: set[str] = set()
        priority_acct_targets = ["account_id", "opened_date", "kyc_phone", "kyc_address", "kyc_id_hash", "balance_after"]
        for target in priority_acct_targets:
            available = [c for c in source_cols if c not in used_acct_cols]
            matched_col, conf = _match_confidence(target, available, ACCT_SYNONYMS)
            sample_vals = []
            if matched_col and matched_col in acct_df.columns:
                used_acct_cols.add(matched_col)
                sample_vals = [_safe_str(x) for x in acct_df[matched_col].dropna().head(3).tolist()]
            suggested_mappings["accounts"][target] = ColumnMappingItem(
                source_column=matched_col,
                confidence=conf,  # type: ignore[arg-type]
                sample_values=sample_vals,
            )

    preview: dict[str, list[dict[str, Any]]] = {
        "transactions": txn_df.head(20).to_dict(orient="records") if txn_df is not None else [],
        "accounts": acct_df.head(20).to_dict(orient="records") if acct_df is not None else [],
    }

    has_accounts = acct_df is not None
    reduced_mode_note = (
        None if has_accounts
        else "No accounts file provided. Cluster and dormancy detectors will run in reduced mode using transaction activity."
    )

    UPLOAD_STORE[upload_id] = {
        "created_at": time.time(),
        "parsed_files": parsed_files,
        "txn_df": txn_df,
        "acct_df": acct_df,
        "txn_file_name": txn_file_name,
        "acct_file_name": acct_file_name,
        "mapping": {
            "transactions": {k: v.source_column for k, v in suggested_mappings["transactions"].items()},
            "accounts": {k: v.source_column for k, v in suggested_mappings["accounts"].items()} if acct_df is not None else {},
        },
        "timezone": "Asia/Kolkata",
        "date_format": None,
        "rejects_df": pd.DataFrame(),
        "validated_report": None,
    }

    return UploadResponse(
        upload_id=upload_id,
        files=file_infos,
        detected_file_types=classified_files,
        suggested_mapping=suggested_mappings,
        preview=preview,
        has_accounts=has_accounts,
        reduced_mode_note=reduced_mode_note,
    )


@router.put("/uploads/{upload_id}/mapping")
def save_mapping(upload_id: str, req: SaveMappingRequest, user: TokenData = Depends(require_role(Role.ANALYST))) -> dict[str, Any]:
    """Save user-confirmed column mapping, date format, and timezone."""
    upload = UPLOAD_STORE.get(upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload session not found or expired.")

    raw_tx = req.transactions_mapping if req.transactions_mapping is not None else (req.transactions or {})
    raw_acct = req.accounts_mapping if req.accounts_mapping is not None else req.accounts

    clean_tx: dict[str, str | None] = {}
    for k, v in raw_tx.items():
        if isinstance(v, dict):
            clean_tx[k] = v.get("source_column")
        elif hasattr(v, "source_column"):
            clean_tx[k] = v.source_column
        else:
            clean_tx[k] = v

    upload["mapping"]["transactions"] = clean_tx
    if raw_acct is not None:
        clean_acct: dict[str, str | None] = {}
        for k, v in raw_acct.items():
            if isinstance(v, dict):
                clean_acct[k] = v.get("source_column")
            elif hasattr(v, "source_column"):
                clean_acct[k] = v.source_column
            else:
                clean_acct[k] = v
        upload["mapping"]["accounts"] = clean_acct

    upload["timezone"] = req.timezone or "Asia/Kolkata"
    upload["date_format"] = req.date_format

    return {"status": "ok", "message": "Column mapping saved successfully."}



def _clean_amount_val(val: Any) -> float | None:
    """Parse and clean financial amount supporting currency symbols, commas, and Indian lakh (L) notation."""
    if pd.isna(val) or val is None:
        return None
    s = str(val).strip()
    if not s:
        return None

    lakh_match = re.search(r"([\d\.,]+)\s*(?:l|lakh|lakhs)", s, re.IGNORECASE)
    if lakh_match:
        try:
            num_str = lakh_match.group(1).replace(",", "")
            return float(num_str) * 100000.0
        except ValueError:
            pass

    cleaned = re.sub(r"[₹\$,\s]|Rs\.?|INR", "", s)
    try:
        return float(cleaned)
    except ValueError:
        return None


@router.post("/uploads/{upload_id}/validate", response_model=ValidationReport)
def validate_upload(upload_id: str, user: TokenData = Depends(require_role(Role.ANALYST))) -> ValidationReport:
    """Apply mapping, validate transactions and accounts, compute data-health report and rejected rows."""
    upload = UPLOAD_STORE.get(upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload session not found or expired.")

    txn_raw = upload.get("txn_df")
    if txn_raw is None or txn_raw.empty:
        raise HTTPException(status_code=400, detail="Transactions dataset is missing or empty.")

    txn_mapping = upload.get("mapping", {}).get("transactions", {})
    tz_str = upload.get("timezone", "Asia/Kolkata")
    user_date_fmt = upload.get("date_format")

    issues: list[ValidationIssue] = []
    cell_issues: list[dict[str, Any]] = []
    rejected_rows: list[dict[str, Any]] = []

    # Verify required transactions fields: src_account, dst_account, timestamp, amount
    required_fields = ["src_account", "dst_account", "timestamp", "amount"]
    missing_required = [f for f in required_fields if not txn_mapping.get(f)]
    if missing_required:
        for f in missing_required:
            issues.append(
                ValidationIssue(
                    severity="error",
                    field=f,
                    message=f"Required field '{f}' is not mapped.",
                    effect="Detection pipeline cannot execute without core transaction source, destination, time, and amount.",
                )
            )
        return ValidationReport(
            upload_id=upload_id,
            total_rows=len(txn_raw),
            date_range={"start": "N/A", "end": "N/A"},
            unique_accounts=0,
            duplicates_removed=0,
            out_of_order_fixed=0,
            self_transfers_dropped=0,
            missing_device_pct=0.0,
            missing_ip_pct=0.0,
            amount_stats={"min": 0.0, "median": 0.0, "max": 0.0},
            rejected_rows_count=0,
            issues=issues,
            preview_rows=[],
            cell_issues=[],
            can_proceed=False,
        )

    # Build clean target DataFrame directly
    df = pd.DataFrame(index=txn_raw.index)
    for target, src in txn_mapping.items():
        if src and src in txn_raw.columns:
            df[target] = txn_raw[src].copy()

    # 1. Parse and validate amount
    raw_amounts = df["amount"]
    cleaned_amounts = raw_amounts.apply(_clean_amount_val)
    invalid_amt_mask = cleaned_amounts.isna() | (cleaned_amounts <= 0)
    invalid_amt_count = int(invalid_amt_mask.sum())

    if invalid_amt_count > 0:
        issues.append(
            ValidationIssue(
                severity="warn",
                field="amount",
                message=f"{invalid_amt_count} rows have unparseable or non-positive amount values.",
                effect="These rows will be rejected from detection and saved to rejects.csv.",
            )
        )
        for idx in df[invalid_amt_mask].index:
            r = df.loc[idx].to_dict()
            r["rejection_reason"] = "Invalid amount"
            rejected_rows.append(r)
            cell_issues.append({"row": int(idx), "col": "amount", "issue": "Unparseable amount"})

    valid_mask = ~invalid_amt_mask
    df = df[valid_mask].copy()
    df["amount"] = cleaned_amounts[valid_mask].astype(float)

    # 2. Parse and validate timestamps with timezone conversion
    parsed_timestamps = []
    invalid_ts_indices = []

    for idx, ts in df["timestamp"].items():
        try:
            if user_date_fmt:
                dt = pd.to_datetime(ts, format=user_date_fmt)
            else:
                dt = pd.to_datetime(ts, format="mixed")
            if dt.tzinfo is None:
                dt = dt.tz_localize(tz_str)
            utc_dt = dt.tz_convert("UTC")
            parsed_timestamps.append(utc_dt)
        except Exception:
            invalid_ts_indices.append(idx)
            cell_issues.append({"row": int(idx), "col": "timestamp", "issue": "Unparseable timestamp"})

    if invalid_ts_indices:
        issues.append(
            ValidationIssue(
                severity="warn",
                field="timestamp",
                message=f"{len(invalid_ts_indices)} rows have unparseable timestamp values.",
                effect="These rows cannot be time-windowed and will be rejected.",
            )
        )
        for idx in invalid_ts_indices:
            r = df.loc[idx].to_dict()
            r["rejection_reason"] = "Unparseable timestamp"
            rejected_rows.append(r)

        valid_ts_mask = ~df.index.isin(invalid_ts_indices)
        df = df[valid_ts_mask].copy()
        df["timestamp"] = [dt for i, dt in enumerate(parsed_timestamps) if df.index.isin(valid_ts_mask)[i] if i < len(parsed_timestamps)]
    else:
        df["timestamp"] = parsed_timestamps

    # 3. Check and drop self-transfers (src == dst)
    self_mask = df["src_account"] == df["dst_account"]
    self_count = int(self_mask.sum())
    if self_count > 0:
        issues.append(
            ValidationIssue(
                severity="info",
                field="src_account",
                message=f"{self_count} self-transfers (source == destination) were dropped.",
                effect="Self-transfers do not indicate multi-account money laundering.",
            )
        )
        df = df[~self_mask].copy()

    # 4. Check and remove duplicates on txn_id if present
    dup_count = 0
    if "txn_id" in df.columns:
        dups = df.duplicated(subset=["txn_id"], keep="first")
        dup_count = int(dups.sum())
        if dup_count > 0:
            issues.append(
                ValidationIssue(
                    severity="info",
                    field="txn_id",
                    message=f"{dup_count} duplicate rows were removed.",
                    effect="Deduplicated to prevent artificial flow amplification.",
                )
            )
            df = df[~dups].copy()
    else:
        df["txn_id"] = [
            f"TXN_GEN_{hash((r.src_account, r.dst_account, str(r.timestamp), r.amount)) & 0xFFFFFFFF:08x}"
            for r in df.itertuples()
        ]
        issues.append(
            ValidationIssue(
                severity="info",
                field="txn_id",
                message="Missing transaction reference IDs were deterministically generated.",
                effect="All transfers receive tracking hashes.",
            )
        )

    # 5. Fix out-of-order timestamps
    out_of_order_count = 0
    if not df.empty:
        is_sorted = df["timestamp"].is_monotonic_increasing
        if not is_sorted:
            df.sort_values(by="timestamp", inplace=True)
            out_of_order_count = len(df)
            issues.append(
                ValidationIssue(
                    severity="info",
                    field="timestamp",
                    message="Timestamps were re-ordered chronologically.",
                    effect="Strict time-ordering is required for rolling window graph detectors.",
                )
            )

    # 6. Missing device ID / IP %
    missing_dev_pct = float(df["device_id"].isna().mean() * 100) if "device_id" in df.columns else 100.0
    missing_ip_pct = float(df["ip"].isna().mean() * 100) if "ip" in df.columns else 100.0

    if missing_dev_pct > 20.0 or missing_ip_pct > 20.0:
        issues.append(
            ValidationIssue(
                severity="warn",
                field="device_id",
                message=f"Missing hardware device ID ({missing_dev_pct:.1f}%) or IP ({missing_ip_pct:.1f}%).",
                effect="Identity cluster detector will operate with reduced coverage.",
            )
        )

    total_valid = len(df)
    unique_accts = len(set(df["src_account"]).union(set(df["dst_account"]))) if total_valid > 0 else 0
    date_min = df["timestamp"].min().isoformat() if total_valid > 0 else "N/A"
    date_max = df["timestamp"].max().isoformat() if total_valid > 0 else "N/A"

    amt_series = pd.to_numeric(df["amount"], errors="coerce")
    amount_stats = {
        "min": float(amt_series.min()) if total_valid > 0 else 0.0,
        "median": float(amt_series.median()) if total_valid > 0 else 0.0,
        "max": float(amt_series.max()) if total_valid > 0 else 0.0,
    }

    upload["clean_txn_df"] = df
    upload["rejects_df"] = pd.DataFrame(rejected_rows)

    preview_rows = df.head(20).to_dict(orient="records")
    for r in preview_rows:
        if isinstance(r.get("timestamp"), (pd.Timestamp, datetime)):
            r["timestamp"] = r["timestamp"].isoformat()

    has_blocking_errors = any(i.severity == "error" for i in issues)

    report = ValidationReport(
        upload_id=upload_id,
        total_rows=total_valid,
        date_range={"start": str(date_min), "end": str(date_max)},
        unique_accounts=unique_accts,
        duplicates_removed=dup_count,
        out_of_order_fixed=out_of_order_count,
        self_transfers_dropped=self_count,
        missing_device_pct=round(missing_dev_pct, 1),
        missing_ip_pct=round(missing_ip_pct, 1),
        amount_stats=amount_stats,
        rejected_rows_count=len(rejected_rows),
        issues=issues,
        preview_rows=preview_rows,
        cell_issues=cell_issues[:50],
        can_proceed=not has_blocking_errors and total_valid > 0,
    )
    upload["validated_report"] = report
    return report


@router.get("/uploads/{upload_id}/rejects.csv")
def download_rejects(upload_id: str) -> StreamingResponse:
    """Download CSV of rejected rows with specific rejection reasons."""
    upload = UPLOAD_STORE.get(upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload session not found or expired.")

    rejects_df = upload.get("rejects_df", pd.DataFrame())
    out = io.StringIO()
    if not rejects_df.empty:
        rejects_df.to_csv(out, index=False)
    else:
        out.write("row,rejection_reason\n")
    out.seek(0)

    return StreamingResponse(
        iter([out.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="rejects_{upload_id[:8]}.csv"'},
    )


@router.get("/templates/transactions.csv")
def download_transactions_template() -> StreamingResponse:
    """Provide downloadable transactions.csv template with 3 realistic rows and column notes."""
    template_content = (
        "# MuleTrace transactions.csv template\n"
        "# Columns: txn_id (optional), timestamp (ISO8601 or local IST), src_account, dst_account, amount (INR), channel, device_id, ip\n"
        "txn_id,timestamp,src_account,dst_account,amount,channel,device_id,ip\n"
        "TXN_1001,2026-10-01T10:14:00Z,ACC_01094,ACC_05001,45000,UPI,DEV_9912,103.21.24.11\n"
        "TXN_1002,2026-10-01T10:16:30Z,ACC_01429,ACC_05001,38500,IMPS,DEV_8821,103.21.24.19\n"
        "TXN_1003,2026-10-01T10:28:00Z,ACC_05001,ACC_05002,72000,UPI,DEV_MULE_99,49.204.11.2\n"
    )
    return StreamingResponse(
        iter([template_content]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="transactions_template.csv"'},
    )


@router.get("/templates/accounts.csv")
def download_accounts_template() -> StreamingResponse:
    """Provide downloadable accounts.csv template with 3 realistic rows and column notes."""
    template_content = (
        "# MuleTrace accounts.csv template (Optional but recommended for identity clusters)\n"
        "# Columns: account_id, opened_date, kyc_phone, kyc_address, kyc_id_hash, balance_after\n"
        "account_id,opened_date,kyc_phone,kyc_address,kyc_id_hash,balance_after\n"
        "ACC_05001,2026-09-08,+91 9876543210,Flat 402 Andheri West Mumbai,hash_a8721bf4,24469.49\n"
        "ACC_05002,2026-09-15,+91 9811223344,Plot 12 Sector 15 Noida,hash_b3198cf9,1200.00\n"
        "ACC_01094,2024-03-11,+91 9900112233,Door 24 T Nagar Chennai,hash_c11029da,150000.00\n"
    )
    return StreamingResponse(
        iter([template_content]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="accounts_template.csv"'},
    )
