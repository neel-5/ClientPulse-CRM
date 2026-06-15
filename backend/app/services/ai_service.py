from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import AISuggestion, Lead, WhatsAppMessage


class AIService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def score_lead(self, lead: Lead) -> dict:
        score = 35
        score += min(int(lead.value / 2500), 25)
        score += 18 if lead.source in {"Referral", "WhatsApp"} else 10
        score += {"New": 3, "Contacted": 8, "Interested": 18, "Demo Scheduled": 25, "Won": 30}.get(lead.stage, 0)
        score = max(1, min(score, 99))
        lead.score = score
        lead.temperature = "Hot" if score >= 80 else "Warm" if score >= 55 else "Cold"
        content = f"{lead.temperature} lead ({score}/100). Prioritize based on stage, value, and source intent."
        suggestion = self._save(lead.id, "lead_score", content, 0.86)
        self.db.commit()
        return {"score": score, "temperature": lead.temperature, "reasoning": content, "suggestion_id": suggestion.id, "provider": self.settings.ai_provider}

    def reply_draft(self, lead: Lead, context: str = "") -> dict:
        business_reference = lead.business_name or "your team"
        draft = (
            f"Hi {lead.name.split()[0]}, thanks for your message. "
            f"ClientPulse can help {business_reference} keep enquiries assigned, "
            "follow-ups visible, and reporting in one place. "
            "I can share a focused walkthrough and a simple rollout plan. "
            "Would today afternoon or tomorrow morning work better?"
        )
        suggestion = self._save(lead.id, "reply_draft", draft, 0.9)
        self.db.commit()
        return {"draft": draft, "tone": "consultative", "suggestion_id": suggestion.id, "provider": self.settings.ai_provider}

    def summary(self, lead: Lead) -> dict:
        messages = self.db.scalars(
            select(WhatsAppMessage)
            .where(WhatsAppMessage.lead_id == lead.id)
            .order_by(WhatsAppMessage.sent_at.asc())
        ).all()
        summary = (
            f"{lead.name} from {lead.business_name or 'their business'} is a {lead.temperature.lower()} "
            f"{lead.source.lower()} lead in {lead.stage}. {len(messages)} WhatsApp messages are recorded. "
            f"Estimated opportunity value is INR {lead.value:,.0f}."
        )
        suggestion = self._save(lead.id, "conversation_summary", summary, 0.84)
        self.db.commit()
        return {"summary": summary, "suggestion_id": suggestion.id}

    def next_action(self, lead: Lead) -> dict:
        actions = {
            "New": "Send a personalized WhatsApp introduction and qualify the primary need.",
            "Contacted": "Ask one outcome-focused question and schedule a short discovery call.",
            "Interested": "Share a relevant proof point and propose two demo slots.",
            "Demo Scheduled": "Confirm attendees, agenda, and decision criteria before the demo.",
            "Won": "Start onboarding and request a success baseline.",
            "Lost": "Record the loss reason and schedule a low-frequency nurture touch.",
        }
        action = actions.get(lead.stage, "Review recent activity and make a personal follow-up.")
        suggestion = self._save(lead.id, "next_best_action", action, 0.87)
        self.db.commit()
        return {"action": action, "suggestion_id": suggestion.id}

    def risk_note(self, lead: Lead) -> dict:
        last = lead.last_contacted_at
        if last:
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            days = (datetime.now(timezone.utc) - last).days
        else:
            days = 99
        risk = "high" if days >= 7 else "medium" if days >= 3 else "low"
        note = (
            f"{risk.title()} response risk: last contact was {days} day(s) ago. "
            + ("Use a short value-led re-engagement message." if risk != "low" else "Momentum is healthy; keep the agreed follow-up.")
        )
        suggestion = self._save(lead.id, "risk_note", note, 0.82)
        self.db.commit()
        return {"risk": risk, "note": note, "suggestion_id": suggestion.id}

    def _save(self, lead_id: int, kind: str, content: str, confidence: float) -> AISuggestion:
        suggestion = AISuggestion(
            lead_id=lead_id,
            suggestion_type=kind,
            content=content,
            confidence=confidence,
        )
        self.db.add(suggestion)
        self.db.flush()
        return suggestion
