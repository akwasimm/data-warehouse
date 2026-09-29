"""Gold layer: business-ready star schema. In this warehouse the gold objects are
views (dim_customers, dim_products, fact_sales), not tables.

Everything here is discovered from the catalog rather than hardcoded: the fact
view is whichever gold view starts with `fact`, and the dimension columns come
from a whitelist below. The dialect-specific pieces are the constants and CONCAT
helper at the top.
"""

from fastapi import APIRouter, HTTPException, Query

import database as db

router = APIRouter(prefix="/api/gold", tags=["gold"])

# --- dialect seams ---------------------------------------------------------
if db.DIALECT == "mssql":
    PERIOD_EXPR = "FORMAT({col}, 'yyyy-MM')"
    YEAR_EXPR = "FORMAT({col}, 'yyyy')"
    LIMIT_CLAUSE = "OFFSET 0 ROWS FETCH NEXT {n} ROWS ONLY"

    def CONCAT(a, b):  # noqa: N802 - reads as SQL in the entity table below
        return f"{a} + ' ' + {b}"
else:
    PERIOD_EXPR = "to_char({col}, 'YYYY-MM')"
    YEAR_EXPR = "to_char({col}, 'YYYY')"
    LIMIT_CLAUSE = "LIMIT {n}"

    def CONCAT(a, b):  # noqa: N802
        return f"COALESCE({a}, '') || ' ' || COALESCE({b}, '')"


# --- metric whitelist (user input only ever selects a key from here) --------
METRICS = {
    "revenue": "COALESCE(SUM(sales_amount), 0)",
    "quantity": "COALESCE(SUM(quantity), 0)",
    "orders": "COUNT(DISTINCT order_number)",
}

# dimension -> (view prefix, column, join column on the fact view)
DIMENSIONS = {
    "category": ("dim_products", "category", "product_key"),
    "subcategory": ("dim_products", "subcategory", "product_key"),
    "product_line": ("dim_products", "product_line", "product_key"),
    "country": ("dim_customers", "country", "customer_key"),
    "gender": ("dim_customers", "gender", "customer_key"),
    "marital_status": ("dim_customers", "marital_status", "customer_key"),
}

# entity -> (view prefix, name expression, join column)
ENTITIES = {
    "product": ("dim_products", "product_name", "product_key"),
    "customer": ("dim_customers", CONCAT("first_name", "last_name"), "customer_key"),
    "country": ("dim_customers", "country", "customer_key"),
}

MISSING_VALUE = "(no match)"


def gold_names():
    return [o["object_name"] for o in db.list_objects("gold")]


def find(prefix):
    return next((n for n in gold_names() if n.startswith(prefix)), None)


def require_fact():
    fact = find("fact")
    if not fact:
        raise HTTPException(404, "no gold fact view found")
    return fact


def _dim_ident(prefix, allowed):
    """Resolve a dimension whitelist entry to a real view+column, or None."""
    entry = allowed.get(prefix)
    if not entry:
        return None
    view = find(entry[0])
    return (view, entry[1:]) if view else None


# --- 5a: KPIs --------------------------------------------------------------


@router.get("/kpis")
@db.cache_result("gold_kpis")
def kpis():
    fact = require_fact()
    totals = db.one(
        f"""
        SELECT COALESCE(SUM(sales_amount), 0) AS revenue,
               COALESCE(SUM(quantity), 0)    AS quantity,
               COUNT(DISTINCT order_number)  AS orders,
               COUNT(DISTINCT customer_key) AS customers
          FROM {db.ident('gold', fact)}
        """
    )
    revenue = totals["revenue"] or 0
    orders = totals["orders"] or 0
    series = _series(fact, "monthly")

    # The dataset opens on 2010-12-29 and closes on 2014-01-28, so the first and
    # last months are partial. Comparing a partial month against a full one
    # reports a fake ~98% collapse, so the trend uses the last two complete
    # months and says which ones they were.
    complete = series[1:-1]
    last = complete[-1] if complete else None
    prev = complete[-2] if len(complete) > 1 else None
    trend_periods = [prev["period"], last["period"]] if last and prev else None

    values = {
        "revenue": revenue,
        "customers": totals["customers"] or 0,
        "orders": orders,
        "quantity": totals["quantity"] or 0,
        "avg_order_value": round(revenue / orders, 2) if orders else 0.0,
    }
    # Trend only where a real previous period exists to compare against.
    kpis = [
        {"key": "revenue", "label": "Total Revenue", "value": values["revenue"],
         "trend": _delta(last, prev, "revenue")},
        {"key": "customers", "label": "Total Customers", "value": values["customers"],
         "trend": None},
        {"key": "orders", "label": "Total Orders", "value": values["orders"],
         "trend": _delta(last, prev, "orders")},
        {"key": "avg_order_value", "label": "Average Order Value",
         "value": values["avg_order_value"], "trend": None},
    ]
    return {
        "kpis": kpis,
        # Counts what is actually returned, not the internal value map -- those
        # differ because `quantity` is measured but not surfaced as a card.
        "kpi_count": len(kpis),
        "fact_view": fact,
        "trend_periods": trend_periods,
        "period_range": [series[0]["period"], series[-1]["period"]] if series else None,
        "fact_rows": db.count_rows("gold", fact),
        "undated": db.one(
            f"""
            SELECT COUNT(*) AS rows, COALESCE(SUM(sales_amount), 0) AS revenue
              FROM {db.ident('gold', fact)}
             WHERE order_date IS NULL
            """
        ),
    }


