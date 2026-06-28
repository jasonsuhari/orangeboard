---
name: linkedin_industry
description: Industry code reference table. Common codes - 4=Software, 6=IT Services, 96=IT Consulting. Use for tech company filtering.
---

# linkedin_industry

Use: Industry code reference. Join via `industry_code` from linkedin_company.

## Columns

id int PK=industry_code | name varchar | group varchar | description text | alt_names text[] | company_count int | hierarchy int[]

## Common Codes

4=Computer Software | 6=IT & Services | 96=IT Consulting | 25=Manufacturing | 48=Construction | 44=Real Estate

## ⚠️ Critical

- Use `industry_code` NOT `linkedin_industry_id` when joining from linkedin_company
- `WHERE lc.industry_code IN (4, 6, 96)` for tech companies
