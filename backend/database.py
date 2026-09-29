"""Connection + catalog access for Wasim's Data Warehouse.

The warehouse is being moved to PostgreSQL (local Docker: `dwh-pg`, port 5433).
This module is dialect-aware so the same app can run against either engine:

    DWH_DIALECT=postgres   PostgreSQL (default) -- psycopg 3
    DWH_DIALECT=mssql      SQL Server          -- pymssql

Only the *catalog* layer is dual-dialect -- it is the part that must stay generic
so the dashboard works against whatever objects the warehouse happens to contain.
The analytics aggregates in routers/gold.py have Postgres expressions with mssql
seams at its top.
"""

import functools
import os
import threading
import time
from contextlib import contextmanager

DIALECT = os.getenv("DWH_DIALECT", "postgres")
HOST = os.getenv("DWH_HOST", "localhost")
PORT = int(os.getenv("DWH_PORT", "5433"))
DATABASE = os.getenv("DWH_DATABASE", "datawarehouse")
USER = os.getenv("DWH_USER", "postgres")
PASSWORD = os.getenv("DWH_PASSWORD", "DwhDev2026")

LAYERS = ("bronze", "silver", "gold")
PREVIEW_ROWS = 10
CACHE_TTL = 300  # seconds; keeps repeated catalog/aggregate hits off the DB


@contextmanager
def connect():
    if DIALECT == "mssql":
        import pymssql

        conn = pymssql.connect(
            server=HOST, port=str(PORT), database=DATABASE, user=USER, password=PASSWORD
        )
    else:
        import psycopg

        conn = psycopg.connect(
            host=HOST, port=PORT, dbname=DATABASE, user=USER, password=PASSWORD
        )
    try:
        yield conn
    finally:
        conn.close()


def _cursor(conn):
    if DIALECT == "mssql":
        return conn.cursor(as_dict=True)
    from psycopg.rows import dict_row

    return conn.cursor(row_factory=dict_row)


def _jsonable(value):
    """Coerce a DB value into something jsonable can serialise."""
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, (bytes, bytearray, memoryview)):
        return bytes(value).hex()
    if isinstance(value, float) and value != value:  # NaN
        return None
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    isoformat = getattr(value, "isoformat", None)
    if isoformat is not None:
        return isoformat()
    try:
        return float(value)
    except (TypeError, ValueError):
        return str(value)


def query(sql, params=None):
    """Run a query, return a list of dicts with JSON-safe values."""
    with connect() as conn:
        cur = _cursor(conn)
        cur.execute(sql, params if params is not None else ())
        rows = cur.fetchall()
    return [{k: _jsonable(v) for k, v in row.items()} for row in rows]


def one(sql, params=None):
    rows = query(sql, params)
    return rows[0] if rows else None


def ident(layer, name):
    """Quote a schema.object identifier. Callers MUST pass a name that
    resolve() has already validated against the live catalog."""
    if DIALECT == "mssql":
        return f"[{layer}].[{name}]"
    return f'"{layer}"."{name}"'


# --------------------------------------------------------------------------
# catalog discovery
# --------------------------------------------------------------------------

if DIALECT == "mssql":
    SQL_LIST_OBJECTS = """
        SELECT o.name AS object_name,
               o.type_desc AS kind,
               (SELECT COUNT(*) FROM sys.columns c WHERE c.object_id = o.object_id) AS column_count
          FROM sys.objects o
          JOIN sys.schemas s ON s.schema_id = o.schema_id
         WHERE s.name = %s AND o.type IN ('U', 'V')
         ORDER BY o.name
    """
    SQL_COUNT = "SELECT COUNT_BIG(*) AS n FROM {ident}"
    SQL_COLUMNS = """
        SELECT c.name AS column_name, t.name AS data_type, c.is_nullable
          FROM sys.columns c
          JOIN sys.types t ON t.user_type_id = c.user_type_id
         WHERE c.object_id = OBJECT_ID(%s)
         ORDER BY c.column_id
    """
    SQL_PREVIEW_TOP = "SELECT TOP %(limit)s * FROM {ident} ORDER BY (SELECT NULL)"
    SQL_PREVIEW_PAGE = (
        "SELECT * FROM {ident} ORDER BY (SELECT NULL) "
        "OFFSET %(offset)s ROWS FETCH NEXT %(limit)s ROWS ONLY"
    )