def _delta(last, prev, key):
    if not last or not prev or not prev[key]:
        return None
    pct = (last[key] - prev[key]) / prev[key] * 100
    return {"direction": "up" if pct >= 0 else "down", "percent": round(pct, 2)}


def _series(fact, period="monthly"):
    """Monthly (or yearly) aggregate of every metric, one pass.

    Rows with no order_date cannot be placed on a timeline, so they are excluded
    here and reported separately by /kpis as undated_rows -- otherwise the trend
    chart would quietly not add up to total revenue.
    """
    expr = YEAR_EXPR if period == "yearly" else PERIOD_EXPR
    fmt = expr.format(col="order_date")
    return db.query(
        f"""
        SELECT {fmt} AS period,
               COALESCE(SUM(sales_amount), 0) AS revenue,
               COALESCE(SUM(quantity), 0)     AS quantity,
               COUNT(DISTINCT order_number)   AS orders
          FROM {db.ident('gold', fact)}
         WHERE order_date IS NOT NULL
         GROUP BY {fmt}
         ORDER BY {fmt}
        """
    )


# --- 5b: trend -------------------------------------------------------------


@router.get("/trend")
@db.cache_result("gold_trend")
def trend(metric: str = "revenue", period: str = "monthly"):
    if metric not in METRICS:
        raise HTTPException(400, f"metric must be one of {sorted(METRICS)}")
    if period not in ("monthly", "yearly"):
        raise HTTPException(400, "period must be monthly or yearly")
    return [
        {"period": row["period"], "value": row[metric]}
        for row in _series(require_fact(), period)
    ]


# --- 5c: distribution ------------------------------------------------------


@router.get("/distribution")
@db.cache_result("gold_distribution")
def distribution(dimension: str = "category", limit: int = Query(12, ge=1, le=50)):
    resolved = _dim_ident(dimension, DIMENSIONS)
    if not resolved:
        raise HTTPException(400, f"dimension must be one of {sorted(DIMENSIONS)}")
    view, (column, join_col) = resolved
    rows = db.query(
        f"""
        SELECT COALESCE(NULLIF(d.{column}, ''), {MISSING_VALUE!r}) AS name,
               COALESCE(SUM(f.sales_amount), 0) AS value
          FROM {db.ident('gold', require_fact())} f
          LEFT JOIN {db.ident('gold', view)} d ON d.{join_col} = f.{join_col}
         GROUP BY COALESCE(NULLIF(d.{column}, ''), {MISSING_VALUE!r})
         ORDER BY value DESC
        """
    )
    return rows[:limit]


# --- 5d: top performers ----------------------------------------------------


@router.get("/top-performers")
@db.cache_result("gold_top")
def top_performers(
    entity: str = "product",
    metric: str = "revenue",
    limit: int = Query(10, ge=1, le=100),
):
    resolved = _dim_ident(entity, ENTITIES)
    if not resolved:
        raise HTTPException(400, f"entity must be one of {sorted(ENTITIES)}")
    if metric not in METRICS:
        raise HTTPException(400, f"metric must be one of {sorted(METRICS)}")
    view, (name_expr, join_col) = resolved
    fact = require_fact()
    rows = db.query(
        f"""
        SELECT {name_expr} AS name,
               {METRICS[metric]} AS value
          FROM {db.ident('gold', fact)} f
          JOIN {db.ident('gold', view)} d ON d.{join_col} = f.{join_col}
         GROUP BY {name_expr}
         ORDER BY value DESC
         {LIMIT_CLAUSE.format(n=limit)}
        """
    )
    # Grand total across the whole fact table, not just the returned page,
    # so "percentage of total" means percentage of everything.
    total = db.one(
        f"SELECT {METRICS[metric]} AS n FROM {db.ident('gold', fact)}"
    )["n"] or 0
    return [
        {
            "rank": i + 1,
            "name": r["name"] or MISSING_VALUE,
            "value": r["value"],
            "percentage": round(r["value"] / total * 100, 2) if total else 0.0,
        }
        for i, r in enumerate(rows)
    ]


# --- 5e: browse ------------------------------------------------------------


@router.get("/tables")
@db.cache_result("gold_tables")
def tables():
    return db.list_objects("gold")


@router.get("/preview/{table_name}")
def preview(table_name: str, page: int = 1, limit: int = Query(20, ge=1, le=200)):
    if not db.resolve("gold", table_name):
        raise HTTPException(404, f"no gold object named {table_name!r}")
    page = max(1, page)
    data = db.preview("gold", table_name, limit=limit, offset=(page - 1) * limit)
    return {**data, "total_count": db.count_rows("gold", table_name), "page": page, "limit": limit}


@router.get("/stats")
@db.cache_result("gold_stats")
def stats():
    objects = db.list_objects("gold")
    fact = find("fact")
    return {
        "total_tables": len(objects),
        "total_rows": sum(o["row_count"] or 0 for o in objects),
        "objects": [{"name": o["object_name"], "kind": o["kind"], "row_count": o["row_count"]} for o in objects],
        "fact_view": fact,
    }
