import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import Conversation, Lead, WhatsAppMessage


class WhatsAppService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def ensure_conversation(self, lead: Lead) -> Conversation:
        conversation = self.db.scalar(
            select(Conversation).where(Conversation.lead_id == lead.id)
        )
        if not conversation:
            conversation = Conversation(lead_id=lead.id, channel="whatsapp")
            self.db.add(conversation)
            self.db.flush()
        return conversation

    def store_message(self, lead: Lead, content: str, direction: str, external_id: str = "") -> WhatsAppMessage:
        conversation = self.ensure_conversation(lead)
        now = datetime.now(timezone.utc)
        message = WhatsAppMessage(
            conversation_id=conversation.id,
            lead_id=lead.id,
            direction=direction,
            content=content,
            external_id=external_id or f"mock-{uuid.uuid4()}",
            status="received" if direction == "inbound" else "delivered",
            sent_at=now,
        )
        conversation.last_message_at = now
        if direction == "inbound":
            conversation.unread_count += 1
        lead.last_contacted_at = now
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        return message

    async def send(self, lead: Lead, content: str) -> WhatsAppMessage:
        if self.settings.whatsapp_mode == "real":
            if not self.settings.whatsapp_access_token or not self.settings.whatsapp_phone_number_id:
                raise ValueError("WhatsApp real mode requires access token and phone number ID")
            url = (
                f"https://graph.facebook.com/{self.settings.whatsapp_api_version}/"
                f"{self.settings.whatsapp_phone_number_id}/messages"
            )
            payload = {
                "messaging_product": "whatsapp",
                "to": lead.phone.lstrip("+"),
                "type": "text",
                "text": {"body": content},
            }
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {self.settings.whatsapp_access_token}"},
                    json=payload,
                )
                response.raise_for_status()
                external_id = response.json().get("messages", [{}])[0].get("id", "")
            return self.store_message(lead, content, "outbound", external_id)
        return self.store_message(lead, content, "outbound")
