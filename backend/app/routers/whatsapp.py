from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import ActivityLog, Lead, User
from ..schemas import MessageSend, MockMessage
from ..services.whatsapp_service import WhatsAppService


router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])


@router.get("/webhook", response_class=PlainTextResponse)
def verify_webhook(
    hub_mode: str = Query("", alias="hub.mode"),
    hub_verify_token: str = Query("", alias="hub.verify_token"),
    hub_challenge: str = Query("", alias="hub.challenge"),
):
    settings = get_settings()
    if hub_mode == "subscribe" and hub_verify_token == settings.whatsapp_verify_token:
        return hub_challenge
    raise HTTPException(status_code=403, detail="Webhook verification failed")


@router.post("/webhook")
async def receive_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    stored = 0
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            contacts = value.get("contacts", [])
            contact_name = contacts[0].get("profile", {}).get("name", "WhatsApp Lead") if contacts else "WhatsApp Lead"
            for message in value.get("messages", []):
                phone = message.get("from", "")
                content = message.get("text", {}).get("body", "[Unsupported WhatsApp message]")
                lead = db.scalar(select(Lead).where(Lead.phone.in_([phone, f"+{phone}"])))
                if not lead:
                    lead = Lead(name=contact_name, phone=f"+{phone}" if phone and not phone.startswith("+") else phone, source="WhatsApp", stage="New", score=65, temperature="Warm")
                    db.add(lead)
                    db.flush()
                WhatsAppService(db).store_message(lead, content, "inbound", message.get("id", ""))
                stored += 1
    return {"status": "accepted", "messages_stored": stored}


@router.post("/send")
async def send_message(
    payload: MessageSend,
    user: User = Depends(require_roles("admin", "sales_agent")),
    db: Session = Depends(get_db),
):
    lead = db.get(Lead, payload.lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    try:
        message = await WhatsAppService(db).send(lead, payload.message)
    except (ValueError, Exception) as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    db.add(ActivityLog(user_id=user.id, lead_id=lead.id, action="whatsapp_sent", details=payload.message[:120]))
    db.commit()
    return {"id": message.id, "status": message.status, "mode": get_settings().whatsapp_mode}


@router.post("/mock-message", status_code=201)
def mock_message(
    payload: MockMessage,
    user: User = Depends(require_roles("admin", "sales_agent")),
    db: Session = Depends(get_db),
):
    lead = db.scalar(select(Lead).where(Lead.phone == payload.phone))
    created = False
    if not lead:
        lead = Lead(
            name=payload.name,
            business_name=payload.business_name,
            phone=payload.phone,
            source=payload.source,
            stage="New",
            score=68,
            temperature="Warm",
        )
        db.add(lead)
        db.flush()
        created = True
    message = WhatsAppService(db).store_message(lead, payload.message, "inbound")
    db.add(ActivityLog(user_id=user.id, lead_id=lead.id, action="whatsapp_received", details=payload.message[:120]))
    db.commit()
    return {"lead_id": lead.id, "message_id": message.id, "lead_created": created, "mode": "mock"}


@router.get("/template-example")
def template_example(_: User = Depends(get_current_user)):
    return {
        "messaging_product": "whatsapp",
        "to": "919876543210",
        "type": "template",
        "template": {
            "name": "follow_up_reminder",
            "language": {"code": "en_US"},
            "components": [{"type": "body", "parameters": [{"type": "text", "text": "Aarav"}]}],
        },
    }
