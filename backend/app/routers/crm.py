from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import (
    ActivityLog,
    AISuggestion,
    AutomationLog,
    Contact,
    Conversation,
    FollowUp,
    Lead,
    Note,
    PipelineStage,
    Task,
    User,
    WhatsAppMessage,
)
from ..schemas import (
    FollowUpCreate,
    FollowUpOut,
    LeadCreate,
    LeadOut,
    LeadUpdate,
    NoteCreate,
    StageMove,
    TaskCreate,
    UserOut,
)


router = APIRouter(prefix="/api", tags=["CRM"])


def record_activity(db: Session, user: User, action: str, lead_id: int | None = None, details: str = ""):
    db.add(ActivityLog(user_id=user.id, lead_id=lead_id, action=action, details=details))


def get_lead_or_404(db: Session, lead_id: int) -> Lead:
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.get("/dashboard")
def dashboard(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    start_today = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    end_today = start_today + timedelta(days=1)
    leads = db.scalars(select(Lead)).all()
    followups = db.scalars(select(FollowUp)).all()
    messages = db.scalars(select(WhatsAppMessage)).all()
    users = {user.id: user.name for user in db.scalars(select(User)).all()}
    won = [lead for lead in leads if lead.stage == "Won"]
    open_leads = [lead for lead in leads if lead.stage not in {"Won", "Lost"}]
    stage_counts = Counter(lead.stage for lead in leads)
    source_counts = Counter(lead.source for lead in leads)
    agent_stats = defaultdict(lambda: {"leads": 0, "won": 0, "pipeline": 0})
    for lead in leads:
        key = users.get(lead.owner_id, "Unassigned")
        agent_stats[key]["leads"] += 1
        agent_stats[key]["pipeline"] += lead.value if lead.stage not in {"Lost"} else 0
        agent_stats[key]["won"] += int(lead.stage == "Won")
    outbound = [item for item in messages if item.direction == "outbound"]
    return {
        "metrics": {
            "total_leads": len(leads),
            "new_leads_today": sum(start_today <= _aware(lead.created_at) < end_today for lead in leads),
            "followups_due_today": sum(
                start_today <= _aware(item.due_at) < end_today and item.status == "pending" for item in followups
            ),
            "overdue_followups": sum(_aware(item.due_at) < now and item.status == "pending" for item in followups),
            "conversion_rate": round(len(won) / len(leads) * 100, 1) if leads else 0,
            "pipeline_value": sum(lead.value for lead in open_leads),
            "whatsapp_response_status": round(
                sum(item.status in {"delivered", "read"} for item in outbound) / len(outbound) * 100, 1
            ) if outbound else 0,
            "sheets_sync_status": "Healthy",
            "ai_suggestions_generated": len(db.scalars(select(AISuggestion)).all()),
        },
        "pipeline": [{"stage": stage, "count": stage_counts.get(stage, 0)} for stage in ["New", "Contacted", "Interested", "Demo Scheduled", "Won", "Lost"]],
        "sources": [{"source": source, "count": count} for source, count in source_counts.most_common()],
        "agents": [{"name": name, **stats} for name, stats in agent_stats.items()],
        "recent_activity": _activity_rows(db, 8),
    }


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _activity_rows(db: Session, limit: int = 50):
    rows = db.scalars(select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit)).all()
    return [
        {"id": row.id, "action": row.action, "details": row.details, "lead_id": row.lead_id, "created_at": row.created_at}
        for row in rows
    ]


