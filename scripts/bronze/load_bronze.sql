/*
===============================================================================
Load Bronze Layer (Source CSV -> Bronze)
===============================================================================
Script Purpose:
    This script loads data into the 'bronze' schema from external CSV files.
    It performs the following actions:
    - Truncates the bronze tables before loading data.
    - Uses `\copy` to load the csv files into the bronze tables.

    `\copy` runs on the client and streams the file over the connection, so the
    CSV must be reachable from the machine running psql, not from the server.
    That is what makes these scripts work unchanged against a hosted database
    such as Neon, where server-side `COPY FROM '<file>'` cannot read the file.
    Paths below are relative to the repository root, so run psql from there.

    On CSV parsing: the previous SQL Server version had to hardcode
    `ROWTERMINATOR = '0x0D0A'` to avoid a carriage return being left on the
    last field of every row. PostgreSQL's CSV reader handles CRLF natively and
    does not carry the CR into the last field, so no terminator override is
    needed here.

Usage:
    psql -v ON_ERROR_STOP=1 -f scripts/bronze/load_bronze.sql
===============================================================================
*/
\set ON_ERROR_STOP on

\echo '================================================'
\echo 'Loading Bronze Layer'
\echo '================================================'

\echo '------------------------------------------------'
\echo 'Loading CRM Tables'
\echo '------------------------------------------------'

\echo '>> Truncating Table: bronze.crm_cust_info'
TRUNCATE TABLE bronze.crm_cust_info;
\echo '>> Inserting Data Into: bronze.crm_cust_info'
\copy bronze.crm_cust_info (cst_id, cst_key, cst_firstname, cst_lastname, cst_marital_status, cst_gndr, cst_create_date) FROM 'datasets/source_crm/cust_info.csv' WITH (FORMAT csv, HEADER true)

\echo '>> Truncating Table: bronze.crm_prd_info'
TRUNCATE TABLE bronze.crm_prd_info;
\echo '>> Inserting Data Into: bronze.crm_prd_info'
\copy bronze.crm_prd_info (prd_id, prd_key, prd_nm, prd_cost, prd_line, prd_start_dt, prd_end_dt) FROM 'datasets/source_crm/prd_info.csv' WITH (FORMAT csv, HEADER true)

\echo '>> Truncating Table: bronze.crm_sales_details'
TRUNCATE TABLE bronze.crm_sales_details;
\echo '>> Inserting Data Into: bronze.crm_sales_details'
\copy bronze.crm_sales_details (sls_ord_num, sls_prd_key, sls_cust_id, sls_order_dt, sls_ship_dt, sls_due_dt, sls_sales, sls_quantity, sls_price) FROM 'datasets/source_crm/sales_details.csv' WITH (FORMAT csv, HEADER true)

\echo '------------------------------------------------'
\echo 'Loading ERP Tables'
\echo '------------------------------------------------'

\echo '>> Truncating Table: bronze.erp_loc_a101'
TRUNCATE TABLE bronze.erp_loc_a101;
\echo '>> Inserting Data Into: bronze.erp_loc_a101'
\copy bronze.erp_loc_a101 (cid, cntry) FROM 'datasets/source_erp/LOC_A101.csv' WITH (FORMAT csv, HEADER true)

\echo '>> Truncating Table: bronze.erp_cust_az12'
TRUNCATE TABLE bronze.erp_cust_az12;
\echo '>> Inserting Data Into: bronze.erp_cust_az12'
\copy bronze.erp_cust_az12 (cid, bdate, gen) FROM 'datasets/source_erp/CUST_AZ12.csv' WITH (FORMAT csv, HEADER true)

\echo '>> Truncating Table: bronze.erp_px_cat_g1v2'
TRUNCATE TABLE bronze.erp_px_cat_g1v2;
\echo '>> Inserting Data Into: bronze.erp_px_cat_g1v2'
\copy bronze.erp_px_cat_g1v2 (id, cat, subcat, maintenance) FROM 'datasets/source_erp/PX_CAT_G1V2.csv' WITH (FORMAT csv, HEADER true)

\echo '=========================================='
\echo 'Loading Bronze Layer is Completed'
\echo '=========================================='
