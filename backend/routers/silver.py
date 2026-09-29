"""Silver layer: cleaned, deduplicated, correctly typed."""

from fastapi import APIRouter, HTTPException

import database as db

router = APIRouter(prefix="/api/silver", tags=["silver"])


@router.get("/tables")
@db.cache_result("silver_tables")
def tables():
    return db.list_objects("silver")


@router.get("/preview/{table_name}")
def preview(table_name: str, limit: int = db.PREVIEW_ROWS):
    if not db.resolve("silver", table_name):
        raise HTTPException(404, f"no silver object named {table_name!r}")
    return db.preview("silver", table_name, limit=min(limit, 200))


@router.get("/schema/{table_name}")
def schema(table_name: str):
    if not db.resolve("silver", table_name):
        raise HTTPException(404, f"no silver object named {table_name!r}")
    cols = db.columns("silver", table_name)
    return [
        {
            "column_name": c["column_name"],
            "data_type": c["data_type"],
            "is_nullable": c["is_nullable"] in ("YES", True, 1),
        }
        for c in cols
    ]


@router.get("/stats")
@db.cache_result("silver_stats")
def stats():
    objects = db.list_objects("silver")
    bronze = {o["object_name"]: o for o in db.list_objects("bronze")}
    total_rows = sum(o["row_count"] or 0 for o in objects)
    # The warehouse records no cleaning counters, so the only measurable
    # transformation is row loss between bronze and silver on the same name.
    removed = {
        o["object_name"]: max(0, (bronze.get(o["object_name"], {}).get("row_count") or 0) - (o["row_count"] or 0))
        for o in objects
    }
    duplicates_removed = sum(removed.values())
    bronze_rows = sum(o["row_count"] or 0 for o in bronze.values())
    return {
        "total_tables": len(objects),
        "total_rows": total_rows,
        "bronze_rows": bronze_rows,
        "duplicates_removed": duplicates_removed,
        "dedup_rate": round(duplicates_removed / bronze_rows, 6) if bronze_rows else 0.0,
        "removed_by_table": {k: v for k, v in removed.items() if v},
        "last_ingestion": db.last_pipeline_run(),
    }


@router.get("/comparison")
@db.cache_result("silver_comparison")
def comparison():
    """Bronze vs silver row counts for every table present in both layers."""
    bronze = {o["object_name"]: o for o in db.list_objects("bronze")}
    out = []
    for obj in db.list_objects("silver"):
        b = bronze.get(obj["object_name"])
        b_rows = (b["row_count"] if b else 0) or 0
        s_rows = obj["row_count"] or 0
        out.append(
            {
                "table_name": obj["object_name"],
                "bronze_rows": b_rows,
                "silver_rows": s_rows,
                "removed": b_rows - s_rows,
            }
        )
    return out
