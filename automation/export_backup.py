"""Export a timestamped JSON backup of core CRM records."""

import argparse
import json
from datetime import date, datetime
from pathlib import Path

from sqlalchemy import select

from common import PROJECT_DIR, configure_logging, database_session
from app.models import FollowUp, Lead, Note, Task, WhatsAppMessage


logger = configure_logging("export_backup")


def serialize(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def model_to_dict(instance) -> dict:
    return {
        column.name: serialize(getattr(instance, column.name))
        for column in instance.__table__.columns
        if column.name not in {"password_hash"}
    }


def export_backup(output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    filename = output_dir / f"clientpulse_backup_{datetime.now():%Y%m%d_%H%M%S}.json"
    models = {
        "leads": Lead,
        "followups": FollowUp,
        "tasks": Task,
        "notes": Note,
        "whatsapp_messages": WhatsAppMessage,
    }
    with database_session() as db:
        payload = {
            name: [model_to_dict(row) for row in db.scalars(select(model)).all()]
            for name, model in models.items()
        }
    filename.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    logger.info("Backup written to %s", filename)
    return filename


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=PROJECT_DIR / "backups")
    args = parser.parse_args()
    try:
        export_backup(args.output_dir)
    except Exception:
        logger.exception("Backup failed")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
