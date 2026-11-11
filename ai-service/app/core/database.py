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
