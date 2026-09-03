"""Event intake endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from ...adapters.fixtures import FixtureAdapter
from ...database import get_session
from ...models.events import NormalizedEvent
from ...models.processing import EventProcessingResult
from ...persistence.repositories import EventRepository
from ...services.normalization import NormalizationService
from ...services.processing import EventProcessingService

router = APIRouter(prefix="/api/v1/events", tags=["events"])
logger = logging.getLogger(__name__)
normalizer = NormalizationService()


@router.post("", response_model=EventProcessingResult, status_code=status.HTTP_202_ACCEPTED)
def accept_event(event: NormalizedEvent, session: Session = Depends(get_session)) -> EventProcessingResult:
    try:
        normalized = normalizer.normalize(event.model_dump())
        result = EventProcessingService(EventRepository(session)).process(normalized)
    except SQLAlchemyError as exc:
        logger.exception("Event persistence failed", extra={"event_id": event.event_id})
        raise HTTPException(status_code=503, detail="Event could not be accepted") from exc
    logger.info("Accepted event", extra={"event_id": result.event_id, "source": normalized.source})
    return result


@router.get("/example", response_model=NormalizedEvent)
def example_event() -> NormalizedEvent:
    return normalizer.normalize(FixtureAdapter().get_events()[0])