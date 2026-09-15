"""Data Assets API routes.

Provides:
  POST   /api/v1/data-assets             - Register a dataset (profile from file or supply metadata)
  GET    /api/v1/data-assets             - List registered datasets
  GET    /api/v1/data-assets/{asset_id}  - Get specific dataset profile
  GET    /api/v1/data-assets/{asset_id}/profile   - Get detailed column profile
  GET    /api/v1/data-assets/{asset_id}/activity  - List activity for dataset

Does NOT expose raw dataset row contents.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from ...database import get_session
from ...models.dataset import DatasetAsset
from ...persistence.repositories import DatasetRepository
from ...services.dataset import DatasetService

router = APIRouter(prefix="/api/v1/data-assets", tags=["data-assets"])
logger = logging.getLogger(__name__)


def get_dataset_service(session: Session = Depends(get_session)) -> DatasetService:
    return DatasetService(DatasetRepository(session))


class DatasetRegisterRequest(DatasetAsset):
    """Request body for registering a dataset from an already-profiled asset."""
    pass


@router.post("", response_model=DatasetAsset, status_code=status.HTTP_201_CREATED)
def register_dataset(
    asset: DatasetAsset,
    svc: DatasetService = Depends(get_dataset_service),
) -> DatasetAsset:
    """Register a dataset asset in the catalog.

    Supply a fully-formed DatasetAsset including columns, sensitivity, and schema metadata.
    No raw dataset contents are stored.
    """
    try:
        return svc.register_asset(asset)
    except SQLAlchemyError as exc:
        logger.exception("Failed to register dataset", extra={"dataset_id": asset.dataset_id})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dataset registration failed",
        ) from exc


@router.get("", response_model=list[DatasetAsset])
def list_datasets(
    limit: int = 100,
    svc: DatasetService = Depends(get_dataset_service),
) -> list[DatasetAsset]:
    """List all registered datasets with classification metadata."""
    return svc.list_assets(limit=limit)


@router.get("/{asset_id}", response_model=DatasetAsset)
def get_dataset(
    asset_id: str,
    svc: DatasetService = Depends(get_dataset_service),
) -> DatasetAsset:
    """Get a specific dataset profile."""
    asset = svc.get_asset(asset_id)
    if asset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{asset_id}' not found",
        )
    return asset


@router.get("/{asset_id}/profile", response_model=dict)
def get_dataset_profile(
    asset_id: str,
    svc: DatasetService = Depends(get_dataset_service),
) -> dict:
    """Get the detailed column schema and sensitivity profile for a dataset.

    Does NOT expose raw row data - only column names, types, and classifications.
    """
    asset = svc.get_asset(asset_id)
    if asset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{asset_id}' not found",
        )
    return {
        "dataset_id": asset.dataset_id,
        "name": asset.name,
        "format": asset.format.value,
        "sensitivity": asset.sensitivity.value,
        "record_count": asset.record_count,
        "column_count": asset.column_count,
        "schema_hash": asset.schema_hash,
        "sensitive_columns": asset.sensitive_columns,
        "columns": [
            {
                "name": c.name,
                "data_type": c.data_type,
                "is_sensitive": c.is_sensitive,
                "pii_type": c.pii_type,
                "sensitivity": c.sensitivity.value,
            }
            for c in asset.columns
        ],
        "metadata": asset.metadata,
    }


@router.get("/{asset_id}/activity", response_model=list[dict])
def get_dataset_activity(
    asset_id: str,
    limit: int = 50,
    svc: DatasetService = Depends(get_dataset_service),
) -> list[dict]:
    """List recent activity events for a dataset."""
    asset = svc.get_asset(asset_id)
    if asset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{asset_id}' not found",
        )
    return svc.list_activities(dataset_id=asset_id, limit=limit)
