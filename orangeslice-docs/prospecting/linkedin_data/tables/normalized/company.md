---
name: company
description: Employee growth metrics table. Has 1/3/6/12/24 month growth rates. Links to linkedin_company via linkedin_id.
---

# company

Use: Employee growth metrics, NAICS codes. Links to linkedin_company via linkedin_id.
Alias: `co`

## Indexed

id | slug | linkedin_id | employee_count

## Columns

id int PK | name varchar | slug varchar | linkedin_id int FK→linkedin_company | employee_count int | employee_growth_01mo real | employee_growth_03mo real | employee_growth_06mo real | employee_growth_12mo real | employee_growth_24mo real | naics_codes int[] | sic_codes int[] | locality varchar | region varchar | country_name varchar | postal_code varchar | rank_fortune int | rank_incmagazine int

## ⚠️ Critical

- US filter: `country_name = 'United States'` (different from linkedin_company)
- Has growth metrics not in linkedin_company
- `linkedin_id` links to `linkedin_company.id`
