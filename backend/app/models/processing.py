"""Result returned by the event-processing boundary."""

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ProcessingStatus(str, Enum):
    PROCESSED = "processed"


class PersistenceStatus(str, Enum):
    PERSISTED = "persisted"
    DUPLICATE = "duplicate"


class EventProcessingResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_id: str = Field(min_length=1, max_length=256)
    newly_persisted: bool
    duplicate: bool
    processing_status: ProcessingStatus = ProcessingStatus.PROCESSED
    persistence_status: PersistenceStatus