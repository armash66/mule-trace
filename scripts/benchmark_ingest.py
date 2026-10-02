import os
import sys
import time
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.app.api.uploads import parse_dataframe_from_bytes, UPLOAD_STORE, validate_upload

def run_benchmark():
    print("Generating 100,000 synthetic transaction records...")
    t0 = time.time()
    n = 100000
    dates = pd.date_range("2026-10-01", periods=n, freq="s")
    df_raw = pd.DataFrame({
        "sender": [f"ACC_{i % 2500:05d}" for i in range(n)],
        "receiver": [f"ACC_{(i + 1) % 2500:05d}" for i in range(n)],
        "trans_date": dates.astype(str),
        "amt": ["₹" + str(1000 + (i % 50000)) for i in range(n)],
        "channel": ["UPI"] * n,
        "dev": [f"DEV_{i % 100}" for i in range(n)],
        "ip": ["103.21.24.11"] * n,
    })
    csv_bytes = df_raw.to_csv(index=False).encode("utf-8")
    t_gen = time.time() - t0
    print(f"Generated 100k rows in {t_gen:.2f}s ({len(csv_bytes) / 1024 / 1024:.2f} MB)")

    t1 = time.time()
    df_parsed = parse_dataframe_from_bytes("benchmark_txns.csv", csv_bytes)
    t_parse = time.time() - t1
    print(f"Parsed 100k rows in {t_parse:.2f}s")

    upload_id = "bench_100k_run"
    UPLOAD_STORE[upload_id] = {
        "created_at": time.time(),
        "txn_df": df_parsed,
        "mapping": {
            "transactions": {
                "src_account": "sender",
                "dst_account": "receiver",
                "timestamp": "trans_date",
                "amount": "amt",
                "channel": "channel",
                "device_id": "dev",
                "ip": "ip",
            }
        },
        "timezone": "Asia/Kolkata",
        "date_format": None,
        "rejects_df": pd.DataFrame(),
    }

    t2 = time.time()
    report = validate_upload(upload_id)
    t_val = time.time() - t2
    total_time = t_parse + t_val

    print(f"Validated 100k rows in {t_val:.2f}s")
    print(f"TOTAL 100k-row intake & validation time: {total_time:.2f}s (Target: < 20.0s)")
    assert total_time < 20.0, f"Benchmark failed: took {total_time:.2f}s"
    print("100k ingestion benchmark PASSED successfully!")
    return total_time

if __name__ == "__main__":
    run_benchmark()
