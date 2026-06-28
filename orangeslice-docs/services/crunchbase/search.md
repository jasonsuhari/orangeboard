---
description: Search Crunchbase with SQL
---

# Crunchbase Search

Run SQL against `public.crunchbase_scraper_lean` for startup/company prospecting.

```typescript
const rows = await services.crunchbase.search({
   sql: `
      SELECT name, website_url, linkedin_url
      FROM public.crunchbase_scraper_lean
      WHERE operating_status = 'active'
      LIMIT 25
   `
});

// rows: Record<string, unknown>[]
return rows;
```

## Contract (Hard Rules)

- Query **only** `public.crunchbase_scraper_lean`.
- **Only one statement** is allowed.
- **Only SELECT** queries are allowed (`WITH ... SELECT` is fine).
- Always include `LIMIT` (recommended `<= 100`).
- This is an external service path, not `ctx.sql()`.
- Credits are 1 credit per returned row (reserve estimate is derived from `LIMIT`).

## Return Type

`services.crunchbase.search()` returns rows directly:

```typescript
(Record < string, unknown > []);
```

No `{ rows, count }` envelope.

```typescript
const rows = await services.crunchbase.search({ sql: "SELECT name FROM public.crunchbase_scraper_lean LIMIT 10" });
const count = rows.length;
```

## Live Schema (Verified)

Source of truth: live DB introspection of `public.crunchbase_scraper_lean`.

| Column                       | Type          | Nullable |
| ---------------------------- | ------------- | -------- |
| `id`                         | `bigint`      | no       |
| `uuid`                       | `text`        | yes      |
| `name`                       | `text`        | yes      |
| `link`                       | `text`        | yes      |
| `type`                       | `text`        | yes      |
| `operating_status`           | `text`        | yes      |
| `company_type`               | `text`        | yes      |
| `short_description`          | `text`        | yes      |
| `description`                | `text`        | yes      |
| `website_url`                | `text`        | yes      |
| `linkedin_url`               | `text`        | yes      |
| `twitter_url`                | `text`        | yes      |
| `facebook_url`               | `text`        | yes      |
| `contact_email`              | `text`        | yes      |
| `phone_number`               | `text`        | yes      |
| `hq_postal_code`             | `text`        | yes      |
| `primary_category`           | `text`        | yes      |
| `categories`                 | `jsonb`       | no       |
| `category_groups`            | `jsonb`       | no       |
| `location_identifiers`       | `jsonb`       | no       |
| `location_group_identifiers` | `jsonb`       | no       |
| `num_employees_enum`         | `integer`     | yes      |
| `revenue_range`              | `text`        | yes      |
| `funding_stage`              | `text`        | yes      |
| `funding_total_usd`          | `numeric`     | yes      |
| `last_funding_total_usd`     | `numeric`     | yes      |
| `last_funding_type`          | `text`        | yes      |
| `last_funding_date`          | `date`        | yes      |
| `num_funding_rounds`         | `integer`     | yes      |
| `num_investors`              | `integer`     | yes      |
| `num_lead_investors`         | `integer`     | yes      |
| `rank_org_company`           | `integer`     | yes      |
| `rank_org`                   | `integer`     | yes      |
| `rank_delta_d7`              | `integer`     | yes      |
| `rank_delta_d30`             | `integer`     | yes      |
| `rank_delta_d90`             | `integer`     | yes      |
| `growth_score_tier`          | `text`        | yes      |
| `heat_score_tier`            | `text`        | yes      |
| `ipo_status`                 | `text`        | yes      |
| `went_public_on`             | `date`        | yes      |
| `imported_at`                | `timestamptz` | no       |

## Enum Catalog (Verified Distinct Values)

These are observed live values, in production data.

### `operating_status`

- `active`
- `closed`

### `company_type`

- `for_profit`
- `non_profit`

### `type`

- `organization`

### `funding_stage`

- `seed`
- `early_stage_venture`
- `m_and_a`
- `late_stage_venture`
- `ipo`

### `last_funding_type`

- `seed`
- `series_a`
- `series_b`
- `series_c`

### `revenue_range`

- `r_00000000`
- `r_00001000`
- `r_00010000`
- `r_00050000`
- `r_00100000`
- `r_00500000`
- `r_01000000`
- `r_10000000`

### `growth_score_tier`

- `c100_high`
- `c200_medium`
- `c300_low`

### `heat_score_tier`

- `c100_high`
- `c200_medium`
- `c300_low`

### `ipo_status`

- `private`
- `public`
- `delisted`

### `num_employees_enum`

Column exists, but currently sparse/null in this dataset.

## JSONB Array Fields

`categories`, `category_groups`, `location_identifiers`, and `location_group_identifiers` are `jsonb` arrays.

Do **not** treat them as `text[]` with `&& ARRAY[...]::text[]`.
Use `jsonb_array_elements_text(...)` with `EXISTS`, for example:

```sql
AND EXISTS (
  SELECT 1
  FROM jsonb_array_elements_text(categories) AS c(category)
  WHERE category IN ('Health Care', 'Biotechnology')
)
```

