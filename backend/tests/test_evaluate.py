from __future__ import annotations

import json

import pandas as pd
import pytest

from scripts.evaluate import evaluate, parse_pattern_labels, split_counts, split_transactions


def sample_frame() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {"Timestamp": "2022/09/01 00:01", "From Bank": "1", "Account": "A", "To Bank": "2", "Account.1": "B", "Amount Received": 10, "Receiving Currency": "Euro", "Amount Paid": 10, "Payment Currency": "Euro", "Payment Format": "ACH", "Is Laundering": 1},
            {"Timestamp": "2022/09/08 00:01", "From Bank": "2", "Account": "B", "To Bank": "3", "Account.1": "C", "Amount Received": 20, "Receiving Currency": "Euro", "Amount Paid": 20, "Payment Currency": "Euro", "Payment Format": "ACH", "Is Laundering": 0},
        ]
    )


def test_split_is_strictly_time_ordered():
    tuning, test = split_transactions(sample_frame(), "2022-09-07")
    assert len(tuning) == 1
    assert len(test) == 1
    assert split_counts(tuning) == {"accounts": 2, "laundering_transactions": 1, "normal_accounts": 0}
    assert split_counts(test) == {"accounts": 2, "laundering_transactions": 0, "normal_accounts": 2}


def test_test_evaluation_requires_frozen_thresholds(tmp_path):
    input_path = tmp_path / "transactions.csv"
    sample_frame().to_csv(input_path, index=False)
    with pytest.raises(RuntimeError, match="frozen"):
        evaluate(input_path, tmp_path / "patterns.txt", tmp_path / "thresholds.json", "2022-09-07")


def test_freeze_writes_timestamp_and_thresholds(tmp_path):
    input_path = tmp_path / "transactions.csv"
    thresholds_path = tmp_path / "config" / "thresholds.json"
    sample_frame().to_csv(input_path, index=False)
    payload = evaluate(input_path, tmp_path / "patterns.txt", thresholds_path, "2022-09-07", freeze=True)
    assert payload["frozen"] is True
    assert payload["frozen_at"]
    saved = json.loads(thresholds_path.read_text(encoding="utf-8"))
    assert saved["split_date"] == "2022-09-07"
    assert set(saved["thresholds"]) == {"fan_out", "fan_in", "cycle", "pass_through", "behavioral"}


def test_pattern_labels_normalize_leading_zero_fields(tmp_path):
    patterns = tmp_path / "patterns.txt"
    patterns.write_text(
        "BEGIN LAUNDERING ATTEMPT - FAN-OUT\n"
        "2022/09/01 00:01,01,0001,002,0002,10.0,Euro,10.00,Euro,ACH,1\n"
        "END LAUNDERING ATTEMPT - FAN-OUT\n",
        encoding="utf-8",
    )
    labels = parse_pattern_labels(patterns)
    assert labels[("2022/09/01 00:01", "1", "1", "2", "2", "10", "Euro", "10", "Euro", "ACH")] == "fan-out"
