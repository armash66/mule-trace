"""Database engine, session factory, and helpers."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .models import Base, LegacyBase

DATABASE_URL = "sqlite:///./muletrace.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite-specific
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all tables if they don't exist and ensure schema is up to date."""
    Base.metadata.create_all(bind=engine)
    LegacyBase.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            from sqlalchemy import text
            cursor = conn.execute(text("PRAGMA table_info(runs)"))
            cols = [row[1] for row in cursor.fetchall()]
            columns = {
                "created_by": "VARCHAR(32)",
                "filename": "VARCHAR(500)",
                "total_rows": "INTEGER DEFAULT 0",
                "valid_rows": "INTEGER DEFAULT 0",
                "duplicate_rows": "INTEGER DEFAULT 0",
                "invalid_rows": "INTEGER DEFAULT 0",
                "total_accounts": "INTEGER DEFAULT 0",
                "total_transfers": "INTEGER DEFAULT 0",
                "total_alerts": "INTEGER DEFAULT 0",
                "total_rings": "INTEGER DEFAULT 0",
                "config_snapshot_json": "TEXT",
                "data_quality_json": "TEXT",
                "timing_json": "TEXT",
                "seed": "INTEGER DEFAULT 42",
                "started_at": "DATETIME",
                "completed_at": "DATETIME",
                "name": "VARCHAR DEFAULT 'Pipeline Run'",
                "status": "VARCHAR DEFAULT 'completed'",
                "config_preset": "VARCHAR DEFAULT 'default'",
                "source": "VARCHAR DEFAULT 'CSV Upload'",
                "is_active": "INTEGER DEFAULT 1",
                "txn_count": "INTEGER DEFAULT 0",
                "acct_count": "INTEGER DEFAULT 0",
                "flagged_count": "INTEGER DEFAULT 0",
                "duplicates_removed": "INTEGER DEFAULT 0",
                "out_of_order_fixed": "INTEGER DEFAULT 0",
                "missing_device_pct": "FLOAT DEFAULT 0",
                "missing_ip_pct": "FLOAT DEFAULT 0",
                "self_transfers_dropped": "INTEGER DEFAULT 0",
                "health_summary": "JSON",
            }
            for column, definition in columns.items():
                if column not in cols:
                    try:
                        conn.execute(text(f"ALTER TABLE runs ADD COLUMN {column} {definition}"))
                    except Exception:
                        pass

            cursor = conn.execute(text("PRAGMA table_info(audit_log)"))
            audit_cols = [row[1] for row in cursor.fetchall()]
            audit_columns = {
                "user_id": "VARCHAR(32)",
                "username": "VARCHAR(100)",
                "details_json": "TEXT",
                "details": "JSON",
                "prev_hash": "VARCHAR(64)",
                "hash": "VARCHAR(64)",
            }
            for column, definition in audit_columns.items():
                if column not in audit_cols:
                    try:
                        conn.execute(text(f"ALTER TABLE audit_log ADD COLUMN {column} {definition}"))
                    except Exception:
                        pass

            for table, table_columns in {
                "decisions": {"case_id": "VARCHAR(32)", "run_id": "VARCHAR(32)", "action": "VARCHAR(20)", "status": "VARCHAR(20)", "user_id": "VARCHAR(32)", "analyst": "VARCHAR(100)"},
                "freeze_requests": {"run_id": "VARCHAR(32)", "ring_id": "VARCHAR(32)", "account_ids": "JSON", "amount": "FLOAT", "note": "TEXT", "updated_at": "DATETIME"},
            }.items():
                cursor = conn.execute(text(f"PRAGMA table_info({table})"))
                existing = [row[1] for row in cursor.fetchall()]
                for column, definition in table_columns.items():
                    if column not in existing:
                        try:
                            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
                        except Exception:
                            pass
            conn.commit()
        except Exception:
            pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
