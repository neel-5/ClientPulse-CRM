from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    ActivityLog,
    AISuggestion,
    AutomationLog,
    Conversation,
    FollowUp,
    Lead,
    Note,
    PipelineStage,
    Task,
    User,
    WhatsAppMessage,
)
from .security import hash_password


STAGES = [
    ("New", "#5b8def", 1, 10),
    ("Contacted", "#8b5cf6", 2, 25),
    ("Interested", "#f59e0b", 3, 50),
    ("Demo Scheduled", "#ec4899", 4, 70),
    ("Won", "#10b981", 5, 100),
    ("Lost", "#64748b", 6, 0),
]

LEADS = [
    ("Aarav Mehta", "Mehta Dental Studio", "+919810000101", "aarav@example.com", "WhatsApp", "Interested", 45000, 82),
    ("Riya Kapoor", "ScaleUp Coaching", "+919810000102", "riya@example.com", "Referral", "Demo Scheduled", 72000, 91),
    ("Kabir Sharma", "UrbanFit Gym", "+919810000103", "kabir@example.com", "Instagram", "Contacted", 30000, 65),
    ("Ananya Iyer", "Bloom Skin Clinic", "+919810000104", "ananya@example.com", "Google Ads", "New", 56000, 74),
    ("Vikram Singh", "NorthStar Realty", "+919810000105", "vikram@example.com", "Website", "Won", 125000, 96),
    ("Neha Verma", "NV Design Lab", "+919810000106", "neha@example.com", "WhatsApp", "Interested", 38000, 78),
    ("Dev Malhotra", "LearnLoop Academy", "+919810000107", "dev@example.com", "LinkedIn", "Contacted", 64000, 61),
    ("Sana Khan", "Sana Events", "+919810000108", "sana@example.com", "Referral", "Lost", 28000, 31),
    ("Arjun Rao", "BrightPath Consulting", "+919810000109", "arjun@example.com", "Website", "Demo Scheduled", 89000, 88),
    ("Meera Joshi", "Mindful Nutrition", "+919810000110", "meera@example.com", "WhatsApp", "New", 22000, 69),
    ("Ishaan Gupta", "PixelCraft Agency", "+919810000111", "ishaan@example.com", "Google Ads", "Interested", 98000, 85),
    ("Tanya Bose", "Bose Legal Services", "+919810000112", "tanya@example.com", "LinkedIn", "Contacted", 78000, 58),
]


def seed_database(db: Session) -> None:
    if db.scalar(select(User.id).limit(1)):
        return

    users = [
        User(name="Param Saxena", email="param5saxena@gmail.com", password_hash=hash_password("Demo@123"), role="admin"),
        User(name="Riya Sales", email="riya@clientpulse.demo", password_hash=hash_password("Demo@123"), role="sales_agent"),
        User(name="Vikram Viewer", email="viewer@clientpulse.demo", password_hash=hash_password("Demo@123"), role="viewer"),
    ]
    db.add_all(users)
    db.flush()

    db.add_all(
        [PipelineStage(name=name, color=color, position=position, probability=probability) for name, color, position, probability in STAGES]
    )
    db.flush()

    now = datetime.now(timezone.utc)
    lead_models = []
    for index, (name, business, phone, email, source, stage, value, score) in enumerate(LEADS):
        lead = Lead(
            name=name,
            business_name=business,
            phone=phone,
            email=email,
            source=source,
            stage=stage,
            status="Closed" if stage in {"Won", "Lost"} else "Open",
            value=value,
            score=score,
            temperature="Hot" if score >= 80 else "Warm" if score >= 55 else "Cold",
            owner_id=users[index % 2].id,
            last_contacted_at=now - timedelta(hours=index * 9 + 2),
            created_at=now - timedelta(days=index % 8, hours=index),
        )
        db.add(lead)
        db.flush()
        lead_models.append(lead)

        conversation = Conversation(
            lead_id=lead.id,
            unread_count=1 if index in {0, 3, 9} else 0,
            last_message_at=now - timedelta(hours=index + 1),
        )
        db.add(conversation)
        db.flush()
        db.add_all(
            [
                WhatsAppMessage(
                    conversation_id=conversation.id,
                    lead_id=lead.id,
                    direction="inbound",
                    content=f"Hi, I am interested in improving lead follow-ups for {business}.",
                    status="read",
                    sent_at=now - timedelta(hours=index + 2),
                ),
                WhatsAppMessage(
                    conversation_id=conversation.id,
                    lead_id=lead.id,
                    direction="outbound",
                    content="Thanks for reaching out. I can show you how ClientPulse keeps every follow-up visible.",
                    status="delivered",
                    sent_at=now - timedelta(hours=index + 1),
                ),
            ]
        )

    followups = [
        FollowUp(lead_id=lead_models[0].id, owner_id=users[0].id, due_at=now + timedelta(hours=2), type="call", note="Confirm decision-maker and budget"),
        FollowUp(lead_id=lead_models[1].id, owner_id=users[1].id, due_at=now + timedelta(hours=5), type="demo", note="Product walkthrough with operations team"),
        FollowUp(lead_id=lead_models[2].id, owner_id=users[0].id, due_at=now - timedelta(days=1), type="whatsapp", note="Share gym onboarding use case"),
        FollowUp(lead_id=lead_models[5].id, owner_id=users[1].id, due_at=now + timedelta(days=1), type="email", note="Send pricing and implementation plan"),
    ]
    db.add_all(followups)
    db.add_all(
        [
            Task(title="Prepare ScaleUp coaching demo", lead_id=lead_models[1].id, owner_id=users[0].id, due_date=(now + timedelta(days=1)).date(), priority="high"),
            Task(title="Review WhatsApp template approval", owner_id=users[0].id, due_date=(now + timedelta(days=2)).date(), priority="medium"),
            Task(title="Call overdue UrbanFit lead", lead_id=lead_models[2].id, owner_id=users[1].id, due_date=now.date(), priority="high"),
        ]
    )
    db.add_all(
        [
            Note(lead_id=lead_models[0].id, author_id=users[0].id, content="Clinic currently tracks enquiries in personal WhatsApp chats."),
            Note(lead_id=lead_models[1].id, author_id=users[1].id, content="Strong fit: 4 counsellors need shared pipeline visibility."),
        ]
    )
    db.add_all(
        [
            AISuggestion(lead_id=lead_models[0].id, suggestion_type="next_best_action", content="Send the clinic onboarding checklist, then book a 15-minute workflow call.", confidence=0.88),
            AISuggestion(lead_id=lead_models[1].id, suggestion_type="reply_draft", content="Great, Riya. I have reserved a demo slot and will tailor it around counsellor handoffs.", confidence=0.91),
        ]
    )
    db.add_all(
        [
            AutomationLog(automation_name="Daily follow-up reminders", status="success", records_processed=3, details="Reminder digest prepared"),
            AutomationLog(automation_name="Google Sheets sync", status="success", records_processed=12, details="Demo CSV snapshot exported"),
            AutomationLog(automation_name="Stale lead detector", status="success", records_processed=2, details="Two leads flagged for review"),
        ]
    )
    db.add(
        ActivityLog(
            user_id=users[0].id,
            action="workspace_seeded",
            details="ClientPulse demo workspace initialized with realistic CRM data",
        )
    )
    db.commit()
