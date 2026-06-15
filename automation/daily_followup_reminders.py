"""Create a daily console and log digest for due and overdue follow-ups."""

import argparse
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from common import configure_logging, database_session
from app.models import AutomationLog, FollowUp


logger = configure_logging("daily_followup_reminders")


def collect_reminders(hours: int = 24) -> list[dict]:
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(hours=hours)
    with database_session() as db:
        rows = db.scalars(
            select(FollowUp)
            .where(FollowUp.status == "pending", FollowUp.due_at <= cutoff)
            .order_by(FollowUp.due_at)
        ).all()
        reminders = [
            {
                "followup_id": item.id,
                "lead": item.lead.name,
                "due_at": item.due_at.isoformat(),
                "type": item.type,
                "overdue": item.due_at.replace(tzinfo=item.due_at.tzinfo or timezone.utc) < now,
                "note": item.note,
            }
            for item in rows
        ]
        db.add(
            AutomationLog(
                automation_name="Daily follow-up reminders",
                status="success",
                records_processed=len(reminders),
                details=f"Prepared reminders due within {hours} hours",
            )
        )
    return reminders


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hours", type=int, default=24)
    args = parser.parse_args()
    try:
        reminders = collect_reminders(args.hours)
        for item in reminders:
            marker = "OVERDUE" if item["overdue"] else "DUE"
            logger.info("%s | %s | %s | %s", marker, item["lead"], item["due_at"], item["note"])
        logger.info("%s reminder(s) prepared", len(reminders))
    except Exception:
        logger.exception("Reminder job failed")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
