---
name: linkedin_crunchbase_funding
description: Funding rounds and investor data. Indexed on linkedin_company_id. Companies appear multiple times - use DISTINCT.
---

# linkedin_crunchbase_funding

Use: Funding rounds, investor data.
Alias: `f`

## Indexed

linkedin_company_id(fast)

## Columns

id int PK | linkedin_company_id int FK | round_name text | round_date date | round_amount text | parsed_round_amount_number bigint=cents | parsed_round_amount_currency text | funding_round_count smallint | investor_names text[] | investor_count smallint | crunchbase_company_name text | crunchbase_company_slug text

## ⚠️ Critical

- Company appears N times (once per funding round)→causes duplicates
- Use subquery: `WHERE lc.id IN (SELECT DISTINCT linkedin_company_id FROM linkedin_crunchbase_funding WHERE ...)`
- `round_name ILIKE '%series a%'` for round type filtering
