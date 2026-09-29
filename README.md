# 📊 Wasim's Data Warehouse

A PostgreSQL data warehouse on the **medallion architecture** (Bronze → Silver →
Gold), with a read-only FastAPI service and a live dashboard on top of it.

Everything the dashboard shows is read live from the warehouse on each page
load — there are no cached screenshots or hardcoded numbers.

---

## 🎯 What this contains

**The warehouse**
- Ingests six CSV extracts from two source systems (CRM and ERP)
- Cleans them: null handling, deduplication, standardised types
- Models them into a star schema (one fact table, two dimensions)
- Verifies itself with 17 quality gates that abort the run on failure

**The API** — `backend/`
- FastAPI, public, no authentication, read-only queries only
- Discovers every table from the database catalog, so it works against whatever
  the warehouse happens to contain rather than a hardcoded list

**The dashboard** — `frontend/`
- React + Recharts, single page, no router
- Bronze/Silver/Gold sections, KPI cards, live previews, trend and distribution charts
- Glassmorphism design system, responsive down to 390px, keyboard and
  screen-reader accessible

---

## 🏗️ The medallion architecture

```
🥉 Bronze  →  Raw data, exactly as it came out of the CSV extracts
🥈 Silver  →  Cleaned, typed, deduplicated
🥇 Gold    →  Views shaped for analysis: dim_customers, dim_products, fact_sales
```

Each layer only reads from the one before it, so any figure in the dashboard can
be traced back to the rows it came from.

Current contents:

| Layer | Objects | Rows |
|---|---|---|
| Bronze | 6 tables | 116,294 |
| Silver | 6 tables | 116,284 |
| Gold | 3 views | 79,177 |

---

## 📁 Project structure

```
data-warehouse/
│
├── datasets/                       # Raw source CSVs — the input, never modified
│   ├── source_crm/                 #   cust_info, prd_info, sales_details
│   └── source_erp/                 #   CUST_AZ12, LOC_A101, PX_CAT_G1V2
│
├── scripts/                        # The pipeline, in order
│   ├── init_database.sql           #   Drops and recreates all three schemas (destructive)
│   ├── run_all.sh                  #   Runs everything below, then both quality gates
│   ├── bronze/                     #   ddl_bronze.sql, load_bronze.sql
│   ├── silver/                     #   ddl_silver.sql, load_silver.sql
│   └── gold/                       #   ddl_gold.sql — creates the views
│
├── tests/                          # Data quality gates
│   ├── quality_checks_silver.sql   #   13 gates on Silver
│   ├── quality_checks_gold.sql     #   4 gates on Gold
│   └── parity_fingerprint.sql      #   Engine-neutral summary, diffable across databases
│
├── backend/                        # FastAPI service
│   ├── main.py                     #   App, CORS, /api/health, /api/overview
│   ├── database.py                 #   Connection handling, catalog discovery, caching
│   ├── routers/                    #   bronze.py, silver.py, gold.py
│   ├── test_api.py                 #   Live integration tests
│   ├── Dockerfile
│   └── .env.example                #   Connection settings
│
├── frontend/                       # React dashboard
│   ├── src/sections/               #   Hero, Architecture, Bronze, Silver, Gold, Footer
│   ├── src/components/             #   Glass cards, tables, charts, states
│   ├── src/index.css               #   The design system — tokens, no ad-hoc styling
│   ├── Dockerfile                  #   Multi-stage: Vite build → nginx
│   └── nginx.conf                  #   Serves the SPA, proxies /api to the backend
│
├── docs/
│   ├── data_catalog.md             # Gold layer columns, types, and grains
│   └── naming_conventions.md       # The naming rules this warehouse follows
│
├── docker-compose.yml              # Dashboard stack (backend + frontend)
│
└── README.md
```

> The database is **not** part of `docker-compose.yml`. It runs as its own
> container so the warehouse survives a dashboard rebuild. See below.

---

## 🚀 Running it

### 1. The database

The warehouse lives in a standalone container on port **5433**. Create it once:

```bash
docker run -d --name dwh-pg -p 5433:5432 \
  -e POSTGRES_PASSWORD=DwhDev2026 \
  -e POSTGRES_DB=datawarehouse \
  postgres:17-alpine
```

### 2. Load the warehouse

From the repository root — the bronze loader resolves CSV paths relative to the
current directory, so it must not be run from inside `scripts/`.

```bash
PGPORT=5433 sh scripts/run_all.sh
```

This runs, in order:

1. `scripts/init_database.sql` — drops and recreates the schemas (**destructive**)
2. Bronze DDL → Bronze load
3. Silver DDL → Silver load
4. Gold views
5. `tests/quality_checks_silver.sql`, then `tests/quality_checks_gold.sql`

The quality gates exit non-zero on any failure, so the whole script is safe to
wire into CI as-is.

**Against a hosted database** the same command works unchanged, because the
loaders use psql's `\copy` — which streams the file from your machine — rather
than server-side `COPY`, which cannot see your local files. Hand `run_all.sh` the
connection string Neon gives you:

