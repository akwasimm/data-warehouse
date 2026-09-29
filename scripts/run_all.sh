#!/usr/bin/env sh
# =============================================================================
# Run the full warehouse pipeline and both quality gates.
# =============================================================================
# Must be run from the repository root: the bronze loader resolves CSV paths
# relative to the current directory.
#
#   Local Docker:  docker compose up -d
#                  docker compose exec postgres sh scripts/run_all.sh
#
#   Neon:          DATABASE_URL='<the connection string Neon gives you>' \
#                  sh scripts/run_all.sh
#
#                  Or, equivalently, as discrete variables:
#                  PGHOST=<host> PGPORT=5432 PGUSER=<user> PGPASSWORD=<pw> \
#                  PGDATABASE=<db> sh scripts/run_all.sh
#
# Every value below is a default that the environment can override. The script
# aborts on the first error, so a failure anywhere stops the run and returns a
# non-zero exit status.
# =============================================================================
set -eu

# If DATABASE_URL is set, pass it to psql as its first argument, which psql reads
# as a conninfo URI and which takes precedence over the PG* variables. The
# defaults below are therefore only used when there is no URI.
if [ -n "${DATABASE_URL:-}" ]; then
    set -- "$DATABASE_URL"
else
    set --
    : "${PGDATABASE:=datawarehouse}"
    : "${PGUSER:=postgres}"
    : "${PGHOST:=localhost}"
    : "${PGPORT:=5432}"
    : "${PGPASSWORD:=DwhDev2026}"
    export PGDATABASE PGUSER PGHOST PGPORT PGPASSWORD
fi

if [ ! -d datasets ]; then
    echo "ERROR: no 'datasets' directory here. Run this from the repository root." >&2
    exit 2
fi

psql "$@" -v ON_ERROR_STOP=1 -f scripts/init_database.sql
psql "$@" -v ON_ERROR_STOP=1 -f scripts/bronze/ddl_bronze.sql
psql "$@" -v ON_ERROR_STOP=1 -f scripts/bronze/load_bronze.sql
psql "$@" -v ON_ERROR_STOP=1 -f scripts/silver/ddl_silver.sql
psql "$@" -v ON_ERROR_STOP=1 -f scripts/silver/load_silver.sql
psql "$@" -v ON_ERROR_STOP=1 -f scripts/gold/ddl_gold.sql

echo
echo '================================================'
echo 'Running Quality Gates'
echo '================================================'
psql "$@" -v ON_ERROR_STOP=1 -f tests/quality_checks_silver.sql
psql "$@" -v ON_ERROR_STOP=1 -f tests/quality_checks_gold.sql

echo
echo '================================================'
echo 'Pipeline and quality gates passed'
echo '================================================'