## Recommended Query Patterns

| Pattern                                                 | Why                                |
| ------------------------------------------------------- | ---------------------------------- |
| Equality / `IN` filters on enum columns                 | Fast and stable                    |
| Date windows on `last_funding_date`                     | Strong recency control             |
| Numeric ranges on `funding_total_usd`                   | Good segmentation                  |
| `EXISTS + jsonb_array_elements_text` for tags/locations | Works with current schema          |
| Explicit narrow column lists                            | Lower payload and faster execution |

## Banned / Avoided Patterns

| Pattern                                                                      | Why                                 | Better Alternative                                  |
| ---------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------- |
| Missing `LIMIT`                                                              | Unbounded scans + excessive credits | Always add `LIMIT`                                  |
| `SELECT *` for production pulls                                              | Larger payload and cost             | Select only needed columns                          |
| Leading-wildcard scans on long text (`ILIKE '%term%'`) across broad dataset  | Expensive text scans                | Use enum/date/range filters first, then narrow text |
| Heavy aggregations (`COUNT(*)`, `DISTINCT`, wide `GROUP BY`) on large slices | Slow and expensive                  | Pull scoped rows, aggregate in code                 |
| Unscoped global sorts on large sets                                          | Expensive sort operations           | Filter first, sort smaller result sets              |
| Multi-table joins for routine prospecting                                    | More planner risk and latency       | Stay on lean table only                             |

## Canonical Prospecting Queries

### 1) US early-stage SaaS/AI, currently active

```sql
SELECT
   name,
   website_url,
   linkedin_url,
   funding_stage,
   num_employees_enum,
   last_funding_date
FROM public.crunchbase_scraper_lean
WHERE operating_status = 'active'
  AND funding_stage IN ('seed', 'early_stage_venture')
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(categories) AS c(category)
      WHERE category IN ('SaaS', 'Artificial Intelligence (AI)')
  )
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(location_identifiers) AS l(location)
      WHERE location = 'United States'
  )
LIMIT 100;
```

### 2) Recently funded (last 12 months)

```sql
SELECT
   name,
   website_url,
   last_funding_type,
   last_funding_date,
   last_funding_total_usd,
   funding_total_usd
FROM public.crunchbase_scraper_lean
WHERE operating_status = 'active'
  AND last_funding_date >= CURRENT_DATE - INTERVAL '12 months'
  AND last_funding_type IN ('seed', 'series_a', 'series_b')
ORDER BY last_funding_date DESC NULLS LAST
LIMIT 100;
```

### 3) Bay Area fintech companies with meaningful funding

```sql
SELECT
   name,
   website_url,
   funding_stage,
   funding_total_usd,
   num_employees_enum
FROM public.crunchbase_scraper_lean
WHERE operating_status = 'active'
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(categories) AS c(category)
      WHERE category IN ('FinTech', 'Financial Services')
  )
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(location_group_identifiers) AS g(location_group)
      WHERE location_group = 'San Francisco Bay Area'
  )
  AND funding_total_usd >= 5000000
LIMIT 75;
```

### 4) Non-profits with health focus

```sql
SELECT
   name,
   website_url,
   company_type,
   categories,
   location_identifiers
FROM public.crunchbase_scraper_lean
WHERE company_type = 'non_profit'
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(categories) AS c(category)
      WHERE category ILIKE ANY (ARRAY['%health%', '%medical%', '%biotech%', '%pharma%', '%telemedicine%'])
  )
LIMIT 100;
```

### 5) Healthtech seed to series B (safe column set)

```sql
SELECT
   name,
   website_url,
   linkedin_url,
   short_description,
   funding_stage,
   last_funding_type,
   last_funding_date,
   funding_total_usd,
   num_employees_enum,
   categories,
   location_identifiers,
   num_investors,
   num_funding_rounds
FROM public.crunchbase_scraper_lean
WHERE operating_status = 'active'
  AND last_funding_type IN ('seed', 'series_a', 'series_b')
  AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(categories) AS c(category)
      WHERE category ILIKE ANY (ARRAY['%health%', '%medical%', '%biotech%', '%pharma%', '%telemedicine%'])
  )
ORDER BY last_funding_date DESC NULLS LAST
LIMIT 100;
```

## Usage Pattern (Spreadsheet Code)

```typescript
const rows = await services.crunchbase.search({
   sql: `
      SELECT name, website_url, linkedin_url
      FROM public.crunchbase_scraper_lean
      WHERE operating_status = 'active'
      LIMIT 20
   `
});

// rows is already an array of objects
return rows;
```

## Troubleshooting

- `column "...\" does not exist` -> you are using an old/nonexistent column name; check "Known Bad Column Names".
- `only public.crunchbase_scraper_lean is allowed` -> query references a disallowed table.
- `only SELECT queries are allowed` -> remove `INSERT/UPDATE/DELETE`, keep read-only SQL.
- Empty results with no error -> usually value casing mismatch (use lowercase enum values like `active`, `series_a`).
