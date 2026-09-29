#!/usr/bin/env sh
# =============================================================================
# Run the full warehouse pipeline and both quality gates.
# =============================================================================
# Must be run from the repository root: the bronze loader resolves CSV paths
# relative to the current directory.
#
#   Local Docker:  the database is the standalone `dwh-pg` container, not a
#                  compose service:
#                      docker run -d --name dwh-pg -p 5433:5432 \
#                        -e POSTGRES_PASSWORD=DwhDev2026 -e POSTGRES_DB=datawarehouse \
#                        postgres:17-alpine
#                      PGPORT=5433 sh scripts/run_all.sh
#
#   Neon:          PGHOST=<host> PGPORT=5432 PGUSER=<user> PGPASSWORD=<pw> \
#                  PGDATABASE=<db> sh scripts/run_all.sh
#
# Every value below is a default that the environment can override. The script
# aborts on the first error, so a failure anywhere stops the run and returns a
# non-zero exit status.
# =============================================================================
set -eu

: "${PGDATABASE:=datawarehouse}"
: "${PGUSER:=postgres}"
: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGPASSWORD:=DwhDev2026}"
export PGDATABASE PGUSER PGHOST PGPORT PGPASSWORD

if [ ! -d datasets ]; then
    echo "ERROR: no 'datasets' directory here. Run this from the repository root." >&2
    exit 2
fi

psql -v ON_ERROR_STOP=1 -f scripts/init_database.sql
psql -v ON_ERROR_STOP=1 -f scripts/bronze/ddl_bronze.sql
psql -v ON_ERROR_STOP=1 -f scripts/bronze/load_bronze.sql
psql -v ON_ERROR_STOP=1 -f scripts/silver/ddl_silver.sql
psql -v ON_ERROR_STOP=1 -f scripts/silver/load_silver.sql
psql -v ON_ERROR_STOP=1 -f scripts/gold/ddl_gold.sql

echo
echo '================================================'
echo 'Running Quality Gates'
echo '================================================'
psql -v ON_ERROR_STOP=1 -f tests/quality_checks_silver.sql
psql -v ON_ERROR_STOP=1 -f tests/quality_checks_gold.sql

echo
echo '================================================'
echo 'Pipeline and quality gates passed'
echo '================================================'
