---
name: linkedin_profile
description: Person profiles table (~1.15B rows). Only id indexed. Use lkd_profile for text search.
---

# linkedin_profile

Use: Person lookups by ID. For text search use `lkd_profile`. Normalized world.
Alias: `lp`
Rows: ~1.15B

## Indexed

id only. Most cols NOT indexed.

## Columns

id int PK=linkedin_profile_id | first_name varchar | last_name varchar | headline varchar | title text | org text=current company | location_name varchar | location_country_code varchar | connections int | num_followers int | skills varchar[] | linkedin_company_id int=current co | public_profile_url varchar

## ⚠️ Critical

- Most columns NOT indexed. Use other tables to filter, then fetch by ID
- `skills` array not indexed→slow filter
- `headline ILIKE` on 1.15B rows→TIMEOUT. Use `lkd_profile` for text search
- US filter: `location_country_code = 'US'`
- Use `public_profile_url` directly (no construction needed)
