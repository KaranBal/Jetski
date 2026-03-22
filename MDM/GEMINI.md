# Project Context

This is a Master Data Management (MDM) API.

## 📋 General Information
- **Entity:** Customer
- **Tech Stack:** 
  - Python
  - FastAPI
  - SQLAlchemy
  - PostgreSQL
  - RecordLinkage (for matching/deduplication)

---

## ⚙️ Survivorship Rules (Merge Logic)

When merging multiple raw records into a single **Golden Record**, the following logic applies:

| Attribute | Rule Type | Logic |
| :--- | :--- | :--- |
| **First Name** | **Highest Trust** | Dictated by the system with the highest `SOURCE_SYSTEMS.reliability_score`. |
| **Last Name** | **Highest Trust** | Dictated by the system with the highest `SOURCE_SYSTEMS.reliability_score`. |
| **Email** | **Highest Trust** | Dictated by the system with the highest `SOURCE_SYSTEMS.reliability_score`. |
| **Phone** | **Recency** | Dictated by the most recently updated system (latest `RAW_CUSTOMER_DATA.ingested_at`). |

---

> [!NOTE]
> Ensure that `RecordLinkage` is configured to run indexing (e.g., blocking on `email` or `zip_code`) before calculating scoring weights to prevent performance degradation on large clusters.
