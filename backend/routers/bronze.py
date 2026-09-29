"""Bronze layer: raw, as-ingested data. Tables only, no views in this warehouse."""

from fastapi import APIRouter, HTTPException, Query

import database as db

router = APIRouter(prefix="/api/bronze", tags=["bronze"])


@router.get("/tables")
@db.cache_result("bronze_tables")
def tables():
    return db.list_objects("bronze")


@router.get("/preview/{table_name}")
def preview(table_name: str, limit: int = Query(db.PREVIEW_ROWS, ge=1, le=200)):
    # ge=1 matters: `min(limit, 200)` alone let limit=-1 through, and Postgres
    # rejects `LIMIT -1` as a syntax error -- a 500 on public input.
    if not db.resolve("bronze", table_name):
        raise HTTPException(404, f"no bronze object named {table_name!r}")
    return db.preview("bronze", table_name, limit=limit)


@router.get("/stats")
@db.cache_result("bronze_stats")
def stats():
    objects = db.list_objects("bronze")
    return {
        "total_tables": len(objects),
        "total_rows": sum(o["row_count"] or 0 for o in objects),
        "total_columns": sum(o["column_count"] or 0 for o in objects),
        # Bronze has no load marker column, so the pipeline's last run is read from
        # the dwh_create_date stamps the silver loaders write.
        "last_ingestion": db.last_pipeline_run(),
        "sources": sorted({o["source"] for o in objects}),
    }
