# Recon Report — data-warehouse (adoption)

Unit: `recon-adoption` · Capability: forge-recon · Phase: adoption · 2026-09-29

## Area

Whole repository (human-declared scope: "reinitialize forge in this folder"). T-SQL / SQL Server medallion data warehouse: CSV sources → bronze → silver → gold.

## Entry point

`scripts/init_database.sql` — drops and recreates the `DataWarehouse` database (single-user, rollback immediate), creates `bronze`/`silver`/`gold` schemas. Then, in order: bronze DDL → `bronze.load_bronze` → silver DDL → `silver.load_silver` → gold DDL (views) → quality checks.

## Owns

The ETL pipeline from 6 CSV files (`datasets/source_crm/`, `datasets/source_erp/`) through three layers to gold views (`gold.dim_customers`, `gold.dim_products`, `gold.fact_sales`), plus the quality-check scripts that validate each layer.

## Conventions (house rules — violations break the pipeline)

- **Schema per layer**: `bronze`, `silver`, `gold`. All 8 scripts depend on it.
- **DDL drop-then-create**: `IF OBJECT_ID(...) IS NOT NULL DROP ...` then `CREATE`. All 3 DDL scripts.
- **Load procs**: `bronze.load_bronze`, `silver.load_silver`, via `CREATE OR ALTER`. TRUNCATE-then-insert.
- **Technical column**: `dwh_create_date DATETIME2 DEFAULT GETDATE()` on every silver table.
- **Instrumentation**: `PRINT` timing blocks in both procs.
- **Naming** (documented in `docs/naming_conventions.md`): snake_case; bronze/silver `<sourcesystem>_<entity>`; gold `<category>_<entity>`; surrogate keys `<table>_key`; technical columns `dwh_*`; procs `load_<layer>`.
- **Data normalization**: silver proc maps missing/blank values to `'n/a'` via CASE.

## Accidents (violations of the house rules — findings, not conventions)

- `tests/quality_checks_silver.sql` queries `bronze.crm_sales_details` inside a silver-layer test (mixed layer).
- `scripts/silver/proc_load_silver.sql` CATCH block prints "ERROR OCCURED DURING LOADING BRONZE LAYER" (copy-paste from bronze).
- `README.md` structure section lists `scripts/01_bronze_load.sql`, `02_silver_clean.sql`, `03_gold_model.sql` — none exist; actual layout is `scripts/{bronze,silver,gold}/`.
- BULK INSERT paths hard-coded to `C:\sql\dwh_project\datasets\...` in `proc_load_bronze.sql` — machine-specific.

## Tests

- `tests/quality_checks_silver.sql`: null/duplicate PKs, whitespace, standardization, date-order sanity, sales = quantity × price.
- `tests/quality_checks_gold.sql`: surrogate-key uniqueness, fact-to-dimension referential integrity.
- **Not runnable in this environment**: no sqlcmd, no MSSQL service. Scripts are manual SELECTs with "Expectation: No Results" comments — no assertion mechanism, no exit codes. Requires a SQL Server instance.
- Untested: nothing automated; no CI.

## Constraints

- `init_database.sql` drops the entire `DataWarehouse` database — destructive by design; never run against a shared instance without confirmation.
- BULK INSERT requires the server process to read `C:\sql\dwh_project\datasets\...` — paths must exist on the server machine.
- No build/lint/test runner; suite requires a SQL Server instance.
- Datasets are the only source data; 6 CSVs.

## Open

- Whether the quality-check suite passes on a real SQL Server instance — cannot be determined here; requires an instance.

## Not read

- `docs/*.png`, `docs/*.pdf` (binary diagrams — not needed for the map).
- `datasets/*.csv` contents (data, not structure; shape defined by DDL).