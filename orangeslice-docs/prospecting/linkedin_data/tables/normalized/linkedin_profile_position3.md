---
name: linkedin_profile_position3
description: Employment history table (~2.6B rows). Bridge for person↔company joins. Indexed on linkedin_company_id and linkedin_profile_id.
---

# linkedin_profile_position3

Use: Find people at companies, employment history. Join bridge for person↔company.
Alias: `pos`
Rows: ~2.6B

## Indexed

linkedin_company_id(35ms) | linkedin_profile_id(500ms)

## Columns

id bigint PK | linkedin_profile_id int FK | linkedin_company_id int FK | title text | company_name text | locality text | summary text | start_date date | end_date date | is_current bool

## ⚠️ Critical

- `end_date IS NULL` = current employee
- `end_date IS NOT NULL` = alumni/former
- `title ILIKE` ONLY fast AFTER `linkedin_company_id` filter. Without→timeout
- Same person can have multiple current positions→GROUP BY or use subquery