```bash
DATABASE_URL='postgresql://user:password@host/dbname?sslmode=require' \
  sh scripts/run_all.sh
```

Equivalently, as discrete variables: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`,
`PGDATABASE`. The URI form is preferred because it is what the Neon console hands
you, including any `sslmode` and `channel_binding` settings. Your pooled
(`-pooler`) string works too, since the pipeline keeps no session state between
statements, though the direct endpoint is marginally faster for a bulk load as it
skips a proxy hop.

> **Heads-up:** this needs outbound TCP on **port 5432**. Corporate VPNs and some
> firewalls silently drop Postgres traffic even when the port still appears open
> (`Test-NetConnection` will say `True` and `psql` will still fail with *"server
> closed the connection unexpectedly"*). Neon's serverless WebSocket driver on
> port 443 is **not** a fallback for this — it does not implement the
> `COPY FROM STDIN` subprotocol, so `\copy` cannot work through it.

### 3. The dashboard

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:8080 |
| API | http://localhost:8000 |
| Interactive API docs | http://localhost:8000/docs |

The frontend is built with `VITE_API_BASE=/api` and served by nginx, which
proxies `/api/` to the backend. The browser therefore only ever talks to one
origin — there is no CORS in the Docker setup.

> ⚠️ **Do not run `docker compose down --remove-orphans`.** Compose sees `dwh-pg`
> as an orphan because it is not defined in the compose file, and that flag would
> delete your database. Plain `docker compose down` or `stop` is safe.

---

## 🚀 Deploying

The two halves deploy independently: the API to **Render**, the dashboard to
**Vercel**.

### Backend → Render

`render.yaml` is the blueprint — it sits at the repo root and points `rootDir` at
`backend/`. Connect the repo, apply the blueprint, and Render prompts for every
variable marked `sync: false`. It runs `uvicorn` on `$PORT` and uses
`/api/health` as its own health check, so the platform and the external monitor
agree on when the service is down.

### Frontend → Vercel

Set the project **Root Directory** to `frontend/`. `frontend/vercel.json` pins the
build command, output directory, and cache/security headers. There is no rewrite
rule because the dashboard has no client-side router.

### Environment variables

**Backend — required on Render**

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DWH_DIALECT` | no | `postgres` | `postgres` or `mssql` |
| `DWH_HOST` | **yes** | `localhost` | Warehouse hostname |
| `DWH_PORT` | **yes** | `5433` | The *warehouse's* port — **not** Render's `$PORT` |
| `DWH_DATABASE` | no | `datawarehouse` | |
| `DWH_USER` | **yes** | `postgres` | |
| `DWH_PASSWORD` | **yes** | *(none)* | No default on purpose: the service refuses to start rather than fall back to a committed credential |
| `DWH_TIMEOUT` | no | `10` | Seconds before a connection attempt is abandoned |
| `DWH_CORS_ORIGINS` | no | `*` | Comma-separated allowlist; narrow to the Vercel domain in production |

**Frontend — Vercel**

| Variable | Required | Default | Notes |
|---|---|---|---|
| `VITE_API_BASE` | **yes, in production** | `http://localhost:8000/api` | Inlined into the bundle **at build time**. Unset, the deployed site makes each visitor's browser call its own `localhost` and every card fails. `npm run build` warns when it is unset |

Anything prefixed `VITE_` is shipped to the browser, so it is public by
definition. Keep the warehouse password on Render only.

### Uptime monitoring

`GET /api/health` and `HEAD /api/health` both work, and both return **503 while
the warehouse is unreachable** — 200 only when it actually answers. In
UptimeRobot: add a monitor for `https://<your-api>/api/health`, monitor type
**HTTP(s)** using a `HEAD` request, 60s interval.

The status code is the contract. It is what UptimeRobot reads, what Render's
health check reads, and what Docker's `HEALTHCHECK` reads, so a
200-with-a-degraded-body would have made all three call a broken dashboard
healthy.

---

## 🔌 API

All routes are `GET` and read-only.

| Route | Returns |
|---|---|
| `/api/health` | Database connectivity and dialect. `GET` and `HEAD`; `503` when the warehouse is unreachable |
| `/api/overview` | Row counts and metadata for all three layers |
| `/api/bronze/tables` | Discovered Bronze tables with row counts |
| `/api/bronze/preview/{table}` | First N rows of a Bronze table |
| `/api/bronze/stats` | Bronze totals |
| `/api/silver/tables` | Discovered Silver tables |
| `/api/silver/schema/{table}` | Column definitions for one table |
| `/api/silver/preview/{table}` | First N rows of a Silver table |
| `/api/silver/stats` | Silver totals, including duplicates removed |
| `/api/silver/comparison` | Bronze vs Silver row counts per table |
| `/api/gold/kpis` | Headline metrics |
| `/api/gold/trend` | Time series over a chosen metric |
| `/api/gold/distribution` | Value distribution by a chosen dimension |
| `/api/gold/top-performers` | Ranked dimension members with share of total |
| `/api/gold/tables` | Gold objects |
| `/api/gold/preview/{table}` | First N rows of a Gold object |
| `/api/gold/stats` | Gold totals |

