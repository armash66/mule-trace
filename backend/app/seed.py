"""Database seeder — creates demo users, generates synthetic data, and runs analysis."""
from __future__ import annotations

import json
import logging
import os
import sys

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.config import get_settings
from app.core.database import init_db, get_session_factory, get_engine
from app.core.security import hash_password, Role
from app.engine.ingest import parse_csv
from app.engine.pipeline import run_pipeline
from app.models.models import User, WatchlistEntry, gen_id
from synthetic.generator import generate_synthetic_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed():
    """Seed the database with demo data."""
    logger.info("=== MuleTrace Database Seeder ===")

    settings = get_settings()
    init_db()
    factory = get_session_factory(get_engine())
    db = factory()

    try:
        # ── Create demo users ────────────────────────────
        users = [
            {"username": "analyst", "email": "analyst@muletrace.dev", "password": "analyst123", "role": "analyst", "display_name": "Priya Sharma"},
            {"username": "lead", "email": "lead@muletrace.dev", "password": "lead123", "role": "lead", "display_name": "Rajesh Kumar"},
            {"username": "compliance", "email": "compliance@muletrace.dev", "password": "compliance123", "role": "compliance", "display_name": "Anita Desai"},
            {"username": "admin", "email": "admin@muletrace.dev", "password": "admin123", "role": "admin", "display_name": "System Admin"},
            {"username": "auditor", "email": "auditor@muletrace.dev", "password": "auditor123", "role": "auditor", "display_name": "Vikram Singh"},
        ]

        for u in users:
            existing = db.query(User).filter(User.username == u["username"]).first()
            if not existing:
                user = User(
                    id=gen_id(),
                    username=u["username"],
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                    display_name=u["display_name"],
                )
                db.add(user)
                logger.info(f"  Created user: {u['username']} ({u['role']})")
            else:
                logger.info(f"  User exists: {u['username']}")

        db.commit()

        # ── Generate synthetic data ──────────────────────
        logger.info("\nGenerating synthetic data...")
        data_dir = os.path.join(os.path.dirname(__file__), "data")
        os.makedirs(data_dir, exist_ok=True)

        summary = generate_synthetic_data(
            num_accounts=5000,
            num_rings=10,
            seed=settings.seed,
            output_dir=data_dir,
        )
        logger.info(f"  Generated {summary['transactions']} transactions, {summary['accounts']} accounts")
        logger.info(f"  Planted {summary['rings_planted']} rings with {summary['mule_accounts']} mule accounts")

        # ── Import watchlist ─────────────────────────────
        import csv
        wl_path = summary["files"]["watchlist"]
        with open(wl_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing = db.query(WatchlistEntry).filter(
                    WatchlistEntry.account_id == row["account_id"]
                ).first()
                if not existing:
                    wl = WatchlistEntry(
                        id=gen_id(),
                        account_id=row["account_id"],
                        source=row.get("source", "Seeded"),
                        reason=row.get("reason", ""),
                        added_by="system",
                    )
                    db.add(wl)
        db.commit()
        logger.info("  Imported watchlist")

        # ── Run analysis pipeline ────────────────────────
        logger.info("\nRunning analysis pipeline...")
        txn_path = summary["files"]["transactions"]
        with open(txn_path, "rb") as f:
            content = f.read()

        df, quality = parse_csv(content, "transactions.csv")
        logger.info(f"  Parsed: {quality.valid_rows} valid rows")

        from app.models.models import Run
        run = Run(
            id=gen_id(),
            status="pending",
            filename="demo_transactions.csv",
            total_rows=quality.total_rows,
            valid_rows=quality.valid_rows,
            seed=settings.seed,
        )
        db.add(run)
        db.commit()

        result = run_pipeline(run.id, df, quality, db)
        logger.info(f"  Pipeline complete: {result['total_alerts']} alerts, {result['total_rings']} rings")
        logger.info(f"  Timings: {json.dumps(result['timings'], indent=2)}")

        # ── Print summary ────────────────────────────────
        logger.info("\n=== Seed Complete ===")
        logger.info(f"  Users: {len(users)}")
        logger.info(f"  Transactions: {summary['transactions']}")
        logger.info(f"  Accounts: {summary['accounts']}")
        logger.info(f"  Alerts: {result['total_alerts']}")
        logger.info(f"  Rings: {result['total_rings']}")
        logger.info("")
        logger.info("Demo credentials:")
        for u in users:
            logger.info(f"  {u['email']} / {u['password']} ({u['role']})")
        logger.info("")
        logger.info("API: http://localhost:8000/docs")
        logger.info("Web: http://localhost:5173")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
