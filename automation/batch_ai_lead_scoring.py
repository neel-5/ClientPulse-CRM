"""Re-score open leads with the configured ClientPulse AI provider."""

import argparse

from sqlalchemy import select

from common import configure_logging, database_session
from app.models import AutomationLog, Lead
from app.services.ai_service import AIService


logger = configure_logging("batch_ai_lead_scoring")


def score_batch(limit: int = 100) -> list[dict]:
    with database_session() as db:
        leads = db.scalars(
            select(Lead).where(Lead.stage.not_in(["Won", "Lost"])).limit(limit)
        ).all()
        service = AIService(db)
        results = [{"lead_id": lead.id, "name": lead.name, **service.score_lead(lead)} for lead in leads]
        db.add(
            AutomationLog(
                automation_name="Batch AI lead scoring",
                status="success",
                records_processed=len(results),
                details=f"Batch limit: {limit}",
            )
        )
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()
    try:
        for result in score_batch(args.limit):
            logger.info("%s | %s | score=%s", result["lead_id"], result["name"], result["score"])
    except Exception:
        logger.exception("Batch scoring failed")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