@router.get("/pipeline")
def pipeline(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stages = db.scalars(select(PipelineStage).order_by(PipelineStage.position)).all()
    leads = db.scalars(select(Lead).order_by(Lead.updated_at.desc())).all()
    return [
        {
            "id": stage.id,
            "name": stage.name,
            "color": stage.color,
            "probability": stage.probability,
            "leads": [LeadOut.model_validate(lead) for lead in leads if lead.stage == stage.name],
        }
        for stage in stages
    ]


@router.get("/leads", response_model=list[LeadOut])
def list_leads(
    search: str = "",
    stage: str = "",
    source: str = "",
    sort: str = "-created_at",
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Lead)
    if search:
        term = f"%{search}%"
        query = query.where(or_(Lead.name.ilike(term), Lead.business_name.ilike(term), Lead.phone.ilike(term)))
    if stage:
        query = query.where(Lead.stage == stage)
    if source:
        query = query.where(Lead.source == source)
    sort_map = {
        "name": Lead.name.asc(),
        "-name": Lead.name.desc(),
        "value": Lead.value.asc(),
        "-value": Lead.value.desc(),
        "created_at": Lead.created_at.asc(),
        "-created_at": Lead.created_at.desc(),
        "score": Lead.score.asc(),
        "-score": Lead.score.desc(),
    }
    return db.scalars(query.order_by(sort_map.get(sort, Lead.created_at.desc()))).all()


@router.post("/leads", response_model=LeadOut, status_code=201)
def create_lead(
    payload: LeadCreate,
    user: User = Depends(require_roles("admin", "sales_agent")),
    db: Session = Depends(get_db),
):
    lead = Lead(**payload.model_dump(), score=50, temperature="Warm")
    db.add(lead)
    db.flush()
    db.add(Contact(lead_id=lead.id, name=lead.name, phone=lead.phone, email=lead.email, is_primary=True))
    record_activity(db, user, "lead_created", lead.id, f"{lead.name} added from {lead.source}")
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/leads/{lead_id}")
def get_lead(lead_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lead = get_lead_or_404(db, lead_id)
    notes = db.scalars(select(Note).where(Note.lead_id == lead_id).order_by(Note.created_at.desc())).all()
    followups = db.scalars(select(FollowUp).where(FollowUp.lead_id == lead_id).order_by(FollowUp.due_at)).all()
    messages = db.scalars(select(WhatsAppMessage).where(WhatsAppMessage.lead_id == lead_id).order_by(WhatsAppMessage.sent_at)).all()
    suggestions = db.scalars(select(AISuggestion).where(AISuggestion.lead_id == lead_id).order_by(AISuggestion.created_at.desc())).all()
    owner = db.get(User, lead.owner_id) if lead.owner_id else None
    return {
        "lead": LeadOut.model_validate(lead),
        "owner": UserOut.model_validate(owner) if owner else None,
        "notes": [{"id": n.id, "content": n.content, "created_at": n.created_at} for n in notes],
        "followups": [FollowUpOut.model_validate(item) for item in followups],
        "messages": [{"id": m.id, "direction": m.direction, "content": m.content, "status": m.status, "sent_at": m.sent_at} for m in messages],
        "suggestions": [{"id": s.id, "type": s.suggestion_type, "content": s.content, "confidence": s.confidence, "created_at": s.created_at} for s in suggestions],
    }


@router.patch("/leads/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    user: User = Depends(require_roles("admin", "sales_agent")),
    db: Session = Depends(get_db),
):
    lead = get_lead_or_404(db, lead_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(lead, key, value)
    record_activity(db, user, "lead_updated", lead.id, "Lead details updated")
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/leads/{lead_id}/move", response_model=LeadOut)
def move_lead(
    lead_id: int,
    payload: StageMove,
    user: User = Depends(require_roles("admin", "sales_agent")),
    db: Session = Depends(get_db),
):
    if not db.scalar(select(PipelineStage).where(PipelineStage.name == payload.stage)):
        raise HTTPException(status_code=400, detail="Unknown pipeline stage")
    lead = get_lead_or_404(db, lead_id)
    previous = lead.stage
    lead.stage = payload.stage
    lead.status = "Closed" if payload.stage in {"Won", "Lost"} else "Open"
    record_activity(db, user, "stage_changed", lead.id, f"{previous} to {payload.stage}")
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/leads/{lead_id}/notes", status_code=201)
def add_note(
    lead_id: int,
    payload: NoteCreate,
    user: User = Depends(require_roles("admin", "sales_agent")),
    db: Session = Depends(get_db),
):
    get_lead_or_404(db, lead_id)
    note = Note(lead_id=lead_id, author_id=user.id, content=payload.content)
    db.add(note)
    record_activity(db, user, "note_added", lead_id, payload.content[:100])
    db.commit()
    db.refresh(note)
    return {"id": note.id, "content": note.content, "created_at": note.created_at}


@router.get("/followups", response_model=list[FollowUpOut])
def list_followups(status: str = "", _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = select(FollowUp).order_by(FollowUp.due_at)
    if status:
        query = query.where(FollowUp.status == status)
    return db.scalars(query).all()


@router.post("/followups", response_model=FollowUpOut, status_code=201)
def create_followup(
    payload: FollowUpCreate,
    user: User = Depends(require_roles("admin", "sales_agent")),
    db: Session = Depends(get_db),
):
    lead = get_lead_or_404(db, payload.lead_id)
    followup = FollowUp(
        **payload.model_dump(exclude={"owner_id"}),
        owner_id=payload.owner_id or user.id,
    )
    lead.next_follow_up = payload.due_at
    db.add(followup)
    record_activity(db, user, "followup_scheduled", lead.id, f"{payload.type} at {payload.due_at.isoformat()}")
    db.commit()
    db.refresh(followup)
    return followup


@router.post("/followups/{followup_id}/complete", response_model=FollowUpOut)
def complete_followup(
    followup_id: int,
    user: User = Depends(require_roles("admin", "sales_agent")),
    db: Session = Depends(get_db),
):
    followup = db.get(FollowUp, followup_id)
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    followup.status = "completed"
    followup.completed_at = datetime.now(timezone.utc)
    record_activity(db, user, "followup_completed", followup.lead_id, followup.note[:100])
    db.commit()
    db.refresh(followup)
    return followup


@router.get("/tasks")
def list_tasks(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.scalars(select(Task).order_by(Task.due_date, Task.created_at.desc())).all()
    return [{"id": t.id, "title": t.title, "description": t.description, "lead_id": t.lead_id, "owner_id": t.owner_id, "due_date": t.due_date, "priority": t.priority, "status": t.status} for t in tasks]


@router.post("/tasks", status_code=201)
def create_task(
    payload: TaskCreate,
    user: User = Depends(require_roles("admin", "sales_agent")),
    db: Session = Depends(get_db),
):
    task = Task(
        **payload.model_dump(exclude={"owner_id"}),
        owner_id=payload.owner_id or user.id,
    )
    db.add(task)
    record_activity(db, user, "task_created", payload.lead_id, payload.title)
    db.commit()
    db.refresh(task)
    return {"id": task.id, "title": task.title, "status": task.status}


@router.patch("/tasks/{task_id}")
def update_task(
    task_id: int,
    status: str = Query(...),
    user: User = Depends(require_roles("admin", "sales_agent")),
    db: Session = Depends(get_db),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = status
    record_activity(db, user, "task_updated", task.lead_id, f"{task.title}: {status}")
    db.commit()
    return {"id": task.id, "status": task.status}


@router.get("/contacts")
def contacts(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Contact).order_by(Contact.created_at.desc())).all()
    return [{"id": row.id, "lead_id": row.lead_id, "name": row.name, "phone": row.phone, "email": row.email, "designation": row.designation} for row in rows]


@router.get("/conversations")
def conversations(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Conversation).order_by(Conversation.last_message_at.desc())).all()
    return [
        {
            "id": row.id,
            "lead_id": row.lead_id,
            "lead_name": row.lead.name,
            "business_name": row.lead.business_name,
            "phone": row.lead.phone,
            "unread_count": row.unread_count,
            "last_message_at": row.last_message_at,
            "messages": [
                {"id": item.id, "direction": item.direction, "content": item.content, "status": item.status, "sent_at": item.sent_at}
                for item in db.scalars(select(WhatsAppMessage).where(WhatsAppMessage.conversation_id == row.id).order_by(WhatsAppMessage.sent_at)).all()
            ],
        }
        for row in rows
    ]


@router.get("/users", response_model=list[UserOut])
def users(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(User).where(User.active.is_(True)).order_by(User.name)).all()


@router.get("/activity-logs")
def activity_logs(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _activity_rows(db)


@router.get("/automation-logs")
def automation_logs(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(AutomationLog).order_by(AutomationLog.ran_at.desc()).limit(100)).all()
    return [{"id": row.id, "automation_name": row.automation_name, "status": row.status, "records_processed": row.records_processed, "details": row.details, "ran_at": row.ran_at} for row in rows]
