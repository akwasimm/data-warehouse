# 📊 My Data Warehouse Project

Hey! 👋 This is my data warehouse and analytics project. I built it to learn how to design databases, clean data, and create reports. It's basically a portfolio piece to show I can do real data work!

---

## 🎯 What I Built

I created a complete data pipeline:
- **Took raw data** from six CSV files across two source systems (ERP and CRM)
- **Cleaned it up** - fixed errors, removed duplicates, standardized formats
- **Modeled it** into a star schema (fact + dimension tables)
- **Made reports** with SQL queries to analyze sales, customers, and products

---

## 🏗️ How It's Organized

I used the **Medallion Architecture** (Bronze → Silver → Gold):

```
🥉 Bronze Layer → Raw data, just as it came from CSV files
🥈 Silver Layer → Cleaned and standardized data  
🥇 Gold Layer → Final tables ready for analysis/reporting
```

Think of it like refining gold - you start with raw material and make it better at each step!

---

## 📁 Project Structure

```
data-warehouse/
│
├── datasets/                       # My raw CSV files (ERP + CRM data)
│   ├── source_crm/                 #   CRM extracts
│   │   ├── cust_info.csv
│   │   ├── prd_info.csv
│   │   └── sales_details.csv
│   └── source_erp/                 #   ERP extracts
│       ├── CUST_AZ12.csv
│       ├── LOC_A101.csv
│       └── PX_CAT_G1V2.csv
│
├── docs/                           # Documentation and diagrams
│   ├── data_architecture.png       # How everything connects
│   ├── data_catalog.md             # Table and column reference
│   ├── data_flow.png               # Data movement diagram
│   ├── data_integration.png        # Source system integration
│   ├── data_layers.pdf             # Bronze/Silver/Gold layers
│   ├── data_model.png              # Star schema design
│   ├── ETL.png                     # ETL process diagram
│   ├── naming_conventions.md       # Naming rules I followed
│   └── Project_Notes_Sketches.pdf  # My working notes
│
├── scripts/                        # All my SQL code
│   ├── init_database.sql           # Create the DataWarehouse database
│   ├── bronze/                     # Bronze layer
│   │   ├── ddl_bronze.sql          #   Create bronze tables
│   │   └── proc_load_bronze.sql    #   Load raw CSVs into bronze
│   ├── silver/                     # Silver layer
│   │   ├── ddl_silver.sql          #   Create silver tables
│   │   └── proc_load_silver.sql    #   Clean and transform bronze -> silver
│   └── gold/                       # Gold layer
│       └── ddl_gold.sql            #   Create gold views (star schema)
│
├── tests/                          # Data quality checks
│   ├── quality_checks_silver.sql
│   └── quality_checks_gold.sql
│
└── README.md                       # This file! 😊
```

---

## 🛠️ Tools I Used

Everything is free! 🎉

| Tool | What I Used It For |
|------|-------------------|
| SQL Server Express | Database server |
| SSMS (SQL Server Management Studio) | Write and run SQL queries |
| Draw.io | Make diagrams and architecture |
| Notion | Plan and document my work |
| GitHub | Save my code and track changes |

---

## 📊 What I Learned

- ✅ How to design a data warehouse from scratch
- ✅ ETL process (Extract, Transform, Load)
- ✅ Data cleaning techniques (nulls, duplicates, formatting)
- ✅ Star schema modeling (facts & dimensions)
- ✅ Writing SQL for business analytics
- ✅ Data documentation best practices

---

## 📈 Sample Insights I Can Get

After building this, I can answer questions like:
- Which products sell the most?
- Who are my top customers?
- How are sales trending over time?
- Which regions perform best?

(The `gold` schema exposes `dim_customers`, `dim_products` and `fact_sales` as views, ready to query!)

---

## 🚀 How to Run This

1. Install [SQL Server Express]
2. Install [SSMS]
3. Open the project in SSMS
4. Run the scripts in this order:
   1. `scripts/init_database.sql` — drops and recreates the `DataWarehouse` database, so it is destructive
   2. `scripts/bronze/ddl_bronze.sql`, then `scripts/bronze/proc_load_bronze.sql`, then `EXEC bronze.load_bronze;`
   3. `scripts/silver/ddl_silver.sql`, then `scripts/silver/proc_load_silver.sql`, then `EXEC silver.load_silver;`
   4. `scripts/gold/ddl_gold.sql`
5. Run `tests/quality_checks_silver.sql` and then `tests/quality_checks_gold.sql` to verify data quality

> **Note:** the loaders read the CSVs from `/var/opt/mssql/datasets`, the path inside the SQL Server container I used for development. If you run SQL Server somewhere else, point those paths in `proc_load_bronze.sql` at your own copy of `datasets/`.

---

## 🤝 Connect With Me

I'm still learning and would love feedback!

- 📧 Email: [akhterwasim797@gmail.com](mailto:akhterwasim797@gmail.com)
- 💼 LinkedIn: [https://linkedin.com/in/akhterwasim](https://linkedin.com/in/akhterwasim)


---

## 📄 License

This project is open source - feel free to use it for learning!

---
