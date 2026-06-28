---
name: linkedin_profile_certification
description: Certification records on profiles. Indexed on linkedin_profile_id. Includes AWS, GCP, Azure and other credentials.
---

# linkedin_profile_certification

Use: Certifications/credentials on profiles.
Alias: `cert`

## Indexed

linkedin_profile_id(fast)

## Columns

id bigint PK | linkedin_profile_id int FK | title text | company_name text=issuer | linkedin_company_id int | credential_id text | verify_url text | date_year smallint | date_month smallint | expire_date_year smallint | expire_date_month smallint