Table and column names arrive as path parameters, so they are validated against
the catalog before being interpolated into SQL — the API is read-only and
identifiers are allowlisted rather than escaped.

### Tests

```bash
cd backend && python -m pytest test_api.py -q
```

Set `DWH_PASSWORD` first (or copy `backend/.env.example` to `backend/.env` and
export it) — the app ships no default credential, so the suite cannot connect
without it.

The suite runs against the live database. It skips the empty-warehouse cases when
no data is loaded, and asserts on arithmetic invariants (Bronze rows minus
removed duplicates equals Silver rows) rather than hardcoded totals, so it stays
valid as the data changes.

---

## 🔄 Conversion notes: SQL Server → PostgreSQL

The warehouse was originally written for SQL Server and ported to PostgreSQL so it
could run on Neon. `tests/parity_fingerprint.sql` is written in the SQL subset both
engines accept unchanged, so its output can be diffed between the two databases.
Running it against both, the entire warehouse matches on:

- every row count and key cardinality
- all date ranges
- the sales money reconciliation (`SUM(sales_amount) = 29,356,250`)
- every normalised value domain
- the product SCD windows, including the count of currently-active products
- the full `gold.fact_sales` aggregate, including NULL surrogate keys

**The only difference is one row PostgreSQL has and SQL Server did not.** The
final line of `datasets/source_erp/CUST_AZ12.csv` is `AW00029483,1965-06-06,` —
no trailing newline, empty `GEN` field. `BULK INSERT` silently discarded it;
`\copy` loads it. So the conversion recovered a customer the old pipeline had been
dropping on every run. A further row in `cust_info.csv` was dropped the same way,
but it happened to be a duplicate, so it never changed the silver output.

A few things that did *not* translate directly, and are commented in the SQL:

| SQL Server | PostgreSQL | Why it matters |
|---|---|---|
| `LEN(int_col)` | `length(int_col::text)` | There is no `length(integer)` overload, so it errors otherwise |
| `DATETIME - 1` | `DATETIME - INTERVAL '1 day'` | `date - integer` works, but `timestamp - integer` is not a defined operator |
| implicit `numeric`→`integer` on INSERT | explicit `::integer` | PostgreSQL refuses the implicit narrowing, so the cast is now visible |
| `RAISERROR` in an `IF` block | `public.assert_true()` function | There is no plain-SQL equivalent; the function raises instead |
| `TRY/CATCH` + `THROW` | `\set ON_ERROR_STOP on` | psql aborts and exits non-zero on the first error |
| `ROWTERMINATOR = '0x0D0A'` | not needed | PostgreSQL's CSV reader handles CRLF natively and does not leak the CR into the last field |
| `NVARCHAR` / `DATETIME2` / `INT` | `varchar` / `timestamp` / `integer` | Straight type mapping |

The loaders are deliberately plain `INSERT` statements rather than stored
procedures, because the transformations are a fixed sequence of steps and psql
runs a file top to bottom. There is nothing to gain from a procedure here.

---

## 🧰 Tools

| Tool | Used for |
|---|---|
| PostgreSQL 17 | The database engine this project targets |
| Docker + Docker Compose | Running PostgreSQL and deploying the dashboard |
| psql | Writing and running the pipeline |
| FastAPI + psycopg 3 | The read-only API |
| React + Recharts | The dashboard |
| nginx | Serving the built SPA and proxying the API |
| Neon | Hosted PostgreSQL, so the warehouse can run in the cloud |

---

## 📈 What the dashboard can answer

- How many rows sit in each layer, and how many the cleaning removed
- What a row actually looks like in Bronze versus Silver
- Which products, customers, and categories drive revenue
- How sales trend over time
- Which region or product line performs best

---

## 🧠 Notes for the reader

Two things that will save you time if you change this:

- **`docs/data_catalog.md` documents the real column types.** The Gold layer is
  built from views over Silver, so all of its columns are nullable — a missing
  attribute is `NULL`, not a dropped row.
- **Never add a `-webkit-backdrop-filter` line next to `backdrop-filter` in
  `frontend/src/index.css`.** The CSS minifier collapses the two into the
  prefixed form, Chrome then discards it as unsupported, and the glass effect
  disappears with no error anywhere in the build or console.

---

## 📄 Credits and licence

This project was inspired by an earlier SQL Server data-warehouse portfolio
project by **Baraa Khatib Salkini**, which provided the original medallion
structure, the SQL scripts, and the sample CRM/ERP datasets.

The PostgreSQL conversion, the refreshed source data, the FastAPI service, and
the entire dashboard are original work for this repository.

> **No licence file is currently included.** Under default copyright that means
> all rights reserved — you hold the rights, and nobody else may legally reuse
> or redistribute this. Add a `LICENSE` file (MIT, Apache-2.0, or whatever you
> prefer) to grant others permission.

---

## 📬 Contact

- 📧 [akhterwasim797@gmail.com](mailto:akhterwasim797@gmail.com)
- 💼 [linkedin.com/in/akhterwasim](https://linkedin.com/in/akhterwasim)
