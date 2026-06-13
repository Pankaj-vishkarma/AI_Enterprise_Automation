from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission, ANALYTICS_VIEW_PERMISSION
from app.schemas.analytics import AnalyticsDashboardResponse, AnalyticsReportResponse
from app.services.analytics_service import AnalyticsService
from app.services.export_service import ExportService

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=AnalyticsDashboardResponse)
def analytics_dashboard(
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    current_user=Depends(require_permission(ANALYTICS_VIEW_PERMISSION)),
    db: Session = Depends(get_db),
):
    return AnalyticsService(db).get_dashboard(current_user, start_date, end_date)


@router.get("/reports/{report_type}", response_model=AnalyticsReportResponse)
def analytics_report(
    report_type: str,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    format: str = Query(default="markdown", alias="format"),
    current_user=Depends(require_permission(ANALYTICS_VIEW_PERMISSION)),
    db: Session = Depends(get_db),
):
    if report_type not in {"executive", "operational", "business"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="report_type must be executive, operational, or business",
        )
    if format not in {"markdown", "json"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="format must be markdown or json",
        )
    try:
        return AnalyticsService(db).generate_report(
            current_user, report_type, start_date, end_date, fmt=format
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/reports/{report_type}/export")
def export_analytics_report(
    report_type: str,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    format: str = Query(default="pdf", alias="format"),
    current_user=Depends(require_permission(ANALYTICS_VIEW_PERMISSION)),
    db: Session = Depends(get_db),
):
    if report_type not in {"executive", "operational", "business"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="report_type must be executive, operational, or business",
        )
    if format not in {"pdf", "xlsx"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="format must be pdf or xlsx")
    service = AnalyticsService(db)
    report = service.generate_report(current_user, report_type, start_date, end_date, fmt="markdown")
    dashboard = service.get_dashboard(current_user, start_date, end_date)
    exporter = ExportService()
    filename = f"analytics_{report_type}.{format}"
    if format == "pdf":
        content = exporter.analytics_report_pdf(report.get("title", report_type), report.get("content", ""))
        media_type = "application/pdf"
    else:
        content = exporter.analytics_report_xlsx(report_type, dashboard)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
