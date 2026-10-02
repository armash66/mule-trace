"""Shared smooth multi-scale detector scoring."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

DEFAULT_SCALES = {
    "windows_minutes": [10.0, 30.0, 120.0, 1440.0],
    "weights": [0.40, 0.30, 0.20, 0.10],
}


def scale_config(config: dict[str, Any], detector: str) -> dict[str, list[float]]:
    configured = config.get("detector_scales", {}).get(detector)
    if configured:
        return configured
    path = Path(__file__).resolve().parents[3] / "config" / "thresholds.json"
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        configured = payload.get("detector_scales", {}).get(detector)
        if configured:
            return configured
    except (OSError, json.JSONDecodeError):
        pass
    return DEFAULT_SCALES


def smooth_window_score(minutes: float, settings: dict[str, list[float]]) -> float:
    windows = settings.get("windows_minutes", DEFAULT_SCALES["windows_minutes"])
    weights = settings.get("weights", DEFAULT_SCALES["weights"])
    if len(windows) != len(weights):
        raise ValueError("detector scale windows and weights must have equal length")
    total = sum(weights) or 1.0
    return sum(weight * math.exp(-max(minutes, 0.0) / window) for window, weight in zip(windows, weights)) / total
