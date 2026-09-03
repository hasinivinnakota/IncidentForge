"""Proposed response action model. It intentionally performs no action."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ResponseActionStatus(str, Enum):
    PROPOSED = "proposed"
    APPROVED = "approved"
    EXECUTED = "executed"
    FAILED = "failed"
    REJECTED = "rejected"


class ResponseAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action_id: str = Field(min_length=1, max_length=256)
    incident_id: str = Field(min_length=1, max_length=256)
    action_type: str = Field(min_length=1, max_length=128)
    status: ResponseActionStatus = ResponseActionStatus.PROPOSED
    requested_at: datetime
    approved_by: str | None = Field(default=None, max_length=256)
    executed_at: datetime | None = None
    result: str | None = Field(default=None, max_length=10000)