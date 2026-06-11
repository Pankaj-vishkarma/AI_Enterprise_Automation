from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.schemas.operations import (
    AnalyticsResponse,
    AgentTaskRequest,
    CollaborationRequest,
    OperationalRecordCreate,
    OperationalRecordResponse,
    OperationalRecordUpdate,
    ReasoningRequest,
    VoiceQueryRequest,
)
from app.services.operations_service import OperationsService

router = APIRouter(prefix="/api/v1", tags=["operations"])


@router.get("/operations/{module}", response_model=List[OperationalRecordResponse])
def list_records(module: str, current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    try:
        return OperationsService(db).list(current_user, module)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/operations/{module}", response_model=OperationalRecordResponse)
def create_record(module: str, payload: OperationalRecordCreate, current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    try:
        return OperationsService(db).create(current_user, module, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/operations/{module}/{record_id}", response_model=OperationalRecordResponse)
def update_record(module: str, record_id: int, payload: OperationalRecordUpdate, current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    try:
        result = OperationsService(db).update(current_user, module, record_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return result


@router.post("/collaboration/run", response_model=OperationalRecordResponse)
def run_collaboration(payload: CollaborationRequest, current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    return OperationsService(db).run_collaboration(current_user, payload.prompt, payload.team)


@router.post("/ai-employees/{employee_id}/run")
def run_ai_employee(employee_id: int, payload: AgentTaskRequest, current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    result = OperationsService(db).run_ai_employee(current_user, employee_id, payload.task)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI employee not found")
    return result


@router.post("/{module}/run", response_model=OperationalRecordResponse)
def run_reasoning(module: str, payload: ReasoningRequest, current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    try:
        return OperationsService(db).run_reasoning(current_user, module, payload.prompt)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/voice/query", response_model=OperationalRecordResponse)
def voice_query(payload: VoiceQueryRequest, current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    return OperationsService(db).voice_query(current_user, payload.transcript, payload.top_k)


@router.get("/analytics/overview", response_model=AnalyticsResponse)
def analytics_overview(current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    return OperationsService(db).analytics(current_user)
