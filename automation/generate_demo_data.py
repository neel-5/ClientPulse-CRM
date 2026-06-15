"""Initialize or reset the local demo database with realistic CRM data."""

import argparse

from common import configure_logging, database_session
from app.database import Base, engine
from app.seed import seed_database


logger = configure_logging("generate_demo_data")


def generate(reset: bool = False) -> None:
    if reset:
        logger.warning("Reset requested: recreating all local database tables")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    with database_session() as db:
        seed_database(db)
    logger.info("Demo data is ready")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset", action="store_true", help="Delete and recreate demo tables")
    args = parser.parse_args()
    try:
        generate(args.reset)
    except Exception:
        logger.exception("Demo data generation failed")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
