from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_super_admin
from app.schemas.organization import OrganizationResponse, OrganizationUpdate
from app.services.organization_service import OrganizationService

router = APIRouter(prefix="/api/v1/organizations", tags=["organizations"])


@router.get("", response_model=List[OrganizationResponse])
def list_organizations(
    current_user=Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    return OrganizationService(db).list_organizations()


@router.get("/{organization_id}", response_model=OrganizationResponse)
def get_organization(
    organization_id: int,
    current_user=Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    organization = OrganizationService(db).get_organization(organization_id)
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return organization


@router.patch("/{organization_id}", response_model=OrganizationResponse)
def update_organization(
    organization_id: int,
    payload: OrganizationUpdate,
    current_user=Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    service = OrganizationService(db)
    try:
        organization = service.update_organization(
            organization_id,
            name=payload.name,
            status=payload.status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return organization
