---
name: job_title
description: Job title taxonomy for exact title matching. Use key64(title) for O(1) lookups across 1.48B jobs.
---

# job_title

Use: Job title taxonomy. Join via title_id from linkedin_job.

## Columns

id int PK | title text | title_key64 bigint | linkedin_title_id int | norm_title_id int
