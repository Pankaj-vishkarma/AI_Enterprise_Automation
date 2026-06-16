from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission, RESEARCH_ACCESS_PERMISSION
from app.schemas.research import ResearchMetrics, ResearchReportResponse, ResearchRunRequest
from app.services.export_service import ExportService
from app.services.research_service import ResearchService

router = APIRouter(prefix="/api/v1/research", tags=["research"])


@router.get("/templates")
def get_templates(current_user=Depends(require_permission(RESEARCH_ACCESS_PERMISSION)), db: Session = Depends(get_db)):
    return ResearchService(db).get_templates()


@router.get("/metrics", response_model=ResearchMetrics)
def get_metrics(current_user=Depends(require_permission(RESEARCH_ACCESS_PERMISSION)), db: Session = Depends(get_db)):
    return ResearchService(db).get_metrics(current_user)


@router.get("", response_model=List[ResearchReportResponse])
def list_reports(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(require_permission(RESEARCH_ACCESS_PERMISSION)),
    db: Session = Depends(get_db),
):
    return ResearchService(db).list_reports(current_user, limit=limit, offset=offset)


@router.post("/run", response_model=ResearchReportResponse)
def run_research(
    payload: ResearchRunRequest,
    current_user=Depends(require_permission(RESEARCH_ACCESS_PERMISSION)),
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
    current_user=Depends(require_permission(RESEARCH_ACCESS_PERMISSION)),
    db: Session = Depends(get_db),
):
    try:
        result = ResearchService(db).get_report(current_user, report_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return result


@router.get("/{report_id}/export")
def export_report(
    report_id: int,
    format: str = Query(default="pdf", alias="format"),
    current_user=Depends(require_permission(RESEARCH_ACCESS_PERMISSION)),
    db: Session = Depends(get_db),
):
    if format not in {"pdf", "xlsx"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="format must be pdf or xlsx")
    try:
        report = ResearchService(db).get_report(current_user, report_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    exporter = ExportService()
    filename = f"research_{report_id}.{format}"
    if format == "pdf":
        content = exporter.research_report_pdf(report)
        media_type = "application/pdf"
    else:
        content = exporter.research_report_xlsx(report)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    current_user=Depends(require_permission(RESEARCH_ACCESS_PERMISSION)),
    db: Session = Depends(get_db),
):
    try:
        result = ResearchService(db).delete_report(current_user, report_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return result
