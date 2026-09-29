/*
===============================================================================
Cross-Engine Parity Fingerprint
===============================================================================
Script Purpose:
    Emits a deterministic summary of every layer so the output can be diffed
    between engines. The conversion from SQL Server to PostgreSQL is only
    trustworthy if both engines produce the same numbers, not merely the same
    row counts.

    This file is deliberately restricted to the SQL subset that both engines
    accept unchanged: no engine-specific functions, no date functions, no
    procedural blocks. It is therefore a single file that can be run as-is
    against SQL Server and against PostgreSQL and the two outputs compared.

    The high-risk areas this pins down:
      - row counts, including the deduplication of crm_cust_info
      - date ranges, including the birthdate plausibility window
      - the sales money reconciliation (sums of sales / quantity / price)
      - the closed value domains produced by the silver CASE expressions,
        which is where case-insensitive SQL Server collation and
        case-sensitive PostgreSQL comparison could silently diverge
      - the product SCD window built with lead(), and the count of current
        (open-ended) products that gold.dim_products filters to
      - gold fact/dimension resolution, including NULL surrogate keys

Usage:
    Run the same file against both engines, capture output, and diff.
===============================================================================
*/

-- ---------------------------------------------------------------------------
-- 1. Row counts and key integrity
-- ---------------------------------------------------------------------------
SELECT 'silver.crm_cust_info' AS check_name, COUNT(*) AS row_count,
       COUNT(cst_id) AS pk_not_null, COUNT(DISTINCT cst_id) AS pk_distinct
FROM silver.crm_cust_info
UNION ALL
SELECT 'silver.crm_prd_info', COUNT(*), COUNT(prd_id), COUNT(DISTINCT prd_id)
FROM silver.crm_prd_info
UNION ALL
SELECT 'silver.crm_sales_details', COUNT(*), COUNT(sls_ord_num), COUNT(DISTINCT sls_ord_num)
FROM silver.crm_sales_details
UNION ALL
SELECT 'silver.erp_loc_a101', COUNT(*), COUNT(cid), COUNT(DISTINCT cid)
FROM silver.erp_loc_a101
UNION ALL
SELECT 'silver.erp_cust_az12', COUNT(*), COUNT(cid), COUNT(DISTINCT cid)
FROM silver.erp_cust_az12
UNION ALL
SELECT 'silver.erp_px_cat_g1v2', COUNT(*), COUNT(id), COUNT(DISTINCT id)
FROM silver.erp_px_cat_g1v2
ORDER BY check_name;

-- ---------------------------------------------------------------------------
-- 2. Date ranges
-- ---------------------------------------------------------------------------
SELECT 'silver.crm_cust_info' AS check_name, MIN(cst_create_date) AS min_date, MAX(cst_create_date) AS max_date
FROM silver.crm_cust_info
UNION ALL
SELECT 'silver.crm_prd_info', MIN(prd_start_dt), MAX(prd_start_dt)
FROM silver.crm_prd_info
UNION ALL
SELECT 'silver.crm_sales_details', MIN(sls_order_dt), MAX(sls_order_dt)
FROM silver.crm_sales_details
UNION ALL
SELECT 'silver.erp_cust_az12', MIN(bdate), MAX(bdate)
FROM silver.erp_cust_az12
ORDER BY check_name;

-- ---------------------------------------------------------------------------
-- 3. Sales measures and date nullability
-- ---------------------------------------------------------------------------
SELECT COUNT(*) AS row_count,
       SUM(sls_sales) AS sum_sales,
       SUM(sls_quantity) AS sum_quantity,
       SUM(sls_price) AS sum_price,
       SUM(CASE WHEN sls_order_dt IS NULL THEN 1 ELSE 0 END) AS null_order_dt,
       SUM(CASE WHEN sls_ship_dt  IS NULL THEN 1 ELSE 0 END) AS null_ship_dt,
       SUM(CASE WHEN sls_due_dt   IS NULL THEN 1 ELSE 0 END) AS null_due_dt
FROM silver.crm_sales_details;

-- ---------------------------------------------------------------------------
-- 4. Normalized value domains
-- ---------------------------------------------------------------------------
SELECT 'cst_marital_status' AS domain, cst_marital_status AS value_found, COUNT(*) AS row_count
FROM silver.crm_cust_info GROUP BY cst_marital_status
UNION ALL
SELECT 'cst_gndr', cst_gndr, COUNT(*)
FROM silver.crm_cust_info GROUP BY cst_gndr
UNION ALL
SELECT 'prd_line', prd_line, COUNT(*)
FROM silver.crm_prd_info GROUP BY prd_line
UNION ALL
SELECT 'erp_gen', gen, COUNT(*)
FROM silver.erp_cust_az12 GROUP BY gen
UNION ALL
SELECT 'erp_cntry', cntry, COUNT(*)
FROM silver.erp_loc_a101 GROUP BY cntry
UNION ALL
SELECT 'erp_maintenance', maintenance, COUNT(*)
FROM silver.erp_px_cat_g1v2 GROUP BY maintenance
ORDER BY domain, value_found;

-- ---------------------------------------------------------------------------
-- 5. Product slowly-changing-dimension window
-- ---------------------------------------------------------------------------
SELECT COUNT(*) AS row_count,
       SUM(CASE WHEN prd_end_dt IS NULL THEN 1 ELSE 0 END) AS current_products,
       SUM(CASE WHEN prd_end_dt IS NOT NULL THEN 1 ELSE 0 END) AS historical_products,
       SUM(prd_cost) AS sum_cost,
       COUNT(DISTINCT prd_key) AS distinct_product_keys,
       COUNT(DISTINCT cat_id) AS distinct_category_ids
FROM silver.crm_prd_info;

-- ---------------------------------------------------------------------------
-- 6. Gold dimensions
-- ---------------------------------------------------------------------------
SELECT 'gold.dim_customers' AS view_name, COUNT(*) AS row_count
FROM gold.dim_customers
UNION ALL
SELECT 'gold.dim_products', COUNT(*)
FROM gold.dim_products
ORDER BY view_name;

SELECT gender AS value_found, COUNT(*) AS row_count
FROM gold.dim_customers
GROUP BY gender
ORDER BY gender;

SELECT product_line AS value_found, COUNT(*) AS row_count
FROM gold.dim_products
GROUP BY product_line
ORDER BY product_line;

-- ---------------------------------------------------------------------------
-- 7. Gold fact table
-- ---------------------------------------------------------------------------
-- Expensive: gold.fact_sales expands both dimension views, each of which
-- computes row_number() over its whole result set.
SELECT COUNT(*) AS row_count,
       SUM(sales_amount) AS sum_sales_amount,
       SUM(quantity) AS sum_quantity,
       SUM(price) AS sum_price,
       SUM(CASE WHEN customer_key IS NULL THEN 1 ELSE 0 END) AS null_customer_key,
       SUM(CASE WHEN product_key  IS NULL THEN 1 ELSE 0 END) AS null_product_key,
       MIN(order_date) AS min_order_date,
       MAX(order_date) AS max_order_date
FROM gold.fact_sales;
