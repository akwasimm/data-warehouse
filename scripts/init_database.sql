/*
=============================================================
Create Schemas (PostgreSQL)
=============================================================
Script Purpose:
    This script (re)creates the three medallion schemas:
    'bronze', 'silver', and 'gold'.

    PostgreSQL has no portable 'DROP DATABASE' from inside a
    connection to that database, so this script drops and recreates
    the schemas instead. That is the correct unit of reset for a
    hosted database such as Neon, where the database itself is
    provisioned for you and must not be dropped.

Usage:
    psql -v ON_ERROR_STOP=1 -f scripts/init_database.sql

WARNING:
    Running this script will drop the entire 'bronze', 'silver' and
    'gold' schemas, including all data they contain. All data in
    those schemas will be permanently deleted. Proceed with caution
    and ensure you have proper backups before running this script.
*/

DROP SCHEMA IF EXISTS bronze CASCADE;
DROP SCHEMA IF EXISTS silver CASCADE;
DROP SCHEMA IF EXISTS gold  CASCADE;

CREATE SCHEMA bronze;
CREATE SCHEMA silver;
CREATE SCHEMA gold;
