---
name: linkedin_profile_education2
description: Education history table (~965M rows). Query school, degree, field of study. Multiple degrees per person cause duplicates.
---

# linkedin_profile_education2

Use: Education history, school queries.
Alias: `edu`
Rows: ~965M

## Indexed

linkedin_profile_id | linkedin_school_id(partial)

## Columns

id bigint PK | linkedin_profile_id int FK | linkedin_school_id int FK | school_name text | degree text | field_of_study text | grade text | activities text | start_date date | end_date date | start_date_year smallint | end_date_year smallint

## ⚠️ Critical

- Person can have multiple degrees→causes duplicates. Use subquery to get profile IDs first.
- `linkedin_school_id` may be NULL
