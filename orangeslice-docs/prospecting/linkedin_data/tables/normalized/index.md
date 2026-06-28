---
name: normalized
description: Standard LinkedIn tables with indexed lookups. Use for ID/slug queries, company filtering, and when indexed columns are primary filters.
---

# Normalized Tables

Standard database tables with indexed columns for fast lookups.

## Core Tables

- **linkedin_company.md** — Company profiles (~millions rows)
- **linkedin_profile.md** — Person profiles (~1.15B rows)
- **linkedin_job.md** — Job postings (~1.48B rows)

## Relationship Tables

- **linkedin_profile_position3.md** — Employment history (~2.6B rows)
- **linkedin_profile_education2.md** — Education records
- **linkedin_crunchbase_funding.md** — Funding rounds
- **linkedin_company_slug.md** — Company URL slug lookups
- **linkedin_profile_slug.md** — Person URL slug lookups

## Reference Tables

- **job_title.md** — Job title normalization (for exact title matching)
- **linkedin_industry.md** — Industry codes and names
- **company.md**, **person.md** — Alternative company/person views

## Indexed Columns (Fast)

| Table                        | Indexed Columns                              |
| ---------------------------- | -------------------------------------------- |
| `linkedin_company`           | `id`, `domain`, `universal_name`, `ticker`   |
| `linkedin_profile`           | `id`, `updated_at`                           |
| `linkedin_profile_position3` | `linkedin_company_id`, `linkedin_profile_id` |
| `linkedin_job`               | `linkedin_company_id`, `title_id`            |
| `job_title`                  | `title_key64` (via `key64()`)                |
| `linkedin_company_slug`      | `slug_key64` (via `key64()`)                 |
| `linkedin_profile_slug`      | `slug_key64` (via `key64()`)                 |

## When to Use

✅ ID/slug lookups (4-50ms)
✅ Company-first queries (filter by company_id)
✅ Indexed column filters
✅ Numeric range filters

❌ Text search without company filter → use denormalized
❌ Rare headline terms → use denormalized
