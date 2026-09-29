/*
===============================================================================
Quality Checks - Gold Layer
===============================================================================
Script Purpose:
    This script performs quality checks to validate the integrity, consistency,
    and accuracy of the Gold Layer. These checks ensure:
    - Uniqueness of surrogate keys in dimension tables.
    - Referential integrity between fact and dimension tables.
    - Validation of relationships in the data model for analytical purposes.

Usage Notes:
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
-- Checking 'gold.dim_customers'
-- ====================================================================
-- Check for Uniqueness of Customer Key in gold.dim_customers
-- Expectation: No results
SELECT
    customer_key,
    COUNT(*) AS duplicate_count
FROM gold.dim_customers
GROUP BY customer_key
HAVING COUNT(*) > 1;

-- ====================================================================
-- Checking 'gold.product_key'
-- ====================================================================
-- Check for Uniqueness of Product Key in gold.dim_products
-- Expectation: No results
SELECT
    product_key,
    COUNT(*) AS duplicate_count
FROM gold.dim_products
GROUP BY product_key
HAVING COUNT(*) > 1;

-- ====================================================================
-- Checking 'gold.fact_sales'
-- ====================================================================
-- Check the data model connectivity between fact and dimensions
-- Expectation: No Results
SELECT *
FROM gold.fact_sales f
LEFT JOIN gold.dim_customers c
ON c.customer_key = f.customer_key
LEFT JOIN gold.dim_products p
ON p.product_key = f.product_key
WHERE p.product_key IS NULL OR c.customer_key IS NULL;

-- ====================================================================
-- Automated Gate (exit non-zero on failure)
-- ====================================================================
-- Every SELECT above is for human reading: it prints offending rows but
-- still exits 0, so a plain query reports success even when a check fails.
-- This block re-asserts the same logic so a regression fails the build.
-- It does NOT mirror the gold orphan SELECT above literally. The two
-- key-uniqueness checks are asserted against the gold views directly, but
-- the fact-to-dimension orphan invariant is asserted against silver: see
-- the note on the two assertions at the end of this block.

-- gold.dim_customers: customer_key is unique
SELECT public.assert_true(
    NOT EXISTS (SELECT 1 FROM gold.dim_customers GROUP BY customer_key HAVING COUNT(*) > 1),
    'FAIL: gold.dim_customers.customer_key contains duplicates');

-- gold.dim_products: product_key is unique
SELECT public.assert_true(
    NOT EXISTS (SELECT 1 FROM gold.dim_products GROUP BY product_key HAVING COUNT(*) > 1),
    'FAIL: gold.dim_products.product_key contains duplicates');

-- Every fact row resolves to a customer and a product.
-- Asserted against silver, not gold, because gold.fact_sales is expensive to
-- reference: its source joins already expand gold.dim_customers and
-- gold.dim_products, and both dimension views compute row_number() over their
-- entire result set, so every reference re-runs two window functions and
-- rebuilds the join. The assertions below are equivalent to the gold orphan
-- check but run against plain tables with no window functions, so they return
-- in milliseconds.

-- gold.fact_sales.product_key is NULL exactly when a sales row matches no
-- CURRENT product (gold.dim_products keeps only rows where prd_end_dt IS NULL)
SELECT public.assert_true(
    NOT EXISTS (
        SELECT 1
        FROM silver.crm_sales_details sd
        LEFT JOIN silver.crm_prd_info pn
            ON pn.prd_key = sd.sls_prd_key
           AND pn.prd_end_dt IS NULL
        WHERE pn.prd_key IS NULL
    ),
    'FAIL: a silver.crm_sales_details row matches no current silver.crm_prd_info product, so gold.fact_sales.product_key would be NULL');

-- gold.fact_sales.customer_key is NULL exactly when a sales row matches no customer
SELECT public.assert_true(
    NOT EXISTS (
        SELECT 1
        FROM silver.crm_sales_details sd
        LEFT JOIN silver.crm_cust_info ci
            ON ci.cst_id = sd.sls_cust_id
        WHERE ci.cst_id IS NULL
    ),
    'FAIL: a silver.crm_sales_details row matches no silver.crm_cust_info customer, so gold.fact_sales.customer_key would be NULL');
