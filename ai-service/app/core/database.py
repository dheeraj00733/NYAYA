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
def get_db_connection():
    global pool
    if pool is None:
        init_db_pool()
    if pool is None:
        raise ConnectionError("Database pool is unavailable (PostgreSQL offline or psycopg2 not installed).")
    
    conn = pool.getconn()
    try:
        # Register pgvector type handler if available
        try:
            from pgvector.psycopg2 import register_vector
            register_vector(conn)
        except Exception:
            pass
        yield conn
    finally:
        pool.putconn(conn)
        
def save_document_chunks(document_id: str, chunks: list):
    """
    Inserts chunks and their vector embeddings into document_chunks.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM document_chunks WHERE document_id = %s", (document_id,))
                insert_query = """
                    INSERT INTO document_chunks (
                        document_id, chunk_index, page_number, content, token_count, embedding
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                """
                for c in chunks:
                    cur.execute(insert_query, (
                        document_id,
                        c['chunk_index'],
                        c['page_number'],
                        c['content'],
                        c['token_count'],
                        c['embedding']
                    ))
                conn.commit()
                logger.info(f"Saved {len(chunks)} chunks with embeddings for document {document_id}")
                return True
    except Exception as e:
        logger.error(f"Failed to persist document chunks: {e}")
        return False