---
name: linkedin_job
description: Job postings table (~1.48B rows). Indexed on linkedin_company_id and title_id. Never ILIKE title without company filter.
---

# linkedin_job

Use: Job postings, hiring signals.
Alias: `j`
Rows: ~1.48B

## Indexed

linkedin_company_id(fast) | job_id(fast) | title_id | updated_at

## Columns

id bigint PK | job_id bigint | linkedin_company_id int FK | title text | company_name text | description text | location text | address_locality text | address_region text | address_country text | salary_min numeric | salary_max numeric | salary_range text | posted_date date | posted_timestamp timestamp | applicants int | linkedin_seniority_level_id int | linkedin_employment_type_id int | job_functions int[] | industries int[]

## ⚠️ Critical

- `title ILIKE` ONLY fast AFTER `linkedin_company_id` filter
- Without company filter, ILIKE scans 1.48B rows→TIMEOUT
- Use `posted_date` for recent jobs
