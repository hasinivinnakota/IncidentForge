"""AI investigation result data model. No AI client is implemented here."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InvestigationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    investigation_id: str = Field(min_length=1, max_length=256)
    incident_id: str = Field(min_length=1, max_length=256)
    summary: str = Field(min_length=1, max_length=10000)
    findings: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    recommendations: list[str] = Field(default_factory=list)
    generated_at: datetime