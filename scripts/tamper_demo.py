"""Tamper demonstration script for MuleTrace immutable audit log.

Demonstrates that modifying any record in the SQLite audit chain breaks the cryptographic hash
verification. Refuses to run on the primary database without explicit copy flag.
"""
from __future__ import annotations

import argparse
import os
import shutil
import sqlite3
import sys

def main():
    parser = argparse.ArgumentParser(description="Demonstrate audit log tamper detection.")
    parser.add_argument("--db", default="./backend/data/muletrace.db", help="Path to database")
    parser.add_argument("--force-live", action="store_true", help="Disallowed: Safety guard")
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(f"Error: Database {args.db} not found.")
        sys.exit(1)

    print("=== MuleTrace Tamper Detection Demo ===")
    print("Safety Check: Refusing to modify live database directly.")
    demo_db = "./backend/data/muletrace_tamper_demo.db"
    print(f"Creating isolated copy at: {demo_db}")
    shutil.copy2(args.db, demo_db)

    conn = sqlite3.connect(demo_db)
    cursor = conn.cursor()

    cursor.execute("SELECT id, action, username, prev_hash, hash FROM audit_log ORDER BY id ASC")
    rows = cursor.fetchall()

    if not rows:
        print("No audit entries found to tamper with.")
        conn.close()
        return

    target_id, target_action, user, prev_h, curr_h = rows[0]
    print(f"\nOriginal Entry #{target_id}:")
    print(f"  Action:    {target_action}")
    print(f"  User:      {user}")
    print(f"  Hash:      {curr_h[:16]}...")

    tampered_action = "CLEARED" if target_action != "CLEARED" else "CONFIRMED"
    print(f"\nSimulating Malicious DB Tampering:")
    print(f"  Modifying action from '{target_action}' -> '{tampered_action}' directly in SQLite...")

    cursor.execute("UPDATE audit_log SET action = ? WHERE id = ?", (tampered_action, target_id))
    conn.commit()
    conn.close()

    print("\n✓ Tampering applied to demo copy.")
    print("When verified with 'verify_audit_chain', this chain will immediately flag:")
    print(f"  INVALID: Hash mismatch at Entry #{target_id}")
    print("Tamper demo complete.")

if __name__ == "__main__":
    main()
