---
name: linkedin_profile_publication2
description: Junction table linking LinkedIn profiles to their publication records
---

# linkedin_profile_publication2

Use: Junction table profile↔publication.

## Indexed

linkedin_profile_id

## Columns

id int PK | linkedin_publication_id int FK | linkedin_profile_id int FK | linkedin_profile_full_name text | linkedin_profile_url text | sort_order smallint
