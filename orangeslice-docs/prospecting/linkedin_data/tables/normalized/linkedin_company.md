---
name: linkedin_company
description: Company profiles table. Indexed on id, domain, universal_name, ticker. Use for company lookups and filtering.
---

# linkedin_company

Use: Company lookups, filtering by industry/size/location. Normalized world.
Alias: `lc`
Rows: ~millions

## Indexed

id(5ms), domain(10ms), universal_name(36ms), ticker(50ms)

## Columns

id int PK=linkedin_company_id | company_name varchar | universal_name varchar=URL slug | domain varchar | website varchar | description varchar | industry_code int FK→linkedin_industry | employee_count int | follower_count int | locality varchar | region varchar | country_code varchar | country_name varchar | founded int | company_type_code varchar | ticker varchar

## ⚠️ Critical

- `company_name ILIKE` NOT indexed→SLOW. Use domain/universal_name
- `description ILIKE` needs `industry_code` filter or timeout
- Multiple companies share same domain→use `ORDER BY employee_count DESC NULLS LAST LIMIT 1`
- No `linkedin_url` column. Construct: `'https://linkedin.com/company/' || universal_name`
- US filter: `country_code = 'US'` (NOT country_name)
