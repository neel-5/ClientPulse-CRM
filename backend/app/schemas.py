from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(ORMModel):
    id: int
    name: str
    email: str
    role: str
    active: bool


class LeadCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    business_name: str = ""
    phone: str = Field(min_length=7, max_length=30)
    email: str = ""
    source: str = "Manual"
    stage: str = "New"
    value: float = 0
    owner_id: int | None = None


class LeadUpdate(BaseModel):
    name: str | None = None
    business_name: str | None = None
    phone: str | None = None
    email: str | None = None
    source: str | None = None
    stage: str | None = None
    status: str | None = None
    value: float | None = None
    score: int | None = None
    temperature: str | None = None
    owner_id: int | None = None
    lost_reason: str | None = None


class LeadOut(ORMModel):
    id: int
    name: str
    business_name: str
    phone: str
    email: str
    source: str
    stage: str
    status: str
    value: float
    score: int
    temperature: str
    owner_id: int | None
    last_contacted_at: datetime | None
    next_follow_up: datetime | None
    created_at: datetime
    updated_at: datetime


class NoteCreate(BaseModel):
    content: str = Field(min_length=1)


class FollowUpCreate(BaseModel):
    lead_id: int
    due_at: datetime
    type: str = "call"
    note: str = ""
    owner_id: int | None = None


class FollowUpOut(ORMModel):
    id: int
    lead_id: int
    due_at: datetime
    type: str
    note: str
    status: str
    completed_at: datetime | None
    created_at: datetime


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    lead_id: int | None = None
    owner_id: int | None = None
    due_date: date | None = None
    priority: str = "medium"


class MessageSend(BaseModel):
    lead_id: int
    message: str
    message_type: str = "text"


class MockMessage(BaseModel):
    phone: str
    name: str = "WhatsApp Lead"
    business_name: str = ""
    message: str
    source: str = "WhatsApp"


class AIRequest(BaseModel):
    lead_id: int
    context: str = ""


class StageMove(BaseModel):
    stage: str


class SheetSyncRequest(BaseModel):
    spreadsheet_id: str | None = None


class AutomationRun(BaseModel):
    automation_name: str
    parameters: dict[str, Any] = {}
