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
            if "name" not in cols:
                conn.execute(text("ALTER TABLE runs ADD COLUMN name VARCHAR DEFAULT 'Pipeline Run'"))
            if "status" not in cols:
                conn.execute(text("ALTER TABLE runs ADD COLUMN status VARCHAR DEFAULT 'completed'"))
            if "config_preset" not in cols:
                conn.execute(text("ALTER TABLE runs ADD COLUMN config_preset VARCHAR DEFAULT 'default'"))
            if "source" not in cols:
                conn.execute(text("ALTER TABLE runs ADD COLUMN source VARCHAR DEFAULT 'CSV Upload'"))
            if "is_active" not in cols:
                conn.execute(text("ALTER TABLE runs ADD COLUMN is_active INTEGER DEFAULT 1"))
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
