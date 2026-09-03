"""Deterministic development/test telemetry adapter."""

from collections.abc import Mapping, Sequence
from datetime import datetime, timezone
from typing import Any

from .base import TelemetryAdapter


class FixtureAdapter(TelemetryAdapter):
    def get_events(self) -> Sequence[Mapping[str, Any]]:
        return [
            {
                "event_id": "fixture-event-001",
                "timestamp": datetime(2026, 1, 1, tzinfo=timezone.utc),
                "source": "fixture",
                "event_type": "process_start",
                "severity": 3,
                "message": "Example process-start event",
                "host": "fixture-host",
                "metadata": {"fixture": True},
            }
        ]