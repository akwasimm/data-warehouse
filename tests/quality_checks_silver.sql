/*
===============================================================================
Quality Checks - Silver Layer
===============================================================================
Script Purpose:
    This script performs various quality checks for data consistency, accuracy,
    and standardization across the 'silver' layer. It includes checks for:
    - Null or duplicate primary keys.
    - Unwanted spaces in string fields.
    - Data standardization and consistency.
    - Invalid date ranges and orders.
    - Data consistency between related fields.

Usage Notes:
    - Run these checks after data loading Silver Layer.
    - Investigate and resolve any discrepancies found during the checks.
    - Exits non-zero if any automated gate fails.
===============================================================================
*/

-- ====================================================================
-- Assert helper
-- ====================================================================
-- Replaces T-SQL RAISERROR, which has no plain-SQL equivalent in PostgreSQL.
-- RAISE EXCEPTION aborts the script; combined with ON_ERROR_STOP the psql
-- process exits non-zero, so a regression fails the build. 'IS NOT TRUE' is
-- used so a NULL condition counts as a failure rather than silently passing.
CREATE OR REPLACE FUNCTION public.assert_true(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    IF condition IS NOT TRUE THEN
        RAISE EXCEPTION '%', message;
    END IF;
END;
$$;

-- ====================================================================
-- Checking 'silver.crm_cust_info'
-- ====================================================================
-- Check for NULLs or Duplicates in Primary Key
-- Expectation: No Results
SELECT
    cst_id,
    COUNT(*)
FROM silver.crm_cust_info
GROUP BY cst_id
HAVING COUNT(*) > 1 OR cst_id IS NULL;

-- Check for Unwanted Spaces
-- Expectation: No Results
SELECT
    cst_key
FROM silver.crm_cust_info
WHERE cst_key != trim(cst_key);

-- Data Standardization & Consistency
SELECT DISTINCT
    cst_marital_status
FROM silver.crm_cust_info;

-- ====================================================================
-- Checking 'silver.crm_prd_info'
-- ====================================================================
-- Check for NULLs or Duplicates in Primary Key
-- Expectation: No Results
SELECT
    prd_id,
    COUNT(*)
FROM silver.crm_prd_info
GROUP BY prd_id
HAVING COUNT(*) > 1 OR prd_id IS NULL;

-- Check for Unwanted Spaces
-- Expectation: No Results
SELECT
    prd_nm
FROM silver.crm_prd_info
WHERE prd_nm != trim(prd_nm);

-- Check for NULLs or Negative Values in Cost
-- Expectation: No Results
SELECT
    prd_cost
FROM silver.crm_prd_info
WHERE prd_cost < 0 OR prd_cost IS NULL;

-- Data Standardization & Consistency
SELECT DISTINCT
    prd_line
FROM silver.crm_prd_info;

-- Check for Invalid Date Orders (Start Date > End Date)
-- Expectation: No Results
SELECT
    *
FROM silver.crm_prd_info
WHERE prd_end_dt < prd_start_dt;

-- ====================================================================
-- Checking 'silver.crm_sales_details'
-- ====================================================================
-- Check for Invalid Dates
-- Expectation: No Invalid Dates
SELECT
    sls_due_dt
FROM silver.crm_sales_details
WHERE sls_due_dt IS NULL
    OR sls_due_dt < '1900-01-01'
    OR sls_due_dt > '2050-01-01';

-- Check for Invalid Date Orders (Order Date > Shipping/Due Dates)
-- Expectation: No Results
SELECT
    *
FROM silver.crm_sales_details
WHERE sls_order_dt > sls_ship_dt
   OR sls_order_dt > sls_due_dt;

-- Check Data Consistency: Sales = Quantity * Price
-- Expectation: No Results
SELECT DISTINCT
    sls_sales,
    sls_quantity,
    sls_price
FROM silver.crm_sales_details
WHERE sls_sales != sls_quantity * sls_price
   OR sls_sales IS NULL
   OR sls_quantity IS NULL
   OR sls_price IS NULL
   OR sls_sales <= 0
   OR sls_quantity <= 0
   OR sls_price <= 0
ORDER BY sls_sales, sls_quantity, sls_price;

-- ====================================================================
-- Checking 'silver.erp_cust_az12'
-- ====================================================================
-- Identify Out-of-Range Dates
-- Expectation: No Results
SELECT DISTINCT
    bdate
FROM silver.erp_cust_az12
WHERE bdate < LOCALTIMESTAMP - INTERVAL '100 years'
   OR bdate > LOCALTIMESTAMP;

-- Data Standardization & Consistency
SELECT DISTINCT
    gen
FROM silver.erp_cust_az12;

-- ====================================================================
-- Checking 'silver.erp_loc_a101'
-- ====================================================================
-- Data Standardization & Consistency
SELECT DISTINCT
    cntry
FROM silver.erp_loc_a101
ORDER BY cntry;

-- ====================================================================
-- Checking 'silver.erp_px_cat_g1v2'
-- ====================================================================
-- Check for Unwanted Spaces
-- Expectation: No Results
SELECT
    *
FROM silver.erp_px_cat_g1v2
WHERE cat != trim(cat)
   OR subcat != trim(subcat)
   OR maintenance != trim(maintenance);

-- Data Standardization & Consistency
SELECT DISTINCT
    maintenance
FROM silver.erp_px_cat_g1v2;

-- ====================================================================
-- Checking 'silver.erp_loc_a101' / 'silver.erp_cust_az12' / 'silver.erp_px_cat_g1v2'
-- ====================================================================
-- Carriage Return Integrity
-- Expectation: No Results
SELECT 'erp_loc_a101.cntry' AS contaminated_column, cntry AS value_found
FROM silver.erp_loc_a101 WHERE cntry LIKE '%' || chr(13) || '%'
UNION ALL
SELECT 'erp_cust_az12.gen', gen
FROM silver.erp_cust_az12 WHERE gen LIKE '%' || chr(13) || '%'
UNION ALL
SELECT 'erp_px_cat_g1v2.maintenance', maintenance
FROM silver.erp_px_cat_g1v2 WHERE maintenance LIKE '%' || chr(13) || '%';

-- ====================================================================
-- Checking 'silver.erp_loc_a101'
-- ====================================================================
-- Check for Raw Country Codes That Should Have Been Normalized
-- Expectation: No Results
SELECT DISTINCT
    cntry
FROM silver.erp_loc_a101
WHERE trim(cntry) IN ('DE', 'US', 'USA');

-- ====================================================================
-- Automated Gate (exit non-zero on failure)
-- ====================================================================
-- Every SELECT above is for human reading: it prints offending rows but
-- still exits 0, so a plain query reports success even when a check fails.
-- This block re-asserts the same logic so a regression fails the build.
-- Only the checks above that carry an '-- Expectation:' comment are
-- mirrored. The 'Data Standardization & Consistency' listings are
-- deliberately excluded: they return rows on every healthy run.

-- silver.crm_cust_info: primary key is populated and unique
SELECT public.assert_true(
    NOT EXISTS (SELECT 1 FROM silver.crm_cust_info GROUP BY cst_id HAVING COUNT(*) > 1 OR cst_id IS NULL),
    'FAIL: silver.crm_cust_info.cst_id contains NULLs or duplicates');

-- silver.crm_cust_info: no leading/trailing whitespace in cst_key
SELECT public.assert_true(
    NOT EXISTS (SELECT 1 FROM silver.crm_cust_info WHERE cst_key != trim(cst_key)),
    'FAIL: silver.crm_cust_info.cst_key contains leading or trailing spaces');

-- silver.crm_prd_info: primary key is populated and unique
SELECT public.assert_true(
    NOT EXISTS (SELECT 1 FROM silver.crm_prd_info GROUP BY prd_id HAVING COUNT(*) > 1 OR prd_id IS NULL),
    'FAIL: silver.crm_prd_info.prd_id contains NULLs or duplicates');

-- silver.crm_prd_info: no leading/trailing whitespace in prd_nm
SELECT public.assert_true(
    NOT EXISTS (SELECT 1 FROM silver.crm_prd_info WHERE prd_nm != trim(prd_nm)),
    'FAIL: silver.crm_prd_info.prd_nm contains leading or trailing spaces');

-- silver.crm_prd_info: cost is present and not negative
SELECT public.assert_true(
    NOT EXISTS (SELECT 1 FROM silver.crm_prd_info WHERE prd_cost < 0 OR prd_cost IS NULL),
    'FAIL: silver.crm_prd_info.prd_cost is NULL or negative');

-- silver.crm_prd_info: product window is not inverted
SELECT public.assert_true(
    NOT EXISTS (SELECT 1 FROM silver.crm_prd_info WHERE prd_end_dt < prd_start_dt),
    'FAIL: silver.crm_prd_info has prd_end_dt earlier than prd_start_dt');

-- silver.crm_sales_details: due date is present and plausible
SELECT public.assert_true(
    NOT EXISTS (SELECT 1 FROM silver.crm_sales_details WHERE sls_due_dt IS NULL OR sls_due_dt < '1900-01-01' OR sls_due_dt > '2050-01-01'),
    'FAIL: silver.crm_sales_details.sls_due_dt is NULL or outside 1900-01-01 to 2050-01-01');

-- silver.crm_sales_details: date order is order <= ship,due
SELECT public.assert_true(
    NOT EXISTS (SELECT 1 FROM silver.crm_sales_details WHERE sls_order_dt > sls_ship_dt OR sls_order_dt > sls_due_dt),
    'FAIL: silver.crm_sales_details has sls_order_dt later than its ship or due date');

-- silver.crm_sales_details: sales reconciles to quantity * price
SELECT public.assert_true(
    NOT EXISTS (
        SELECT 1
        FROM silver.crm_sales_details
        WHERE sls_sales != sls_quantity * sls_price
           OR sls_sales IS NULL
           OR sls_quantity IS NULL
           OR sls_price IS NULL
           OR sls_sales <= 0
           OR sls_quantity <= 0
           OR sls_price <= 0
    ),
    'FAIL: silver.crm_sales_details violates sales = quantity * price or has non-positive measures');

-- silver.erp_cust_az12: birthdate is neither in the future nor over 100 years old
SELECT public.assert_true(
    NOT EXISTS (SELECT 1 FROM silver.erp_cust_az12 WHERE bdate < LOCALTIMESTAMP - INTERVAL '100 years' OR bdate > LOCALTIMESTAMP),
    'FAIL: silver.erp_cust_az12.bdate is outside the plausible range (future, or over 100 years old)');

-- silver.erp_px_cat_g1v2: no leading/trailing whitespace in text columns
SELECT public.assert_true(
    NOT EXISTS (
        SELECT 1
        FROM silver.erp_px_cat_g1v2
        WHERE cat != trim(cat)
           OR subcat != trim(subcat)
           OR maintenance != trim(maintenance)
    ),
    'FAIL: silver.erp_px_cat_g1v2 text columns contain leading or trailing spaces');

-- silver ERP tables: no stray carriage returns in text columns
SELECT public.assert_true(
    NOT EXISTS (
        SELECT 1 FROM silver.erp_loc_a101 WHERE cntry LIKE '%' || chr(13) || '%'
        UNION ALL
        SELECT 1 FROM silver.erp_cust_az12 WHERE gen LIKE '%' || chr(13) || '%'
        UNION ALL
        SELECT 1 FROM silver.erp_px_cat_g1v2 WHERE maintenance LIKE '%' || chr(13) || '%'
    ),
    'FAIL: silver.erp_loc_a101.cntry, silver.erp_cust_az12.gen or silver.erp_px_cat_g1v2.maintenance contains a carriage return');

-- silver.erp_loc_a101: every country code was normalized to a readable name
SELECT public.assert_true(
    NOT EXISTS (SELECT 1 FROM silver.erp_loc_a101 WHERE trim(cntry) IN ('DE', 'US', 'USA')),
    'FAIL: silver.erp_loc_a101.cntry still contains a raw country code');
