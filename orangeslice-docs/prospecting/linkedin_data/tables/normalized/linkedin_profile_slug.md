---
name: linkedin_profile_slug
description: Person URL slug lookup table (~1.14B rows). Use key64('slug') for fast indexed lookups. Direct slug comparison is NOT indexed.
---

# linkedin_profile_slug

Use: Fast profile lookup by LinkedIn URL slug.
Alias: `slug`
Rows: ~1.14B

## Indexed

slug_key64(fast via key64())

## Columns

id bigint PK | slug text | slug_key64 bigint | linkedin_profile_id int FK | linkedin_user_id int | status char(1)

## ⚠️ Critical

- ALWAYS use `WHERE slug_key64 = key64('satyanadella')` NOT `WHERE slug = 'x'`
- Direct slug lookup NOT indexed→slow
