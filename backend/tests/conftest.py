"""Shared fixtures for MuleTrace tests."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pandas as pd
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

SCRIPT = REPO_ROOT / "scripts" / "generate_data.py"
CONFIG = REPO_ROOT / "config.yaml"


@pytest.fixture(scope="session")
def gen_data(tmp_path_factory: pytest.TempPathFactory) -> dict[str, Any]:
    """Run the generator once (seed=42) and return output artefacts.

    Returns a dict with keys:
        dir        – Path to output directory
        txn        – transactions DataFrame
        acct       – accounts DataFrame
        gt         – parsed ground_truth.json
        stdout     – generator stdout text
    """
    out = tmp_path_factory.mktemp("gendata")
    result = subprocess.run(
        [
            sys.executable, str(SCRIPT),
            "--seed", "42",
            "--output-dir", str(out),
            "--config", str(CONFIG),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    txn = pd.read_csv(out / "transactions.csv")
    acct = pd.read_csv(out / "accounts.csv")
    with open(out / "ground_truth.json", encoding="utf-8") as f:
        gt = json.load(f)

    return {
        "dir": out,
        "txn": txn,
        "acct": acct,
        "gt": gt,
        "stdout": result.stdout,
    }
