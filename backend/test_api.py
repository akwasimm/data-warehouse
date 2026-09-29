"""Run against the live warehouse: .venv/Scripts/python -m pytest test_api.py -q

The smallest thing that fails if catalog discovery, the allowlist, pagination
or the KPI arithmetic break. Expected values were read from the warehouse with
sqlcmd, not from the API under test.

Tests that need data are skipped while the warehouse is still empty -- the
Postgres conversion is still in progress, so the suite stays runnable and turns
green on its own once the bronze/silver/gold objects exist.
"""

import pytest
from fastapi.testclient import TestClient

import database as db
from main import app

client = TestClient(app)


def _loaded():
    try:
        return bool(db.list_objects("bronze"))
    except Exception:
        return False


needs_data = pytest.mark.skipif(
    not _loaded(), reason="warehouse not loaded yet; counts below assume the full medallion"
)


def test_health():
    body = client.get("/api/health").json()
    assert body["status"] == "ok", body
    assert body["database"] == "connected"


def test_monitor_answers_get_and_head():
    """UptimeRobot can poll either verb, so both must work and agree. FastAPI
    does not add HEAD to a GET route by itself -- it was 405 until this was
    declared explicitly."""
    get = client.get("/api/health")
    head = client.request("HEAD", "/api/health")
    assert get.status_code == head.status_code == 200
    assert head.content == b""
    assert get.json()["status"] == "ok"


def test_monitor_reports_503_when_the_warehouse_is_down(monkeypatch):
    """The status code is the contract. While it was hardcoded to 200, every
    external check passed during an outage: UptimeRobot reported UP, Render
    skipped the restart, and Docker's HEALTHCHECK went green on a dead DB."""

    def boom(*a, **k):
        raise RuntimeError(
            "connection failed: FATAL: password authentication failed for user "
            '"postgres" at 10.0.0.5 port 5432'
        )

    monkeypatch.setattr(db, "one", boom)

    r = client.get("/api/health")
    assert r.status_code == 503
    assert r.json()["status"] == "degraded"
    # The frontend reads `detail` out of a failed response, so it must stay.
    assert "unreachable" in r.json()["detail"]
    # Driver text names the host, port and user. Unauthenticated, so it is
    # logged rather than returned.
    assert "FATAL" not in r.text and "5432" not in r.text and "postgres" not in r.text
    assert client.request("HEAD", "/api/health").status_code == 503


def test_preview_limit_is_rejected_not_crashed():
    """`min(limit, 200)` let limit=-1 reach Postgres, which rejects `LIMIT -1`
    as a syntax error -- a 500 on public input."""
    for bad in ("-1", "0", "201"):
        r = client.get(f"/api/bronze/preview/crm_cust_info?limit={bad}")
        assert r.status_code == 422, (bad, r.status_code)


def test_missing_password_fails_loudly(monkeypatch):
    """No committed default: an unset DWH_PASSWORD must refuse rather than
    quietly fall back to a known credential."""
    monkeypatch.setattr(db, "PASSWORD", "")
    r = client.get("/api/health")
    assert r.status_code == 503
    assert "DWH_PASSWORD" in r.text or r.json()["status"] == "degraded"


@needs_data
def test_discovery_finds_every_layer():
    assert len(db.list_objects("bronze")) == 6
    assert len(db.list_objects("silver")) == 6
    gold = db.list_objects("gold")
    assert len(gold) == 3
    assert {o["object_name"] for o in gold} == {"dim_customers", "dim_products", "fact_sales"}


@needs_data
def test_row_counts_match_a_direct_count():
    """Row totals are the warehouse's business, not the app's -- so this checks
    the API against a plain COUNT(*) instead of against a pinned number. It
    still fails if discovery, the dialect seam, or the cache serves a wrong
    count. Fact and sales line counts are pinned because those are the numbers
    the gold KPIs are built on."""
    for layer in ("bronze", "silver", "gold"):
        for obj in db.list_objects(layer):
            direct = db.one(
                f"SELECT COUNT(*) AS n FROM {db.ident(layer, obj['object_name'])}"
            )["n"]
            assert obj["row_count"] == direct, f"{layer}.{obj['object_name']}"

    bronze = {o["object_name"]: o["row_count"] for o in db.list_objects("bronze")}
    assert bronze["crm_sales_details"] == 60398  # the fact table's line count
    gold = {o["object_name"]: o["row_count"] for o in db.list_objects("gold")}
    assert gold["fact_sales"] == 60398


@needs_data
def test_source_is_derived_from_the_table_name():
    sources = {o["object_name"]: o["source"] for o in db.list_objects("silver")}
    assert sources["crm_cust_info"] == "CRM"
    assert sources["erp_loc_a101"] == "ERP"


@needs_data
def test_allowlist_rejects_injection():
    # Nothing from a URL may reach SQL without matching a real catalog object.
    for bad in ["crm_cust_info; DROP TABLE bronze.crm_cust_info--", "' OR 1=1--", "nope"]:
        assert client.get(f"/api/bronze/preview/{bad}").status_code == 404
        assert db.resolve("bronze", bad) is None


