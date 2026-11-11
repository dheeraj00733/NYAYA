import logging
from contextlib import contextmanager
from app.core.config import settings

logger = logging.getLogger("nyayaflow.ai.database")

try:
    import psycopg2
    from psycopg2.pool import ThreadedConnectionPool
except ImportError:
    psycopg2 = None
    ThreadedConnectionPool = None

pool = None

def init_db_pool():
    global pool
    if psycopg2 is None or ThreadedConnectionPool is None:
        logger.warning("psycopg2 driver not installed in current environment. Database operations will use fallback mode.")
        return
    try:
        pool = ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            dbname=settings.DB_NAME,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD
        )
        logger.info("PostgreSQL AI connection pool initialized.")
    except Exception as e:
        logger.warning(f"Could not connect to PostgreSQL from AI Service: {e}. Fallback mode active.")
        pool = None

@contextmanager