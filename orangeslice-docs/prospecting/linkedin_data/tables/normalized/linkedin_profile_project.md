---
name: linkedin_profile_project
description: Junction table linking profiles to projects with date ranges and status
---

# linkedin_profile_project

Use: Junction table profile↔project.

## Indexed

linkedin_profile_id | linkedin_project_id

## Columns

id int PK | linkedin_profile_id int FK | linkedin_project_id int FK | association text | start_date_year smallint | start_date_month smallint | end_date_year smallint | end_date_month smallint | is_current bool
