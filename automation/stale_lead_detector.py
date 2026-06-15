"""Find stale open leads and record AI risk suggestions."""

import argparse
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select

from common import configure_logging, database_session
from app.models import AutomationLog, Lead
from app.services.ai_service import AIService


logger = configure_logging("stale_lead_detector")


def detect_stale_leads(days: int = 5) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    with database_session() as db:
        leads = db.scalars(
            select(Lead).where(
                Lead.stage.not_in(["Won", "Lost"]),
                or_(Lead.last_contacted_at.is_(None), Lead.last_contacted_at < cutoff),
            )
        ).all()
        service = AIService(db)
        results = [{"lead_id": lead.id, "name": lead.name, **service.risk_note(lead)} for lead in leads]
        db.add(
            AutomationLog(
                automation_name="Stale lead detector",
                status="success",
                records_processed=len(results),
                details=f"Stale threshold: {days} days",
            )
        )
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=5)
    args = parser.parse_args()
    try:
        results = detect_stale_leads(args.days)
        for result in results:
            logger.info("%s | %s | %s", result["lead_id"], result["name"], result["note"])
        logger.info("%s stale lead(s) found", len(results))
    except Exception:
        logger.exception("Stale lead job failed")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
