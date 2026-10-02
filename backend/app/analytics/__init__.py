"""Analytics sub-package for MuleTrace."""

from .communities import discover_rings
from .explain import explain_account
from .freeze_optimizer import optimize_freeze_plan
from .propagation import compute_risk_propagation, rerank_accounts_with_propagation
from .redteam import evaluate_evasion_curve
from .replay import generate_ring_replay
from .taint import propagate_taint

__all__ = [
    "compute_risk_propagation",
    "discover_rings",
    "evaluate_evasion_curve",
    "explain_account",
    "generate_ring_replay",
    "optimize_freeze_plan",
    "propagate_taint",
    "rerank_accounts_with_propagation",
]
