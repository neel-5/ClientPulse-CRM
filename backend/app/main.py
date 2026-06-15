from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import Base, SessionLocal, engine
from .routers import ai, auth, crm, integrations, whatsapp
from .seed import seed_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)
    yield


settings = get_settings()
app = FastAPI(
    title="ClientPulse CRM API",
    description="WhatsApp and Google Sheets lead management API for small businesses.",
    version="1.0.0",
    lifespan=lifespan,
    contact={"name": "Param Saxena", "email": "param5saxena@gmail.com"},
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(crm.router)
app.include_router(whatsapp.router)
app.include_router(ai.router)
app.include_router(integrations.router)


@app.get("/", tags=["System"])
def root():
    return {
        "product": "ClientPulse CRM",
        "status": "ready",
        "mode": settings.environment,
        "docs": "/docs",
    }


@app.get("/health", tags=["System"])
def health():
    return {"status": "healthy", "database": settings.database_url.split(":", 1)[0]}
