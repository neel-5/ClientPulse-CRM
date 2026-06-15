"""Sync leads to Google Sheets, or export CSV when credentials are absent."""

import argparse

from common import configure_logging, database_session
from app.services.sheets_service import SheetsService


logger = configure_logging("sync_to_sheets")


def sync(spreadsheet_id: str | None = None) -> dict:
    with database_session() as db:
        result = SheetsService(db).sync(spreadsheet_id)
    logger.info("Sync completed: %s", result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spreadsheet-id", help="Override GOOGLE_SPREADSHEET_ID")
    args = parser.parse_args()
    try:
        sync(args.spreadsheet_id)
    except Exception:
        logger.exception("Sheets sync failed")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
