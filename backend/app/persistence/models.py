"""SQLModel persistence tables, separate from API/domain schemas."""

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class Event(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    event_id: str = Field(index=True, unique=True, max_length=256)
    timestamp: datetime
    source: str = Field(max_length=128)
    event_type: str = Field(max_length=128)
    severity: int
    message: str
    host: str | None = Field(default=None, max_length=255)
    user: str | None = Field(default=None, max_length=255)
    source_ip: str | None = Field(default=None, max_length=64)
    destination_ip: str | None = Field(default=None, max_length=64)
    metadata_json: str = "{}"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Alert(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    alert_id: str = Field(index=True, unique=True, max_length=256)
    event_id: str = Field(index=True, max_length=256)
    timestamp: datetime
    rule_id: str = Field(max_length=128)
    rule_name: str = Field(max_length=256)
    severity: int
    description: str
    source: str = Field(max_length=128)
    evidence_json: str = "{}"
    mitre_techniques_json: str = "[]"
    status: str = Field(default="new", max_length=32)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Incident(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    incident_id: str = Field(index=True, unique=True, max_length=256)
    title: str = Field(max_length=256)
    description: str
    severity: int
    status: str = Field(default="open", max_length=32)
    created_at: datetime
    updated_at: datetime
    alert_ids_json: str = "[]"
    tags_json: str = "[]"


class Investigation(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    investigation_id: str = Field(index=True, unique=True, max_length=256)
    incident_id: str = Field(index=True, max_length=256)
    status: str = Field(default="pending", max_length=32)
    summary: str
    findings_json: str = "[]"
    confidence: float
    recommendations_json: str = "[]"
    generated_at: datetime


class ResponseAction(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    action_id: str = Field(index=True, unique=True, max_length=256)
    incident_id: str = Field(index=True, max_length=256)
    action_type: str = Field(max_length=128)
    status: str = Field(default="proposed", max_length=32)
    requested_at: datetime
    approved_by: str | None = Field(default=None, max_length=256)
    executed_at: datetime | None = None
    result: str | None = None


class AuditEvent(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    audit_id: str = Field(index=True, unique=True, max_length=256)
    timestamp: datetime
    actor: str = Field(max_length=256)
    action: str = Field(max_length=256)
    target: str = Field(max_length=256)
    result: str
    metadata_json: str = "{}"