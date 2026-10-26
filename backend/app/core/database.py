import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

Base = declarative_base()

def get_engine():
    # Attempt primary database connection (MySQL)
    primary_url = settings.DATABASE_URL
    try:
        if primary_url.startswith("mysql"):
            # Check connection with short timeout
            test_engine = create_engine(
                primary_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                connect_args={"connect_timeout": 3}
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info(f"[Database] Successfully connected to MySQL at {primary_url.split('@')[-1]}")
            return test_engine
        elif primary_url.startswith("sqlite"):
            return create_engine(
                primary_url,
                connect_args={"check_same_thread": False}
            )
    except Exception as e:
        logger.warning(
            f"[Database] Primary database ({primary_url}) unavailable: {e}. "
            f"Falling back to zero-configuration SQLite ({settings.SQLITE_FALLBACK_URL}) for active development/testing."
        )

    # Fallback to SQLite
    fallback_engine = create_engine(
        settings.SQLITE_FALLBACK_URL,
        connect_args={"check_same_thread": False}
    )
    return fallback_engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
