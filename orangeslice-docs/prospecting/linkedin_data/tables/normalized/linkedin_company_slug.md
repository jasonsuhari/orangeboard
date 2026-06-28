---
name: linkedin_company_slug
description: Company URL slug lookup table. Use key64('slug') for fast indexed lookups. Direct slug comparison is NOT indexed.
---

# linkedin_company_slug

Use: Fast company lookup by LinkedIn URL slug.
Alias: `slug`

## Indexed

slug_key64(fast via key64())

## Columns

id bigint PK | slug text | slug_key64 bigint | linkedin_company_id int FK | linkedin_org_id int | status char(1) | type char(1)

## ⚠️ Critical

- Use `WHERE slug_key64 = key64('stripe')` for fast lookup
- Direct `WHERE slug = 'x'` NOT indexed