@needs_data
def test_preview_shape_and_pagination():
    first = client.get("/api/bronze/preview/crm_sales_details?limit=5").json()
    assert first["columns"][0] == "sls_ord_num"
    assert len(first["rows"]) == 5

    p1 = client.get("/api/gold/preview/fact_sales?page=1&limit=3").json()
    p2 = client.get("/api/gold/preview/fact_sales?page=2&limit=3").json()
    assert p1["total_count"] == 60398
    assert p1["page"] == 1
    assert p1["rows"] != p2["rows"]


@needs_data
def test_silver_reports_the_real_dedupe():
    """What silver did is arithmetic on the catalog, so assert the arithmetic
    holds against the live counts -- not a number copied from the old SQL Server
    warehouse, which legitimately lost a row differently when ported."""
    stats = client.get("/api/silver/stats").json()
    bronze = {o["object_name"]: o["row_count"] for o in db.list_objects("bronze")}
    silver = {o["object_name"]: o["row_count"] for o in db.list_objects("silver")}

    assert stats["total_rows"] == sum(silver.values())
    assert stats["bronze_rows"] == sum(bronze.values())
    assert stats["duplicates_removed"] == sum(
        max(0, bronze[n] - silver[n]) for n in silver if n in bronze
    )
    assert stats["removed_by_table"] == {
        n: bronze[n] - silver[n] for n in silver if bronze.get(n, 0) > silver[n]
    }
    # The claim is only meaningful if silver really is deduplicated.
    for name, count in silver.items():
        if name == "crm_cust_info":
            distinct = db.one(
                f"SELECT COUNT(DISTINCT cst_key) AS n FROM {db.ident('silver', name)}"
            )["n"]
            assert distinct == count, name


@needs_data
def test_kpi_arithmetic():
    kpis = {k["key"]: k["value"] for k in client.get("/api/gold/kpis").json()["kpis"]}
    assert kpis["revenue"] == 29356250
    # fact_sales rows are line items; orders must be distinct order numbers.
    assert kpis["orders"] == 27659
    assert kpis["customers"] == 18484
    assert kpis["avg_order_value"] == round(29356250 / 27659, 2)
    # kpi_count must describe the cards actually returned.
    body = client.get("/api/gold/kpis").json()
    assert body["kpi_count"] == len(body["kpis"]) == 4


@needs_data
def test_trend_is_monthly_and_ordered():
    rows = client.get("/api/gold/trend?metric=revenue&period=monthly").json()
    periods = [r["period"] for r in rows]
    assert periods == sorted(periods)
    assert len(periods) == 38  # 2010-12 .. 2014-01 inclusive
    # 19 fact rows carry no order_date, so they belong to no period. The series
    # must not claim to account for revenue it excluded.
    assert sum(r["value"] for r in rows) == 29356250 - 4992


@needs_data
def test_undated_rows_are_reported_not_hidden():
    kpis = client.get("/api/gold/kpis").json()
    assert kpis["undated"]["rows"] == 19
    assert kpis["undated"]["revenue"] == 4992


@needs_data
def test_distribution_and_top_performers():
    dist = client.get("/api/gold/distribution?dimension=category").json()
    assert {d["name"] for d in dist} == {"Bikes", "Accessories", "Clothing"}
    assert sum(d["value"] for d in dist) == 29356250

    top = client.get("/api/gold/top-performers?entity=product&limit=5").json()
    assert [t["rank"] for t in top] == [1, 2, 3, 4, 5]
    # percentage is of the whole fact table, so the top 5 cannot sum to 100
    assert sum(t["percentage"] for t in top) < 100
    assert top[0]["percentage"] > 0


@needs_data
def test_comparison_pairs_every_table():
    rows = client.get("/api/silver/comparison").json()
    silver = {o["object_name"]: o for o in db.list_objects("silver")}
    assert {r["table_name"] for r in rows} == set(silver)
    for row in rows:
        assert row["silver_rows"] == silver[row["table_name"]]["row_count"]
        assert row["removed"] == row["bronze_rows"] - row["silver_rows"]


def test_bad_selector_is_a_400_not_a_crash():
    assert client.get("/api/gold/trend?metric=salary").status_code == 400
    assert client.get("/api/gold/distribution?dimension=password").status_code == 400
    assert client.get("/api/gold/top-performers?entity=root").status_code == 400


@needs_data
def test_overview_returns_all_three_layers():
    body = client.get("/api/overview").json()
    assert body["bronze"]["total_tables"] == 6
    assert body["silver"]["total_tables"] == 6
    assert body["gold"]["total_tables"] == 3
    assert body["last_pipeline_run"]


@pytest.mark.skipif(_loaded(), reason="only meaningful while the warehouse is empty")
def test_empty_warehouse_degrades_instead_of_crashing():
    """The dashboard renders a soft message inside the card, so the API must
    never 500 on a half-built warehouse."""
    assert client.get("/api/overview").status_code == 200
    assert client.get("/api/bronze/tables").json() == []
    assert client.get("/api/gold/kpis").status_code == 404
    assert client.get("/api/bronze/preview/crm_cust_info").status_code == 404
    assert client.get("/api/silver/schema/crm_cust_info").status_code == 404
