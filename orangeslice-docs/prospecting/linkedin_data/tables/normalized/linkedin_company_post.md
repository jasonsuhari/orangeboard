---
name: linkedin_company_post
description: Company LinkedIn posts/updates with engagement metrics and media URLs
---

# linkedin_company_post

Use: Company LinkedIn posts/updates.
Alias: `post`

## Indexed

(linkedin_company_id, id DESC)

## Columns

id bigint PK | linkedin_company_id int FK | linkedin_post_id bigint | content_html text | likes_count int | comments_count int | posted_date_range tsrange | image_url text | video_url text | external_url text
