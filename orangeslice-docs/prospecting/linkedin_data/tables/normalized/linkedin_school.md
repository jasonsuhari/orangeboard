---
name: linkedin_school
description: School reference table for education records with name and logo
---

# linkedin_school

Use: School reference. Join via linkedin_school_id from linkedin_profile_education2.

## Columns

id int PK | name varchar | logo_url varchar

## ⚠️ Critical

- `linkedin_school_id` may be NULL in education records
- Schools also exist as linkedin_company records (is_company=false)
