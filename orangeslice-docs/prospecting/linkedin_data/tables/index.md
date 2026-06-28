---
name: tables
description: Database table schemas for LinkedIn B2B data. Includes normalized (standard) and denormalized (optimized for text search) tables.
---

# Table Schemas

Documentation for all LinkedIn B2B database tables.

## Directory Structure

- **normalized/** — Standard tables with indexed lookups (linkedin_company, linkedin_profile, etc.)
- **denormalized/** — Flattened tables optimized for text search (lkd_company, lkd_profile)

## Normalized vs Denormalized

| World        | Tables                                 | Use Case                                 |
| ------------ | -------------------------------------- | ---------------------------------------- |
| Normalized   | `linkedin_company`, `linkedin_profile` | ID lookups, indexed filters              |
| Denormalized | `lkd_company`, `lkd_profile`           | Headline ILIKE + company (13-93x faster) |

## Critical Rules

1. **Never mix worlds** — `lkd_profile JOIN linkedin_company` = BROKEN
2. **Check column names** — Denormalized uses different column names (e.g., `profile_id` not `id`)
3. **US filter varies** — `country_code = 'US'` (normalized) vs `country_iso = 'US'` (denormalized)

## Valid Table Combinations

| World        | Person             | Company            |
| ------------ | ------------------ | ------------------ |
| Normalized   | `linkedin_profile` | `linkedin_company` |
| Denormalized | `lkd_profile`      | `lkd_company`      |
