"""Wasim's Data Warehouse dashboard API.

Public, no auth. Reads the warehouse directly; every layer's objects are
discovered from the catalog so the API works against whatever the warehouse
happens to contain.
"""

import logging
import os

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

import database as db
from routers import bronze, gold, silver

log = logging.getLogger("dwh")

app = FastAPI(title="Wasim's Data Warehouse API", version="1.0.0")

# A public read-only dashboard, so any origin is allowed by default. Narrow it
# by setting DWH_CORS_ORIGINS to a comma-separated allowlist.
_origins = [o.strip() for o in os.getenv("DWH_CORS_ORIGINS", "*").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "HEAD"],
    allow_headers=["*"],
)

app.include_router(bronze.router)
app.include_router(silver.router)
app.include_router(gold.router)


@app.api_route("/api/health", methods=["GET", "HEAD"], tags=["meta"])
def health(response: Response):
    """Monitor target: answers GET and HEAD, and reports 503 while the warehouse
    is unreachable.

    The status code is the whole point. It used to be 200 with the outage
    described in the body, which made every external check pass while the
    dashboard was broken -- UptimeRobot reported UP, Render never restarted the
    instance, and Docker's HEALTHCHECK and the compose service_healthy gate
    passed vacuously.
    """
    try:
        db.one("SELECT 1 AS ok")
        return {"status": "ok", "database": "connected", "dialect": db.DIALECT,
                "database_name": db.DATABASE}
    except Exception:
        # Logged, never returned: str(exc) carries the host, port, username and
        # the verbatim driver message, all on an unauthenticated endpoint.
        log.exception("warehouse unreachable")
        response.status_code = 503
        # `detail` is the field the frontend reads out of a failed response, so
        # the cards keep showing a real message instead of "Request failed (503)".
        return {"status": "degraded", "database": "unreachable",
                "detail": "warehouse is unreachable"}


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