else:
    SQL_LIST_OBJECTS = """
        SELECT c.relname AS object_name,
               CASE c.relkind WHEN 'v' THEN 'VIEW' ELSE 'TABLE' END AS kind,
               (SELECT COUNT(*) FROM pg_attribute a
                 WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped) AS column_count
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = %s AND c.relkind IN ('r', 'v')
         ORDER BY c.relname
    """
    SQL_COUNT = "SELECT COUNT(*) AS n FROM {ident}"
    SQL_COLUMNS = """
        SELECT a.attname AS column_name,
               format_type(a.atttypid, a.atttypmod) AS data_type,
               CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable
          FROM pg_attribute a
         WHERE a.attrelid = %s::regclass
           AND a.attnum > 0 AND NOT a.attisdropped
         ORDER BY a.attnum
    """
    SQL_PREVIEW_TOP = "SELECT * FROM {ident} LIMIT %(limit)s"
    SQL_PREVIEW_PAGE = "SELECT * FROM {ident} LIMIT %(limit)s OFFSET %(offset)s"


def source_system(name):
    """Bronze/silver tables encode their origin in the name (crm_*, erp_*);
    there is no source column, so derive it."""
    prefix = name.split("_", 1)[0]
    return {"crm": "CRM", "erp": "ERP"}.get(prefix, prefix.upper() or "UNKNOWN")


def list_objects(layer, with_counts=True):
    """Every table and view in a medallion layer, with row and column counts."""
    if layer not in LAYERS:
        raise ValueError(f"unknown layer: {layer}")

    def build():
        objects = []
        for row in query(SQL_LIST_OBJECTS, (layer,)):
            name = row["object_name"]
            if with_counts:
                row["row_count"] = count_rows(layer, name)
            else:
                row["row_count"] = None
            row["source"] = source_system(name)
            objects.append(row)
        return objects

    return cached("list_objects", layer, build)


def count_rows(layer, name):
    """Exact row count. Postgres has no sys.partitions, so this is one COUNT(*)
    per object, memoised by the layer cache above."""
    return one(SQL_COUNT.format(ident=ident(layer, name)))["n"] or 0


def resolve(layer, name):
    """Return a catalog object, or None. The allowlist: nothing from a URL
    reaches SQL until it has matched a real table or view."""
    return next((o for o in list_objects(layer) if o["object_name"] == name), None)


def columns(layer, name):
    params = (layer, name) if DIALECT == "mssql" else (f"{layer}.{name}",)
    return query(SQL_COLUMNS, params)


def preview(layer, name, limit=PREVIEW_ROWS, offset=0):
    """Page of rows as {columns, rows}. Columns come from the catalog so the
    result shape is stable even when a page is empty."""
    cols = [c["column_name"] for c in columns(layer, name)]
    template = SQL_PREVIEW_TOP if not offset else SQL_PREVIEW_PAGE
    rows = query(template.format(ident=ident(layer, name)), {"limit": limit, "offset": offset})
    return {"columns": cols, "rows": [[r.get(c) for c in cols] for r in rows]}


def last_pipeline_run():
    """Newest dwh_create_date across the silver layer.

    The silver loaders stamp every row they insert, so this is the warehouse's
    real last-run time. Discovered dynamically -- only tables that actually
    carry the column are read.
    """
    stamps = []
    for obj in list_objects("silver"):
        name = obj["object_name"]
        if not any(c["column_name"] == "dwh_create_date" for c in columns("silver", name)):
            continue
        row = one(f"SELECT MAX(dwh_create_date) AS m FROM {ident('silver', name)}")
        if row and row["m"]:
            stamps.append(row["m"])
    return max(stamps) if stamps else None


# --------------------------------------------------------------------------
# cache
# --------------------------------------------------------------------------

_lock = threading.Lock()
_cache = {}


def cached(key, args, compute):
    """TTL memo. Endpoints run in FastAPI's threadpool, so the read-modify-write
    needs the lock."""
    k = (key, args)
    now = time.monotonic()
    with _lock:
        hit = _cache.get(k)
        if hit and now - hit[0] < CACHE_TTL:
            return hit[1]
    value = compute()
    with _lock:
        _cache[k] = (now, value)
    return value


def clear_cache():
    with _lock:
        _cache.clear()


def cache_result(key):
    """Decorator form of cached(), for endpoint handlers."""

    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            return cached(key, (args, tuple(sorted(kwargs.items()))), lambda: fn(*args, **kwargs))

        return wrapper

    return decorator
