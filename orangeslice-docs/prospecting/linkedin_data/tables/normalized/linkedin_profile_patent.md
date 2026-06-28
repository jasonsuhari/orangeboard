---
name: linkedin_profile_patent
description: Junction table linking LinkedIn profiles to their patent records
---

# linkedin_profile_patent

Use: Junction table profile↔patent.

## Indexed

linkedin_profile_id

## Columns

id int PK | linkedin_patent_id int FK | linkedin_profile_id int FK | linkedin_profile_full_name text | linkedin_profile_url text | sort_order smallint
