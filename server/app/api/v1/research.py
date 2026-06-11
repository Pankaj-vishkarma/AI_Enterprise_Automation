from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.schemas.research import ResearchMetrics, ResearchReportResponse, ResearchRunRequest
from app.services.research_service import ResearchService

router = APIRouter(prefix="/api/v1/research", tags=["research"])


@router.get("/templates")
def get_templates(current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    return ResearchService(db).get_templates()


@router.get("/metrics", response_model=ResearchMetrics)
def get_metrics(current_user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    return ResearchService(db).get_metrics(current_user)


@router.get("", response_model=List[ResearchReportResponse])
def list_reports(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return ResearchService(db).list_reports(current_user, limit=limit, offset=offset)


@router.post("/run", response_model=ResearchReportResponse)
def run_research(
    payload: ResearchRunRequest,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return ResearchService(db).run_research(
        current_user,
        payload.request_text,
        payload.research_type,
        payload.title,
        payload.use_browser,
    )


@router.get("/{report_id}", response_model=ResearchReportResponse)
def get_report(
    report_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    result = ResearchService(db).get_report(current_user, report_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return result


@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    result = ResearchService(db).delete_report(current_user, report_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return result
