/*
===============================================================================
Load Silver Layer (Bronze -> Silver)
===============================================================================
Script Purpose:
    This script performs the ETL (Extract, Transform, Load) process to
    populate the 'silver' schema tables from the 'bronze' schema.
    Actions Performed:
        - Truncates Silver tables.
        - Inserts transformed and cleansed data from Bronze into Silver tables.

    The previous implementation was a T-SQL stored procedure. PostgreSQL has no
    portable equivalent, so the transformations are now plain INSERT statements
    that psql runs in file order. `\set ON_ERROR_STOP on` replaces the
    procedure's TRY/CATCH + THROW: psql aborts the script and exits non-zero on
    the first error, instead of printing a message and exiting 0.

Usage:
    psql -v ON_ERROR_STOP=1 -f scripts/silver/load_silver.sql
===============================================================================
*/
\set ON_ERROR_STOP on

\echo '================================================'
\echo 'Loading Silver Layer'
\echo '================================================'

\echo '------------------------------------------------'
\echo 'Loading CRM Tables'
\echo '------------------------------------------------'

-- Loading silver.crm_cust_info
\echo '>> Truncating Table: silver.crm_cust_info'
TRUNCATE TABLE silver.crm_cust_info;
\echo '>> Inserting Data Into: silver.crm_cust_info'
INSERT INTO silver.crm_cust_info (
    cst_id,
    cst_key,
    cst_firstname,
    cst_lastname,
    cst_marital_status,
    cst_gndr,
    cst_create_date
)
SELECT
    cst_id,
    cst_key,
    trim(cst_firstname) AS cst_firstname,
    trim(cst_lastname) AS cst_lastname,
    CASE
        WHEN upper(trim(cst_marital_status)) = 'S' THEN 'Single'
        WHEN upper(trim(cst_marital_status)) = 'M' THEN 'Married'
        ELSE 'n/a'
    END AS cst_marital_status, -- Normalize marital status values to readable format
    CASE
        WHEN upper(trim(cst_gndr)) = 'F' THEN 'Female'
        WHEN upper(trim(cst_gndr)) = 'M' THEN 'Male'
        ELSE 'n/a'
    END AS cst_gndr, -- Normalize gender values to readable format
    cst_create_date
FROM (
    SELECT
        *,
        row_number() OVER (PARTITION BY cst_id ORDER BY cst_create_date DESC) AS flag_last
    FROM bronze.crm_cust_info
    WHERE cst_id IS NOT NULL
) t
WHERE flag_last = 1; -- Select the most recent record per customer

-- Loading silver.crm_prd_info
\echo '>> Truncating Table: silver.crm_prd_info'
TRUNCATE TABLE silver.crm_prd_info;
\echo '>> Inserting Data Into: silver.crm_prd_info'
INSERT INTO silver.crm_prd_info (
    prd_id,
    cat_id,
    prd_key,
    prd_nm,
    prd_cost,
    prd_line,
    prd_start_dt,
    prd_end_dt
)
SELECT
    prd_id,
    replace(substr(prd_key, 1, 5), '-', '_') AS cat_id, -- Extract category ID
    substr(prd_key, 7, length(prd_key)) AS prd_key,    -- Extract product key
    prd_nm,
    coalesce(prd_cost, 0) AS prd_cost,
    CASE
        WHEN upper(trim(prd_line)) = 'M' THEN 'Mountain'
        WHEN upper(trim(prd_line)) = 'R' THEN 'Road'
        WHEN upper(trim(prd_line)) = 'S' THEN 'Other Sales'
        WHEN upper(trim(prd_line)) = 'T' THEN 'Touring'
        ELSE 'n/a'
    END AS prd_line, -- Map product line codes to descriptive values
    prd_start_dt::date AS prd_start_dt,
    -- `date - integer` means "minus N days" in PostgreSQL, but `timestamp - integer`
    -- is not a defined operator, so the one-day step is spelled as an interval.
    (lead(prd_start_dt) OVER (PARTITION BY prd_key ORDER BY prd_start_dt) - INTERVAL '1 day')
        ::date AS prd_end_dt -- Calculate end date as one day before the next start date
FROM bronze.crm_prd_info;

