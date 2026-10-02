"""Database setup with SQLAlchemy 2.0 async-ready, SQLite default."""
from __future__ import annotations

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    """SQLAlchemy declarative base."""
    pass


def get_engine(url: str | None = None):
    """Create database engine."""
    db_url = url or get_settings().database_url
    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    engine = create_engine(
        db_url,
        connect_args=connect_args,
        echo=False,
        pool_pre_ping=True,
    )

    # Enable WAL mode for SQLite (better concurrent reads)
    if db_url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):  # type: ignore[no-untyped-def]
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


def get_session_factory(engine=None) -> sessionmaker[Session]:
    """Create session factory."""
    if engine is None:
        engine = get_engine()
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


# Module-level defaults (lazy init)
_engine = None
_session_factory: sessionmaker[Session] | None = None


def init_db() -> None:
    """Initialize database and create tables."""
    global _engine, _session_factory
    _engine = get_engine()
    _session_factory = get_session_factory(_engine)
    Base.metadata.create_all(bind=_engine)


def get_db():
    """Dependency: yield a DB session."""
    global _session_factory
    if _session_factory is None:
        init_db()
    assert _session_factory is not None
    db = _session_factory()
    try:
        yield db
    finally:
        db.close()
