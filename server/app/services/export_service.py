import io
from typing import Any, Dict, List

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


class ExportService:
    @staticmethod
    def _pdf_bytes(title: str, sections: List[tuple[str, str]]) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = [Paragraph(title, styles["Title"]), Spacer(1, 12)]
        for heading, body in sections:
            if heading:
                story.append(Paragraph(heading, styles["Heading2"]))
                story.append(Spacer(1, 6))
            for line in (body or "").splitlines():
                if line.strip():
                    story.append(Paragraph(line.replace("&", "&amp;"), styles["BodyText"]))
            story.append(Spacer(1, 10))
        doc.build(story)
        buffer.seek(0)
        return buffer.read()

    @staticmethod
    def _xlsx_bytes(sheets: Dict[str, List[List[Any]]]) -> bytes:
        from openpyxl import Workbook

        workbook = Workbook()
        workbook.remove(workbook.active)
        for sheet_name, rows in sheets.items():
            ws = workbook.create_sheet(title=sheet_name[:31] or "Sheet1")
            for row in rows:
                ws.append(row)
        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)
        return buffer.read()

    def research_report_pdf(self, report: dict) -> bytes:
        sections = [
            ("Summary", report.get("summary") or ""),
            ("Final Report", report.get("final_report") or ""),
            ("Recommendations", report.get("recommendations") or ""),
        ]
        return self._pdf_bytes(report.get("title") or "Research Report", sections)

    def research_report_xlsx(self, report: dict) -> bytes:
        rows = [
            ["Field", "Value"],
            ["Title", report.get("title")],
            ["Type", report.get("research_type")],
            ["Status", report.get("status")],
            ["Summary", report.get("summary")],
            ["Recommendations", report.get("recommendations")],
            ["Final Report", report.get("final_report")],
        ]
        return self._xlsx_bytes({"Report": rows})

    def analytics_report_pdf(self, title: str, markdown_body: str) -> bytes:
        return self._pdf_bytes(title, [("Report", markdown_body)])

    def analytics_report_xlsx(self, title: str, dashboard: dict) -> bytes:
        rows = [["Section", "Metric", "Value"]]
        for section, payload in (dashboard or {}).items():
            if isinstance(payload, dict):
                for key, value in payload.items():
                    if isinstance(value, (str, int, float, bool)) or value is None:
                        rows.append([section, key, value])
        return self._xlsx_bytes({title[:31]: rows})
