---
name: denormalized
description: Flattened tables (lkd_company, lkd_profile) optimized for text search with company constraints. 13-93x faster for headline ILIKE.
---

# Denormalized Tables

Flattened tables optimized for text search queries that combine person/company data.

## Tables

- **lkd_profile.md** — Person data with company info embedded (alias: `lkd`)
- **lkd_company.md** — Company data with funding/posts embedded (alias: `lkdc`)

## When to Use

✅ Headline ILIKE + company filter (13-93x faster)
✅ Rare search terms (tensorflow, kubernetes, solidity)
✅ Skill + company queries
✅ 3+ filters combined

❌ ID/slug lookups → use normalized
❌ Numeric filters only → use normalized

## Key Differences from Normalized

| Normalized                 | Denormalized               |
| -------------------------- | -------------------------- |
| `lp.id`                    | `lkd.profile_id`           |
| `lp.location_country_code` | `lkd.country_iso`          |
| `lp.public_profile_url`    | `lkd.url`                  |
| `lc.id`                    | `lkdc.linkedin_company_id` |
| `lc.company_name`          | `lkdc.name`                |

## Critical Rule

**Never mix worlds:** `lkd_profile JOIN linkedin_company` = BROKEN
