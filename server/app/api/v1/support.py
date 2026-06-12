from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.schemas.support import (
    SUPPORT_CATEGORIES,
    SupportAssignRequest,
    SupportEscalateRequest,
    SupportMetricsResponse,
    SupportTicketCreate,
    SupportTicketResponse,
    SupportTicketUpdate,
)
from app.services.support_service import SupportService

router = APIRouter(prefix="/api/v1/support", tags=["support"])


@router.get("/categories", response_model=List[str])
def list_categories():
    return SUPPORT_CATEGORIES


@router.get("/tickets", response_model=List[SupportTicketResponse])
def list_tickets(
    status: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    open_only: bool = Query(default=False),
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return SupportService(db).list_tickets(
        current_user, status=status, category=category, open_only=open_only
    )


@router.get("/tickets/{ticket_id}", response_model=SupportTicketResponse)
def get_ticket(
    ticket_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    ticket = SupportService(db).get_ticket(current_user, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.post("/tickets", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: SupportTicketCreate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return SupportService(db).create_ticket(current_user, payload.model_dump())


@router.patch("/tickets/{ticket_id}", response_model=SupportTicketResponse)
def update_ticket(
    ticket_id: int,
    payload: SupportTicketUpdate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    ticket = SupportService(db).update_ticket(
        current_user, ticket_id, payload.model_dump(exclude_unset=True)
    )
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.post("/tickets/{ticket_id}/assign", response_model=SupportTicketResponse)
def assign_ticket(
    ticket_id: int,
    payload: SupportAssignRequest,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        ticket = SupportService(db).assign_ticket(
            current_user, ticket_id, payload.model_dump(exclude_unset=True)
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.post("/tickets/{ticket_id}/escalate", response_model=SupportTicketResponse)
def escalate_ticket(
    ticket_id: int,
    payload: SupportEscalateRequest,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    ticket = SupportService(db).escalate_ticket(current_user, ticket_id, payload.reason)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.post("/tickets/{ticket_id}/close", response_model=SupportTicketResponse)
def close_ticket(
    ticket_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    ticket = SupportService(db).close_ticket(current_user, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.post("/tickets/{ticket_id}/reopen", response_model=SupportTicketResponse)
def reopen_ticket(
    ticket_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    ticket = SupportService(db).reopen_ticket(current_user, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.post("/tickets/{ticket_id}/recommend", response_model=SupportTicketResponse)
def regenerate_recommendation(
    ticket_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    ticket = SupportService(db).regenerate_recommendation(current_user, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.get("/metrics", response_model=SupportMetricsResponse)
def support_metrics(
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return SupportService(db).get_metrics(current_user)
