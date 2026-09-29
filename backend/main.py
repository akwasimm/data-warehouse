"""Wasim's Data Warehouse dashboard API.

Public, no auth. Reads the warehouse directly; every layer's objects are
discovered from the catalog so the API works against whatever the warehouse
happens to contain.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import database as db
from routers import bronze, gold, silver

app = FastAPI(title="Wasim's Data Warehouse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(bronze.router)
app.include_router(silver.router)
app.include_router(gold.router)


@app.get("/api/health", tags=["meta"])
def health():
    try:
        db.one("SELECT 1 AS ok")
        return {"status": "ok", "database": "connected", "dialect": db.DIALECT,
                "database_name": db.DATABASE}
    except Exception as exc:  # surfaced, not raised -- the frontend renders it
        return {"status": "degraded", "database": "unreachable", "error": str(exc)}


@app.get("/api/overview", tags=["meta"])
@db.cache_result("overview")
def overview():
    """Every layer's headline stats in one call, so the architecture section
    needs a single request instead of three."""
    from routers.bronze import stats as bronze_stats
    from routers.gold import stats as gold_stats
    from routers.silver import stats as silver_stats

    return {
        "bronze": bronze_stats(),
        "silver": silver_stats(),
        "gold": gold_stats(),
        "last_pipeline_run": db.last_pipeline_run(),
    }
