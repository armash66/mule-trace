from __future__ import annotations

import pandas as pd

from scripts.inject_case import build_case_rows, inject_case


def test_case_rows_are_reproducible():
    first_rows, first_truth = build_case_rows("2022-09-08")
    second_rows, second_truth = build_case_rows("2022-09-08")
    assert first_rows == second_rows
    assert first_truth == second_truth
    assert first_truth["victim"] == "DEMO:V001"
    assert first_truth["cash_outs"] == ["DEMO:C001", "DEMO:C002"]


def test_injection_preserves_schema_and_marks_background(tmp_path):
    background = pd.DataFrame([{
        "txn_id": "TXN_1", "timestamp": "2022-09-08T09:00:00Z", "src_account": "A", "dst_account": "B",
        "amount": 10, "channel": "UPI", "device_id": "", "ip": "",
    }])
    input_path = tmp_path / "transactions.csv"
    output_path = tmp_path / "aml" / "transactions_with_case.csv"
    truth_path = tmp_path / "aml" / "case_truth.json"
    background.to_csv(input_path, index=False)
    inject_case(input_path, output_path, truth_path, "2022-09-08")
    result = pd.read_csv(output_path)
    assert "is_injected" in result.columns
    assert result.loc[result.txn_id == "TXN_1", "is_injected"].iloc[0] == False
    assert result.loc[result.txn_id == "DEMO_CASE_001", "is_injected"].iloc[0] == True