-- Loading crm_sales_details
\echo '>> Truncating Table: silver.crm_sales_details'
TRUNCATE TABLE silver.crm_sales_details;
\echo '>> Inserting Data Into: silver.crm_sales_details'
WITH src AS (
    SELECT
        sls_ord_num,
        sls_prd_key,
        sls_cust_id,
        sls_order_dt,
        sls_ship_dt,
        sls_due_dt,
        sls_quantity,
        sls_price,
        CASE
            WHEN sls_sales IS NULL OR sls_sales <= 0 OR sls_sales != sls_quantity * abs(sls_price)
                THEN sls_quantity * abs(sls_price)
            ELSE sls_sales
        END AS sls_sales -- Recalculate sales if original value is missing or incorrect
    FROM bronze.crm_sales_details
)
INSERT INTO silver.crm_sales_details (
    sls_ord_num,
    sls_prd_key,
    sls_cust_id,
    sls_order_dt,
    sls_ship_dt,
    sls_due_dt,
    sls_sales,
    sls_quantity,
    sls_price
)
SELECT
    sls_ord_num,
    sls_prd_key,
    sls_cust_id,
    -- length() has no integer overload, so the value is rendered to text first.
    CASE
        WHEN sls_order_dt = 0 OR length(sls_order_dt::text) != 8 THEN NULL
        ELSE to_date(sls_order_dt::text, 'YYYYMMDD')
    END AS sls_order_dt,
    CASE
        WHEN sls_ship_dt = 0 OR length(sls_ship_dt::text) != 8 THEN NULL
        ELSE to_date(sls_ship_dt::text, 'YYYYMMDD')
    END AS sls_ship_dt,
    CASE
        WHEN sls_due_dt = 0 OR length(sls_due_dt::text) != 8 THEN NULL
        ELSE to_date(sls_due_dt::text, 'YYYYMMDD')
    END AS sls_due_dt,
    sls_sales,
    sls_quantity,
    -- The division yields numeric; PostgreSQL will not implicitly narrow that
    -- to integer on insert the way SQL Server did, so the cast is explicit.
    -- Both truncate toward zero.
    CASE
        WHEN sls_price IS NULL OR sls_price <= 0
            THEN (sls_sales * 1.0 / nullif(sls_quantity, 0))::integer
        ELSE sls_price  -- Derive price if original value is invalid
    END AS sls_price
FROM src;

\echo '------------------------------------------------'
\echo 'Loading ERP Tables'
\echo '------------------------------------------------'

-- Loading erp_cust_az12
\echo '>> Truncating Table: silver.erp_cust_az12'
TRUNCATE TABLE silver.erp_cust_az12;
\echo '>> Inserting Data Into: silver.erp_cust_az12'
INSERT INTO silver.erp_cust_az12 (
    cid,
    bdate,
    gen
)
SELECT
    CASE
        WHEN cid LIKE 'NAS%' THEN substr(cid, 4, length(cid)) -- Remove 'NAS' prefix if present
        ELSE cid
    END AS cid,
    CASE
        WHEN bdate > LOCALTIMESTAMP OR bdate < LOCALTIMESTAMP - INTERVAL '100 years' THEN NULL
        ELSE bdate
    END AS bdate, -- Set implausible birthdates to NULL (future, or over 100 years old)
    CASE
        WHEN upper(trim(gen)) IN ('F', 'FEMALE') THEN 'Female'
        WHEN upper(trim(gen)) IN ('M', 'MALE') THEN 'Male'
        ELSE 'n/a'
    END AS gen -- Normalize gender values and handle unknown cases
FROM bronze.erp_cust_az12;

-- Loading erp_loc_a101
\echo '>> Truncating Table: silver.erp_loc_a101'
TRUNCATE TABLE silver.erp_loc_a101;
\echo '>> Inserting Data Into: silver.erp_loc_a101'
INSERT INTO silver.erp_loc_a101 (
    cid,
    cntry
)
SELECT
    replace(cid, '-', '') AS cid,
    CASE
        WHEN trim(cntry) = 'DE' THEN 'Germany'
        WHEN trim(cntry) IN ('US', 'USA') THEN 'United States'
        WHEN trim(cntry) = '' OR cntry IS NULL THEN 'n/a'
        ELSE trim(cntry)
    END AS cntry -- Normalize and Handle missing or blank country codes
FROM bronze.erp_loc_a101;

-- Loading erp_px_cat_g1v2
\echo '>> Truncating Table: silver.erp_px_cat_g1v2'
TRUNCATE TABLE silver.erp_px_cat_g1v2;
\echo '>> Inserting Data Into: silver.erp_px_cat_g1v2'
INSERT INTO silver.erp_px_cat_g1v2 (
    id,
    cat,
    subcat,
    maintenance
)
SELECT
    id,
    cat,
    subcat,
    maintenance
FROM bronze.erp_px_cat_g1v2;

\echo '=========================================='
\echo 'Loading Silver Layer is Completed'
\echo '=========================================='
