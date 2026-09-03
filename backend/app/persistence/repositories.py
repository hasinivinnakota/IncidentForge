"""Persistence repositories."""

import json
from collections.abc import Sequence
from dataclasses import dataclass

from sqlmodel import Session, select

from ..models.events import NormalizedEvent
from .models import AuditEvent, Event


@dataclass(frozen=True)
class EventWriteResult:
    event: Event
    created: bool


class EventRepository:
    def __init__(self, session: Session):
        self.session = session

    def create_event(self, event: NormalizedEvent) -> EventWriteResult:
        """Store an event, returning the existing row for duplicate event IDs."""
        existing = self.get_event(event.event_id)
        if existing is not None:
            return EventWriteResult(event=existing, created=False)

        record = Event(
            event_id=event.event_id,
            timestamp=event.timestamp,
            source=event.source,
            event_type=event.event_type,
            severity=event.severity,
            message=event.message,
            host=event.host,
            user=event.user,
            source_ip=event.source_ip,
            destination_ip=event.destination_ip,
            metadata_json=json.dumps(event.metadata, sort_keys=True, default=str),
        )
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return EventWriteResult(event=record, created=True)

    def get_event(self, event_id: str) -> Event | None:
        return self.session.exec(select(Event).where(Event.event_id == event_id)).first()

    def list_recent_events(self, limit: int = 100) -> Sequence[Event]:
        return self.session.exec(select(Event).order_by(Event.created_at.desc()).limit(limit)).all()

    def create_audit_event(self, audit: AuditEvent) -> AuditEvent:
        existing = self.session.exec(select(AuditEvent).where(AuditEvent.audit_id == audit.audit_id)).first()
        if existing is not None:
            return existing
        self.session.add(audit)
        self.session.commit()
        self.session.refresh(audit)
        return audit

    def list_audit_events(self, target: str | None = None) -> Sequence[AuditEvent]:
        statement = select(AuditEvent).order_by(AuditEvent.timestamp.asc())
        if target is not None:
            statement = statement.where(AuditEvent.target == target)
        return self.session.exec(statement).all()