---
name: lkd_company
description: Denormalized company table for cross-table queries. Pair with lkd_profile. Never mix with normalized tables.
---

# lkd_company

Use: Cross-table queries with person+company filters. Denormalized world. Pair with `lkd_profile`.
Alias: `lkdc`

## 🛑 BEFORE WRITING YOUR QUERY — VERIFY THESE COLUMNS:

- **Company name?** Use `name` (NOT company_name)
- **Primary key?** Use `linkedin_company_id` (NOT id)
- **LinkedIn URL?** Use `linkedin_url` (NOT universal_name, don't construct)
- **US filter?** Use `WHERE lkdc.country_iso = 'US'`
- **JOIN to person?** Use `lkd_profile` (NOT linkedin_profile)

## ⚠️ COLUMNS DIFFER from linkedin_company

| linkedin_company (lc)               | lkd_company (lkdc)         |
| ----------------------------------- | -------------------------- |
| `lc.id`                             | `lkdc.linkedin_company_id` |
| `lc.company_name`                   | `lkdc.name`                |
| `lc.universal_name`                 | `lkdc.slug`                |
| `lc.country_code`                   | `lkdc.country_iso`         |
| `lc.founded`                        | `lkdc.founded_year`        |
| (construct URL from universal_name) | `lkdc.linkedin_url`        |

## Columns

linkedin_company_id int PK | company_id int FK→company | name varchar | slug varchar | description varchar | website varchar | employee_count int | founded_year int | follower_count int | linkedin_url text | country_iso text | country_name text | locality varchar | type text | ticker varchar | specialties json | industries json | locations json | posts json | crunchbase_funding json

## ⚠️ Critical

- NEVER mix with normalized: `lkd_company JOIN linkedin_profile`→BROKEN
- Always pair with `lkd_profile` for person queries
- Has `linkedin_url` column (don't construct from slug)
- JSON cols have nested data
