"""Environment-backed application configuration."""

from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    application_name: str = "IncidentForge API"
    environment: str = "development"
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    log_level: str = "INFO"
    database_url: str = "sqlite:///backend/data/incidentforge.db"


def get_settings() -> Settings:
    """Load non-secret settings from the process environment."""
    return Settings(
        application_name=os.getenv("INCIDENTFORGE_APP_NAME", Settings.application_name),
        environment=os.getenv("INCIDENTFORGE_ENVIRONMENT", Settings.environment),
        api_host=os.getenv("INCIDENTFORGE_API_HOST", Settings.api_host),
        api_port=int(os.getenv("INCIDENTFORGE_API_PORT", str(Settings.api_port))),
        log_level=os.getenv("INCIDENTFORGE_LOG_LEVEL", Settings.log_level).upper(),
        database_url=os.getenv("INCIDENTFORGE_DATABASE_URL", Settings.database_url),
    )