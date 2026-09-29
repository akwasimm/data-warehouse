# Data Catalog — Gold Layer

## Overview

The Gold layer is the business-facing view of the warehouse: two dimension tables
and one fact table, exposed as **views** over the cleaned Silver layer.

All types below are read from `information_schema.columns` against PostgreSQL 17
and match the live schema. The previous revision of this file documented SQL Server
types (`NVARCHAR`, `INT` surrogate keys, `DATETIME`) that no longer exist here.

Silver carries no enforced keys, so every column in these views is nullable — a
missing dimension attribute surfaces as `NULL` rather than a rejected row.

---

### 1. `gold.dim_customers`
- **Rows:** 18,484
- **Purpose:** Customer details with demographic and geographic attributes, one row per deduplicated customer record.
- **Grain:** one row per `customer_number`.

| Column | Type | Description |
|---|---|---|
| `customer_key` | `bigint` | Surrogate key uniquely identifying the customer record. |
| `customer_id` | `integer` | Numeric identifier from the source system. |
| `customer_number` | `varchar(50)` | Alphanumeric customer code (e.g. `AW00011782`); the business key. |
| `first_name` | `varchar(50)` | Customer's first name as recorded at source. |
| `last_name` | `varchar(50)` | Customer's last name. |
| `country` | `varchar(50)` | Country of residence (e.g. `Australia`). |
| `marital_status` | `varchar(50)` | `Married`, `Single`, or `n/a` where unrecorded. |
| `gender` | `varchar` | `Male`, `Female`, or `n/a`. Unbounded length in the source. |
| `birthdate` | `date` | Date of birth. |
| `create_date` | `date` | Date the record was created in the source system. |

> 5 duplicate `customer_number` values (6 rows) are collapsed during Silver
> cleaning, which is why the customer count is lower than the Bronze row count.

---

### 2. `gold.dim_products`
- **Rows:** 295
- **Purpose:** Product attributes and their slowly-changing-dimension history.
- **Grain:** one row per `product_number` per `start_date`.

| Column | Type | Description |
|---|---|---|
| `product_key` | `bigint` | Surrogate key uniquely identifying the product version. |
| `product_id` | `integer` | Numeric identifier from the source system. |
| `product_number` | `varchar(50)` | Structured product code (e.g. `PK-5344-B`). |
| `product_name` | `varchar(50)` | Descriptive product name including type, colour, size. |
| `category_id` | `varchar(50)` | Identifier for the product's top-level category. |
| `category` | `varchar(50)` | Broad classification (e.g. `Bikes`, `Components`). |
| `subcategory` | `varchar(50)` | Finer classification within the category. |
| `maintenance` | `varchar(50)` | Whether the product requires maintenance (`Yes` / `No`). |
| `cost` | `integer` | Unit cost in whole currency units. |
| `product_line` | `varchar(50)` | Product series (e.g. `Road`, `Mountain`). |
| `start_date` | `date` | Date this product version became effective. |

> This is an SCD table: a product that changes category keeps its old row and
> gains a new one with a later `start_date`. Count *active* products by taking
> the latest `start_date` per `product_number`, not `COUNT(*)`.

---

### 3. `gold.fact_sales`
- **Rows:** 60,398
- **Purpose:** One row per sales-order line, joined to both dimensions.
- **Grain:** one row per `order_number` + `product_key`.

| Column | Type | Description |
|---|---|---|
| `order_number` | `varchar(50)` | Sales-order identifier (e.g. `SO54496`). |
| `product_key` | `bigint` | Surrogate key → `dim_products.product_key`. |
| `customer_key` | `bigint` | Surrogate key → `dim_customers.customer_key`. |
| `order_date` | `date` | Date the order was placed. |
| `shipping_date` | `date` | Date the order shipped. |
| `due_date` | `date` | Date payment was due. |
| `sales_amount` | `integer` | Line revenue in whole currency units. |
| `quantity` | `integer` | Units ordered on the line. |
| `price` | `integer` | Price per unit in whole currency units. |

> Money is stored as `integer` whole units, matching the source extracts — there
> are no minor currency units. `SUM(sales_amount)` across all rows reconciles to
> **29,356,250**.

---

## Verifying this catalog

To confirm the documented row counts still hold:

```sql
SELECT 'dim_customers' AS object, COUNT(*) FROM gold.dim_customers
UNION ALL SELECT 'dim_products',  COUNT(*) FROM gold.dim_products
UNION ALL SELECT 'fact_sales',    COUNT(*) FROM gold.fact_sales;
```

To confirm the documented types:

```sql
SELECT table_name, column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'gold'
ORDER BY table_name, ordinal_position;
```
