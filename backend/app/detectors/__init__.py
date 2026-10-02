"""Detector sub-package. Each module exposes a single pure detect_* function."""

from .chain import detect_chains
from .cluster import detect_clusters
from .cycle import detect_cycles
from .dormancy import detect_dormancy
from .fan import detect_fan

__all__ = [
    "detect_chains",
    "detect_clusters",
    "detect_cycles",
    "detect_dormancy",
    "detect_fan",
]
