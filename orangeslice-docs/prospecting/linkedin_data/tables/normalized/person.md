---
name: person
description: Person records (~1.32B rows) linking profiles with deduplication. Use linkedin_profile_id to join with linkedin_profile.
---

# person

Use: Person records linking profiles, deduplication.
Rows: ~1.32B

## Indexed

id | linkedin_profile_id

## Columns

id int PK | first_name varchar | last_name varchar | formatted_name varchar | linkedin_profile_id int FK | successor int | predecessors int[] | privacy_redact bool
