# 📊 My Data Warehouse Project

Hey! 👋 This is my data warehouse and analytics project. I built it to learn how to design databases, clean data, and create reports. It's basically a portfolio piece to show I can do real data work!

---

## 🎯 What I Built

I created a complete data pipeline:
- **Took raw data** from two CSV files (ERP and CRM systems)
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
my-data-warehouse/
│
├── datasets/                   # My CSV files (ERP + CRM data)
│
├── docs/                       # Documentation and diagrams
│   ├── data_architecture.png   # How everything connects
│   ├── data_flow.png           # Data movement diagram
│   ├── data_models.png         # Star schema design
│   └── requirements.md         # What the project should do
│
├── scripts/                    # All my SQL code
│   ├── 01_bronze_load.sql      # Load raw data
│   ├── 02_silver_clean.sql     # Clean and transform
│   └── 03_gold_model.sql       # Create final tables
│
├── tests/                      # Data quality checks
│
└── README.md                   # This file! 😊
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

(Check the `scripts/gold/` folder for the actual SQL queries!)

---

## 🚀 How to Run This

1. Install [SQL Server Express]
2. Install [SSMS]
3. Open the project in SSMS
4. Run scripts in order: bronze → silver → gold
5. Check the `tests/` folder to verify data quality

---

## 🤝 Connect With Me

I'm still learning and would love feedback!

- 📧 Email: [akhterwasim797@gmail.com](mailto:akhterwasim797@gmail.com)
- 💼 LinkedIn: [https://linkedin.com/in/akhterwasim](https://linkedin.com/in/akhterwasim)


---

## 📄 License

This project is open source - feel free to use it for learning!

---
