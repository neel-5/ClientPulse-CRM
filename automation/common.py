"""Shared runtime helpers for ClientPulse automation jobs."""

from __future__ import annotations

import logging
import sys
from contextlib import contextmanager
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.seed import seed_database  # noqa: E402


def configure_logging(name: str) -> logging.Logger:
    log_dir = PROJECT_DIR / ".logs"
    log_dir.mkdir(exist_ok=True)
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    if logger.handlers:
        return logger
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    console = logging.StreamHandler()
    console.setFormatter(formatter)
    file_handler = logging.FileHandler(log_dir / f"{name}.log", encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(console)
    logger.addHandler(file_handler)
    return logger


@contextmanager
def database_session():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
