from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import AISuggestion, Lead, User
from ..schemas import AIRequest
from ..services.ai_service import AIService


router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])


def lead_or_404(db: Session, lead_id: int) -> Lead:
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.get("/suggestions")
def suggestions(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(AISuggestion).order_by(AISuggestion.created_at.desc()).limit(100)).all()
    return [{"id": row.id, "lead_id": row.lead_id, "type": row.suggestion_type, "content": row.content, "confidence": row.confidence, "created_at": row.created_at} for row in rows]


@router.post("/score")
def score(payload: AIRequest, _: User = Depends(require_roles("admin", "sales_agent")), db: Session = Depends(get_db)):
    return AIService(db).score_lead(lead_or_404(db, payload.lead_id))


@router.post("/reply")
def reply(payload: AIRequest, _: User = Depends(require_roles("admin", "sales_agent")), db: Session = Depends(get_db)):
    return AIService(db).reply_draft(lead_or_404(db, payload.lead_id), payload.context)


@router.post("/summary")
def summary(payload: AIRequest, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return AIService(db).summary(lead_or_404(db, payload.lead_id))


@router.post("/next-action")
def next_action(payload: AIRequest, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return AIService(db).next_action(lead_or_404(db, payload.lead_id))


@router.post("/risk")
def risk(payload: AIRequest, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return AIService(db).risk_note(lead_or_404(db, payload.lead_id))
