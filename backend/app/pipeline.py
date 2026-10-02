"""Pipeline orchestrator for MuleTrace.

Coordinates:
  1. Ingestion & data cleaning (ingest.py)
  2. Graph construction (graph.py)
  3. Pattern detectors (fan, cycle, chain, cluster)
  4. Feature extraction (features.py)
  5. Anomaly & rule scoring (scoring.py)
  6. Plain-language reason generation (reasons.py)
  7. Database persistence (models.py)
"""

from __future__ import annotations

import logging
from typing import Any
import pandas as pd
from sqlalchemy.orm import Session

from .config import load_config
from .detectors.chain import detect_chains
from .detectors.cluster import detect_clusters
from .detectors.cycle import detect_cycles
from .detectors.fan import detect_fan
from .features import extract_features
from .graph import build_graph, get_ego_network
from .ingest import ingest_accounts, ingest_transactions
from .models import AccountResult, AuditLog, Run
from .reasons import generate_reasons
from .schemas import Finding, IngestResponse, NetworkEdge, NetworkNode, NetworkResponse, ScoredAccount
from .scoring import score_accounts

logger = logging.getLogger(__name__)


class PipelineState:
    """In-memory cache for fast graph queries and active run data."""

    def __init__(self) -> None:
        self.active_run_id: str | None = None
        self.graph: Any = None
        self.accounts_df: pd.DataFrame | None = None
        self.transactions_df: pd.DataFrame | None = None
        self.scored_accounts: dict[str, ScoredAccount] = {}
        self.features: dict[str, dict[str, float]] = {}


pipeline_state = PipelineState()


def run_pipeline(
    txn_data: bytes | str | pd.DataFrame,
    acct_data: bytes | str | pd.DataFrame | None,
    db: Session,
    config: dict[str, Any] | None = None,
) -> IngestResponse:
    """Execute the full end-to-end detection pipeline and save results to DB."""
    if config is None:
        config = load_config()

    # 1. Clean transactions
    txn_df, txn_stats = ingest_transactions(txn_data)

    # 2. Clean or derive accounts
    if acct_data is not None:
        acct_df, acct_stats = ingest_accounts(acct_data)
    else:
        # Synthesize minimal account DataFrame from transaction accounts
        all_accts = sorted(set(txn_df["src_account"]).union(set(txn_df["dst_account"])))
        min_time = txn_df["timestamp"].min() if not txn_df.empty else pd.Timestamp.now(tz="UTC")
        acct_df = pd.DataFrame({
            "account_id": all_accts,
            "opened_date": [min_time - pd.Timedelta(days=180)] * len(all_accts),
        })
        acct_stats = ingest_accounts(acct_df)[1]

    # 3. Build graph
    G = build_graph(txn_df, acct_df)

    # 4. Run detectors
    findings: list[Finding] = []
    fan_findings = detect_fan(G, acct_df, config)
    findings.extend(fan_findings)

    cycle_findings = detect_cycles(G, acct_df, config)
    findings.extend(cycle_findings)

    chain_findings = detect_chains(G, acct_df, config)
    findings.extend(chain_findings)

    cluster_findings = detect_clusters(G, acct_df, config)
    findings.extend(cluster_findings)

    # 5. Extract features
    features = extract_features(G, acct_df)

    # 6. Score accounts
    scored = score_accounts(findings, features, config)

    # 7. Generate plain-language reasons
    for aid, acct in scored.items():
        if acct.findings:
            acct.reasons = generate_reasons(acct.findings)

    # 8. Persist to DB
    flag_threshold = config.get("scoring", {}).get("flag_threshold", 50)
    flagged = [a for a in scored.values() if a.risk_score >= flag_threshold or len(a.patterns) > 0]

    run_record = Run(
        txn_count=len(txn_df),
        acct_count=len(acct_df),
        flagged_count=len(flagged),
    )
    db.add(run_record)
    db.flush()

    run_id = str(run_record.id)

    # Save account results to DB
    for aid, acct in scored.items():
        # Store all flagged/scored accounts or accounts with patterns
        if acct.risk_score >= flag_threshold or len(acct.patterns) > 0:
            res = AccountResult(
                run_id=run_id,
                account_id=aid,
                risk_score=acct.risk_score,
                patterns=acct.patterns,
                reasons=acct.reasons,
                findings=[f.model_dump() for f in acct.findings],
                features=features.get(aid, {}),
            )
            db.add(res)

    audit = AuditLog(
        action="PIPELINE_RUN",
        entity_type="RUN",
        entity_id=run_id,
        details={
            "txn_count": len(txn_df),
            "acct_count": len(acct_df),
            "flagged_count": len(flagged),
            "fan_count": len(fan_findings),
            "cycle_count": len(cycle_findings),
            "chain_count": len(chain_findings),
            "cluster_count": len(cluster_findings),
        },
    )
    db.add(audit)
    db.commit()

    # 9. Update in-memory state
    pipeline_state.active_run_id = run_id
    pipeline_state.graph = G
    pipeline_state.accounts_df = acct_df
    pipeline_state.transactions_df = txn_df
    pipeline_state.scored_accounts = scored
    pipeline_state.features = features

    return IngestResponse(
        run_id=run_id,
        txn_count=txn_stats.final_txn_count,
        acct_count=acct_stats.final_acct_count,
        flagged_count=len(flagged),
        dropped_duplicates=txn_stats.dropped_duplicates,
        dropped_self_transfers=txn_stats.dropped_self_transfers,
        dropped_bad_rows=txn_stats.dropped_bad_rows,
    )


def get_neighbourhood(
    account_id: str,
    hops: int = 1,
    max_nodes: int = 50,
) -> NetworkResponse:
    """Retrieve ego network around account_id for graph visualization."""
    if pipeline_state.graph is None or account_id not in pipeline_state.graph:
        return NetworkResponse(nodes=[], edges=[])

    def score_priority(node_id: str) -> int:
        acct = pipeline_state.scored_accounts.get(node_id)
        return acct.risk_score if acct else 0

    visited_nodes, agg_edges = get_ego_network(
        pipeline_state.graph,
        center=account_id,
        hops=hops,
        max_nodes=max_nodes,
        score_fn=score_priority,
    )

    nodes: list[NetworkNode] = []
    ref_date = (
        pipeline_state.accounts_df["opened_date"].max()
        if pipeline_state.accounts_df is not None
        else pd.Timestamp.now()
    )

    for nid in visited_nodes:
        sc = pipeline_state.scored_accounts.get(nid)
        score = sc.risk_score if sc else 0
        patterns = sc.patterns if sc else []

        age_days = 0
        if pipeline_state.graph.has_node(nid):
            opened = pipeline_state.graph.nodes[nid].get("opened_date")
            if pd.notna(opened) and opened is not None:
                try:
                    age_days = (ref_date - pd.to_datetime(opened)).days
                except Exception:
                    age_days = 0

        nodes.append(NetworkNode(
            id=nid,
            score=score,
            patterns=patterns,
            age_days=max(0, age_days),
        ))

    edges: list[NetworkEdge] = []
    for src, dst, data in agg_edges:
        first_time_str = (
            data["first_time"].isoformat()
            if hasattr(data["first_time"], "isoformat")
            else str(data["first_time"])
        )
        edges.append(NetworkEdge(
            src=src,
            dst=dst,
            total_amount=round(float(data["total_amount"]), 2),
            count=int(data["count"]),
            first_time=first_time_str,
        ))

    return NetworkResponse(nodes=nodes, edges=edges)
