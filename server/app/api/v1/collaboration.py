from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import COLLABORATION_USE_PERMISSION, require_permission
from app.schemas.collaboration import (
    CollaborationMetrics,
    CollaborationRunRequest,
    CollaborationRunResponse,
    CollaborationTeamCreate,
    CollaborationTeamResponse,
    CollaborationTeamUpdate,
)
from app.services.collaboration_service import CollaborationService

router = APIRouter(prefix="/api/v1/collaboration", tags=["collaboration"])

require_collaboration_use = require_permission(COLLABORATION_USE_PERMISSION)


def _permission_error(exc: PermissionError):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get("/teams", response_model=List[CollaborationTeamResponse])
def list_teams(current_user=Depends(require_collaboration_use), db: Session = Depends(get_db)):
    return CollaborationService(db).list_teams(current_user)


@router.post("/teams", response_model=CollaborationTeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    payload: CollaborationTeamCreate,
    current_user=Depends(require_collaboration_use),
    db: Session = Depends(get_db),
):
    try:
        return CollaborationService(db).create_team(current_user, payload.model_dump())
    except PermissionError as exc:
        _permission_error(exc)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/teams/{team_id}", response_model=CollaborationTeamResponse)
def get_team(
    team_id: int,
    current_user=Depends(require_collaboration_use),
    db: Session = Depends(get_db),
):
    result = CollaborationService(db).get_team(current_user, team_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return result


@router.patch("/teams/{team_id}", response_model=CollaborationTeamResponse)
def update_team(
    team_id: int,
    payload: CollaborationTeamUpdate,
    current_user=Depends(require_collaboration_use),
    db: Session = Depends(get_db),
):
    try:
        result = CollaborationService(db).update_team(
            current_user, team_id, payload.model_dump(exclude_unset=True)
        )
    except PermissionError as exc:
        _permission_error(exc)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return result


@router.delete("/teams/{team_id}")
def delete_team(
    team_id: int,
    current_user=Depends(require_collaboration_use),
    db: Session = Depends(get_db),
):
    try:
        result = CollaborationService(db).delete_team(current_user, team_id)
    except PermissionError as exc:
        _permission_error(exc)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return result


@router.post("/run", response_model=CollaborationRunResponse)
def run_collaboration(
    payload: CollaborationRunRequest,
    current_user=Depends(require_collaboration_use),
    db: Session = Depends(get_db),
):
    try:
        result = CollaborationService(db).run_collaboration(
            current_user, payload.team_id, payload.task
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except PermissionError as exc:
        _permission_error(exc)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return result


@router.get("/runs", response_model=List[CollaborationRunResponse])
def list_runs(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(require_collaboration_use),
    db: Session = Depends(get_db),
):
    return CollaborationService(db).list_runs(current_user, limit=limit, offset=offset)


@router.get("/runs/{run_id}", response_model=CollaborationRunResponse)
def get_run(
    run_id: int,
    current_user=Depends(require_collaboration_use),
    db: Session = Depends(get_db),
):
    try:
        result = CollaborationService(db).get_run(current_user, run_id)
    except PermissionError as exc:
        _permission_error(exc)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return result


@router.get("/metrics", response_model=CollaborationMetrics)
def get_metrics(current_user=Depends(require_collaboration_use), db: Session = Depends(get_db)):
    return CollaborationService(db).get_metrics(current_user)
