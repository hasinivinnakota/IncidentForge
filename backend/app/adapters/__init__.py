"""Telemetry ingestion adapters."""

from .base import TelemetryAdapter
from .fixtures import FixtureAdapter

__all__ = ["FixtureAdapter", "TelemetryAdapter"]