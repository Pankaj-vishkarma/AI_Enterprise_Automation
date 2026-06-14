from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    MANAGE_TEAMS_PERMISSION,
    VIEW_TEAMS_PERMISSION,
    require_permission,
)
from app.schemas.pagination import PaginatedResponse
from app.schemas.team import TeamCreate, TeamResponse, TeamUpdate
from app.services.team_service import TeamService

router = APIRouter(
    prefix="/api/v1/teams",
    tags=["teams"],
)


@router.get("", response_model=PaginatedResponse[TeamResponse])
def list_teams(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(require_permission(VIEW_TEAMS_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = TeamService(db)
    rows, total = service.list_teams(current_user, limit=limit, offset=offset)
    return PaginatedResponse[TeamResponse](
        items=rows,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: int,
    current_user=Depends(require_permission(VIEW_TEAMS_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = TeamService(db)

    try:
        team = service.get_team_by_id(current_user, team_id)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    return team


@router.post("", response_model=TeamResponse)
def create_team(
    payload: TeamCreate,
    current_user=Depends(require_permission(MANAGE_TEAMS_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = TeamService(db)

    try:
        team = service.create_team(
            current_user=current_user,
            name=payload.name,
            description=payload.description,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return team


@router.patch("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: int,
    payload: TeamUpdate,
    current_user=Depends(require_permission(MANAGE_TEAMS_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = TeamService(db)

    try:
        team = service.update_team(
            current_user,
            team_id,
            payload.name,
            payload.description,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    return team


@router.patch("/{team_id}/disable", response_model=TeamResponse)
def disable_team(
    team_id: int,
    current_user=Depends(require_permission(MANAGE_TEAMS_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = TeamService(db)

    try:
        team = service.disable_team(current_user, team_id)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    return team


@router.patch("/{team_id}/enable", response_model=TeamResponse)
def enable_team(
    team_id: int,
    current_user=Depends(require_permission(MANAGE_TEAMS_PERMISSION)),
    db: Session = Depends(get_db),
):
    service = TeamService(db)

    try:
        team = service.enable_team(current_user, team_id)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )

    return team
