"""Application configuration with validation and sane defaults."""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class DetectorThresholds(BaseSettings):
    """Detection engine thresholds — editable in UI, snapshotted per run."""

    # Fan-in/Fan-out
    fan_in_min_senders: int = Field(default=3, ge=2, le=50, description="Min distinct senders")
    fan_out_min_receivers: int = Field(default=2, ge=2, le=50, description="Min distinct receivers")
    fan_burst_window_min: int = Field(default=30, ge=5, le=1440, description="Inflow burst window (minutes)")
    fan_outflow_window_min: int = Field(default=30, ge=5, le=1440, description="Outflow window after burst (minutes)")
    fan_outflow_ratio: float = Field(default=0.80, ge=0.5, le=1.0, description="Min outflow/inflow ratio")

    # Cycles
    cycle_max_length: int = Field(default=6, ge=3, le=10, description="Max cycle length")
    cycle_window_min: int = Field(default=120, ge=10, le=1440, description="Cycle completion window (minutes)")
    cycle_retained_ratio: float = Field(default=0.70, ge=0.3, le=1.0, description="Min retained ratio across cycle")

    # Pass-through
    passthrough_retention_max: float = Field(default=0.05, ge=0.0, le=0.2, description="Max retention ratio")
    passthrough_max_hold_min: int = Field(default=15, ge=1, le=120, description="Max hold time (minutes)")
    passthrough_forward_ratio: float = Field(default=0.90, ge=0.7, le=1.0, description="Min forward ratio")
    passthrough_min_chain_len: int = Field(default=3, ge=2, le=10, description="Min chain length")

    # New-account cluster
    cluster_new_account_days: int = Field(default=30, ge=7, le=365, description="Days to consider account 'new'")
    cluster_min_size: int = Field(default=3, ge=2, le=20, description="Min cluster size")
    cluster_max_attribute_share: int = Field(default=50, ge=5, le=500, description="Max accounts sharing an attribute before IDF ignore")

    # Behavioral / ML
    behavioral_dormant_days: int = Field(default=30, ge=7, le=180, description="Days of inactivity before 'dormant'")
    behavioral_velocity_std_mult: float = Field(default=3.0, ge=1.5, le=10.0, description="Velocity multiplier for anomaly")
    ml_contamination: float = Field(default=0.05, ge=0.01, le=0.2, description="Isolation Forest contamination")

    # Scoring weights (must sum to ~1.0)
    weight_fan_in_out: float = Field(default=0.25, ge=0.0, le=1.0)
    weight_pass_through: float = Field(default=0.25, ge=0.0, le=1.0)
    weight_cycle: float = Field(default=0.20, ge=0.0, le=1.0)
    weight_new_cluster: float = Field(default=0.20, ge=0.0, le=1.0)
    weight_behavioral: float = Field(default=0.10, ge=0.0, le=1.0)

    # Watchlist bonus
    watchlist_bonus: int = Field(default=30, ge=0, le=50, description="Score bonus for watchlist match")

    # Risk bands
    band_low_max: int = Field(default=39, ge=10, le=50)
    band_medium_max: int = Field(default=69, ge=40, le=80)
    band_high_max: int = Field(default=89, ge=70, le=95)

    model_config = {"env_prefix": "THRESH_"}


class Settings(BaseSettings):
    """Main application settings."""

    # Server
    app_name: str = "MuleTrace"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    database_url: str = "sqlite:///./data/muletrace.db"

    # Security
    secret_key: str = "dev-secret-key-change-in-prod"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7
    jwt_algorithm: str = "HS256"

    # CORS
    cors_origins: str = "http://localhost:5173"

    # Feature flags
    llm_summary: bool = False
    neo4j_enabled: bool = False
    streaming_mode: bool = False

    # File paths
    upload_dir: str = "./data/uploads"
    report_dir: str = "./data/reports"
    parquet_dir: str = "./data/parquet"
    max_upload_size_mb: int = 500

    # Defaults
    default_currency: str = "INR"
    default_timezone: str = "Asia/Kolkata"
    default_locale: str = "en"

    # Seed
    seed: int = 42

    # Neo4j (optional)
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"

    # Anthropic (optional)
    anthropic_api_key: str = ""

    # Detection thresholds
    thresholds: DetectorThresholds = Field(default_factory=DetectorThresholds)

    # Data retention
    retention_days: int = Field(default=365, ge=30, description="Data retention in days")

    @field_validator("cors_origins")
    @classmethod
    def parse_cors(cls, v: str) -> str:
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def upload_path(self) -> Path:
        p = Path(self.upload_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def report_path(self) -> Path:
        p = Path(self.report_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def parquet_path(self) -> Path:
        p = Path(self.parquet_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


# Singleton
_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


# Risk band helper
RiskBand = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def get_risk_band(score: float, thresholds: DetectorThresholds | None = None) -> RiskBand:
    """Return risk band for a score."""
    t = thresholds or get_settings().thresholds
    if score <= t.band_low_max:
        return "LOW"
    elif score <= t.band_medium_max:
        return "MEDIUM"
    elif score <= t.band_high_max:
        return "HIGH"
    else:
        return "CRITICAL"
