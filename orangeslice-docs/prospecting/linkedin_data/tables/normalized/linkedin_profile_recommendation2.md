---
name: linkedin_profile_recommendation2
description: Recommendations and testimonials exchanged between LinkedIn profiles
---

# linkedin_profile_recommendation2

Use: Recommendations/testimonials between profiles.

## Indexed

linkedin_profile_id | recommender_linkedin_profile_id

## Columns

id int PK | linkedin_profile_id int FK=recipient | recommender_linkedin_profile_id int FK=author | recommendation text
