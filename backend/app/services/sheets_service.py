import csv
from datetime import datetime, timezone
from pathlib import Path

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import PROJECT_DIR, get_settings
from ..models import AutomationLog, FollowUp, Lead


LEAD_HEADERS = [
    "Lead ID", "Name", "Business", "Phone", "Email", "Source", "Stage",
    "Status", "Value", "Score", "Owner ID", "Created At", "Next Follow-up",
]


class SheetsService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def lead_rows(self) -> list[list]:
        leads = self.db.scalars(select(Lead).order_by(Lead.created_at.desc())).all()
        return [
            [
                lead.id, lead.name, lead.business_name, lead.phone, lead.email,
                lead.source, lead.stage, lead.status, lead.value, lead.score,
                lead.owner_id or "", lead.created_at.isoformat(),
                lead.next_follow_up.isoformat() if lead.next_follow_up else "",
            ]
            for lead in leads
        ]

    def export_csv(self, output_dir: Path | None = None) -> Path:
        target_dir = output_dir or PROJECT_DIR / "exports"
        target_dir.mkdir(parents=True, exist_ok=True)
        path = target_dir / f"clientpulse_leads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(LEAD_HEADERS)
            writer.writerows(self.lead_rows())
        self._log("Google Sheets / CSV export", "success", len(self.lead_rows()), str(path))
        return path

    def sync(self, spreadsheet_id: str | None = None) -> dict:
        sheet_id = spreadsheet_id or self.settings.google_spreadsheet_id
        if (
            self.settings.google_sheets_mode == "google"
            and self.settings.google_service_account_file
            and sheet_id
        ):
            credentials = Credentials.from_service_account_file(
                self.settings.google_service_account_file,
                scopes=["https://www.googleapis.com/auth/spreadsheets"],
            )
            service = build("sheets", "v4", credentials=credentials)
            values = [LEAD_HEADERS, *self.lead_rows()]
            service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range="Leads!A1",
                valueInputOption="USER_ENTERED",
                body={"values": values},
            ).execute()
            self._log("Google Sheets sync", "success", len(values) - 1, f"Spreadsheet {sheet_id}")
            return {"mode": "google", "status": "synced", "records": len(values) - 1, "spreadsheet_id": sheet_id}
        path = self.export_csv()
        return {"mode": "csv", "status": "exported", "records": len(self.lead_rows()), "path": str(path)}

    def followup_rows(self) -> list[list]:
        followups = self.db.scalars(select(FollowUp).order_by(FollowUp.due_at)).all()
        return [
            [item.id, item.lead_id, item.due_at.isoformat(), item.type, item.status, item.note]
            for item in followups
        ]

    def _log(self, name: str, status: str, records: int, details: str) -> None:
        self.db.add(
            AutomationLog(
                automation_name=name,
                status=status,
                records_processed=records,
                details=details,
                ran_at=datetime.now(timezone.utc),
            )
        )
        self.db.commit()
