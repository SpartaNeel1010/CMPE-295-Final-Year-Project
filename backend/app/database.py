import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
from app.config import DATABASE_URL

# Thread-safe connection pool (1–10 connections)
_pool: pool.ThreadedConnectionPool = pool.ThreadedConnectionPool(
    1, 10, dsn=DATABASE_URL
)


def get_conn():
    """Borrow a connection from the pool."""
    return _pool.getconn()


def put_conn(conn):
    """Return a connection to the pool."""
    _pool.putconn(conn)


def execute(query: str, params: tuple = (), *, fetch: str = "none"):
    """
    Run a query and optionally fetch results.

    fetch values:
      "none"  – no result returned (INSERT/UPDATE/DELETE)
      "one"   – fetchone() → dict | None
      "all"   – fetchall() → list[dict]
    """
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch == "one":
                result = cur.fetchone()
            elif fetch == "all":
                result = cur.fetchall()
            else:
                result = None
            conn.commit()
            return result
    except Exception:
        conn.rollback()
        raise
    finally:
        put_conn(conn)


def init_db():
    """Run schema.sql to create tables if they don't exist."""
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path) as f:
        sql = f.read()
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    finally:
        put_conn(conn)
