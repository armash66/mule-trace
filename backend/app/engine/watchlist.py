"""Known-mule watchlist matcher.

Matches accounts against the watchlist by:
- Direct account ID match
- Shared device with a known mule
- Shared KYC hash with a known mule
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.engine.graph import GraphStore
from app.models.models import WatchlistEntry

logger = logging.getLogger(__name__)

SIGNAL_TYPE = "WATCHLIST"


def match_watchlist(
    store: GraphStore,
    db: Session,
    watchlist_bonus: int = 30,
) -> list[dict[str, Any]]:
    """Match accounts against the known-mule watchlist.

    Returns WATCHLIST signal for each matched account.
    """
    results: list[dict[str, Any]] = []

    # Load active watchlist entries
    entries = db.query(WatchlistEntry).filter(WatchlistEntry.is_active == True).all()
    if not entries:
        logger.info("Watchlist matcher: no active watchlist entries")
        return []

    # Build lookup sets
    watchlist_accounts: dict[str, WatchlistEntry] = {}
    watchlist_devices: dict[str, WatchlistEntry] = {}
    watchlist_kyc: dict[str, WatchlistEntry] = {}

    for entry in entries:
        watchlist_accounts[entry.account_id] = entry
        if entry.device_id:
            watchlist_devices[entry.device_id] = entry
        if entry.kyc_hash:
            watchlist_kyc[entry.kyc_hash] = entry

    # Match against graph accounts
    for account_id, data in store.accounts.items():
        matches: list[dict[str, Any]] = []

        # Direct account match
        if account_id in watchlist_accounts:
            entry = watchlist_accounts[account_id]
            matches.append({
                "match_type": "DIRECT",
                "watchlist_source": entry.source,
                "watchlist_reason": entry.reason,
                "added_at": str(entry.added_at) if entry.added_at else None,
            })

        # Device match
        for device in data.get("devices", []):
            if device and device in watchlist_devices:
                entry = watchlist_devices[device]
                matches.append({
                    "match_type": "SHARED_DEVICE",
                    "matched_device": device,
                    "watchlist_account": entry.account_id,
                    "watchlist_source": entry.source,
                })

        # KYC hash match
        for kyc_field in ["kyc_phone_hash", "kyc_address_hash", "kyc_pan_hash"]:
            kyc_val = data.get(kyc_field)
            if kyc_val and kyc_val in watchlist_kyc:
                entry = watchlist_kyc[kyc_val]
                matches.append({
                    "match_type": "SHARED_KYC",
                    "matched_field": kyc_field,
                    "watchlist_account": entry.account_id,
                    "watchlist_source": entry.source,
                })

        if not matches:
            continue

        # Direct match is strongest
        is_direct = any(m["match_type"] == "DIRECT" for m in matches)
        score = 1.0 if is_direct else 0.6

        match_desc = matches[0]
        if is_direct:
            reason = (
                f"{account_id} is a previously confirmed mule "
                f"({match_desc.get('watchlist_source', 'unknown source')})"
            )
        else:
            reason = (
                f"{account_id} shares {match_desc['match_type'].lower().replace('_', ' ')} "
                f"with known mule {match_desc.get('watchlist_account', '')}"
            )

        results.append({
            "account_id": account_id,
            "signal_type": SIGNAL_TYPE,
            "raw_value": score,
            "evidence": {"matches": matches, "bonus": watchlist_bonus},
            "reason": reason,
        })

    logger.info(f"Watchlist matcher: {len(results)} matches")
    return results
