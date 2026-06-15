from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import AutomationLog, User
from ..schemas import AutomationRun, SheetSyncRequest
from ..services.sheets_service import SheetsService


router = APIRouter(prefix="/api", tags=["Integrations & Automation"])


@router.get("/integrations/status")
def integration_status(_: User = Depends(get_current_user)):
    settings = get_settings()
    return {
        "whatsapp": {
            "mode": settings.whatsapp_mode,
            "configured": settings.whatsapp_mode == "mock" or bool(settings.whatsapp_access_token),
        },
        "google_sheets": {
            "mode": settings.google_sheets_mode,
            "configured": settings.google_sheets_mode == "csv" or bool(settings.google_service_account_file),
        },
        "ai": {
            "provider": settings.ai_provider,
            "configured": settings.ai_provider == "mock" or bool(settings.ai_api_key),
        },
    }


@router.post("/sheets/sync")
def sync_sheets(
    payload: SheetSyncRequest,
    _: User = Depends(require_roles("admin", "sales_agent")),
    db: Session = Depends(get_db),
):
    return SheetsService(db).sync(payload.spreadsheet_id)


@router.get("/sheets/preview")
def sheets_preview(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = SheetsService(db)
    return {"headers": service.lead_rows() and [
        "Lead ID", "Name", "Business", "Phone", "Email", "Source", "Stage",
        "Status", "Value", "Score", "Owner ID", "Created At", "Next Follow-up",
    ], "rows": service.lead_rows()[:8]}


@router.get("/automation/rules")
def automation_rules(_: User = Depends(get_current_user)):
    return [
        {"id": 1, "name": "Daily follow-up reminders", "trigger": "Every day at 09:00", "action": "Create owner reminder digest", "enabled": True},
        {"id": 2, "name": "Stale lead detector", "trigger": "No activity for 5 days", "action": "Flag risk and create AI next action", "enabled": True},
        {"id": 3, "name": "New WhatsApp lead routing", "trigger": "Inbound message from unknown number", "action": "Create lead and assign round-robin", "enabled": True},
        {"id": 4, "name": "Sheets snapshot", "trigger": "Every 6 hours", "action": "Sync leads and follow-ups", "enabled": False},
    ]


@router.post("/automation/run")
def run_automation(
    payload: AutomationRun,
    _: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    log = AutomationLog(
        automation_name=payload.automation_name,
        status="success",
        records_processed=len(payload.parameters) or 1,
        details=f"Manual demo run with parameters: {payload.parameters}",
        ran_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"id": log.id, "status": log.status, "ran_at": log.ran_at}
