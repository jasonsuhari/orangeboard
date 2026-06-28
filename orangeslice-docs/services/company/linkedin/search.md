---
description: Search LinkedIn B2B database for companies by domain, slug, or ID lookup. NOT for prospecting — use web search for discovery.
---

# Company LinkedIn Search

**Credits: 1/result (per-result). Reserves based on query `LIMIT`.**

> **🚫 PROSPECTING CHECK:** Are you using this to **discover new companies**? This service is almost never the right choice for prospecting. Use `services.web.search` with `site:linkedin.com/company` patterns for discovery. The only prospecting exception is **trivially simple indexed-column filters** (e.g. `industry_code = 4 AND country_code = 'US'`). Any query with keywords, descriptions, company names, ILIKE, or semantic matching = web search.

> Only fast indexed queries are allowed (under 3 seconds, max 2-table joins). Everything else falls back to `services.web.search`. **You MUST read `services/web/search` before using web search.**

> **IMPORTANT:** These tables (`linkedin_company`, `linkedin_crunchbase_funding`, etc.) are in an **EXTERNAL B2B database** -- NOT accessible via `ctx.sql()`.
>
> Use `services.company.linkedin.search({ sql: "SELECT ... FROM linkedin_company ..." })` to query this data.

---

## Allowed Query Types (all under 3s)

| Query Type                         | Tables                     | Tested Time | Example                                            |
| ---------------------------------- | -------------------------- | ----------- | -------------------------------------------------- |
| Company by key64 slug              | company_slug + company     | 50ms        | Find Stripe by LinkedIn URL                        |
| Company by domain                  | company                    | 50ms        | `domain = 'stripe.com'`                            |
| Company by ID                      | company                    | 60ms        | `id = 2135371`                                     |
| Company by universal_name          | company                    | 50ms        | `universal_name = 'stripe'` (indexed)              |
| Company by ticker                  | company                    | 50ms        | `ticker = 'AAPL'` (indexed)                        |
| Companies by industry_code         | company                    | 70-200ms    | `industry_code IN (4, 6, 96)`                      |
| Companies by country_code          | company                    | 70ms        | `country_code = 'US'`                              |
| Companies by region                | company                    | 70ms        | `region = 'California'`                            |
| Companies by locality (exact)      | company                    | 170-530ms   | `locality = 'San Francisco'`                       |
| Companies by locality ILIKE        | company                    | 170-370ms   | `locality ILIKE '%Austin%'`                        |
| Companies by employee_count        | company                    | 180-850ms   | `employee_count > 500` or `BETWEEN`                |
| Companies by company_size_code     | company                    | 60ms        | `company_size_code IN ('C','D','E')`               |
| Companies by founded year          | company                    | 50ms        | `founded >= 2020` (**NO ORDER BY**)                |
| Multi-filter combo                 | company                    | 200-850ms   | industry + country + employee                      |
| Basic funding (2-table)            | company + funding          | 120-320ms   | Series A companies                                 |
| Recent funding                     | company + funding          | 150ms       | `round_date >= CURRENT_DATE - INTERVAL '180 days'` |
| Growth metrics (2-table)           | linkedin_company + company | 190-370ms   | `employee_growth_12mo > 0.25`                      |
| Jobs at ONE company                | job table                  | 510-690ms   | Open roles at single company by ID                 |
| 3-table (company+funding+industry) | small ref table            | 80ms        | Funding with industry name                         |
| Multiple domain IN()               | company                    | 920ms       | Up to 5 domains                                    |
| Employees at ONE company           | position table             | 60ms        | `linkedin_company_id = X`                          |
| OR conditions                      | company                    | 70ms        | `(industry_code = 4 OR locality = 'SF')`           |
| LIMIT up to 2000                   | company                    | 300-500ms   | Batch retrieval                                    |

## Banned Query Types (use web search instead)

| Query Type                          | Why Banned        | Tested Time | Alternative                      |
| ----------------------------------- | ----------------- | ----------- | -------------------------------- |
| **ORDER BY employee_count**         | Full table sort   | **20.2s**   | Remove ORDER BY, sort in code    |
| **ORDER BY follower_count**         | Full table sort   | **23.3s**   | Remove ORDER BY, sort in code    |
| **ORDER BY founded**                | Full table sort   | **22.1s**   | Remove ORDER BY, sort in code    |
| **COUNT(\*)**                       | Full table scan   | **22.4s**   | Estimate or skip                 |
| **SELECT DISTINCT**                 | Full table scan   | **20.0s**   | Query + dedupe in code           |
| **'X' = ANY(specialties)**          | Array scan        | **23.6s**   | Web search                       |
| **has_careers = true**              | Unindexed boolean | **28.6s**   | Web search                       |
| **company_type = 'Public Company'** | Unindexed string  | **25.8s**   | Use `ticker IS NOT NULL` instead |
| **company_size = '51-200'**         | Unindexed string  | **23.7s**   | Use `company_size_code` instead  |
| **company_name ILIKE (rare term)**  | Seq scan          | **9.4s**    | Domain/slug lookup or web search |
| **description ILIKE (rare term)**   | Seq scan          | **14.4s**   | Web search                       |
| Jobs by role (LATERAL)              | N+1 pattern       | 28.7s       | Web search                       |
| Direct slug comparison              | No index          | 15s         | Use `key64()`                    |
| Multi-company UNION ALL             | Slow combine      | 14.6s       | Loop per company                 |

> **company_name ILIKE with COMMON terms** like `'%tech%'` or `'%consulting%'` is OK (150-300ms). Only RARE terms like `'%fintech%'` or `'%quantum%'` are banned.

---

## Allowed: Company by key64 Slug

```sql
SELECT lcs.linkedin_company_id AS id, lc.company_name, lc.domain, lc.employee_count
FROM linkedin_company_slug lcs
JOIN linkedin_company lc ON lc.id = lcs.linkedin_company_id
WHERE lcs.slug_key64 = key64('stripe')
LIMIT 1
```

> **CRITICAL:** Always use `key64()` for slug lookups. Direct slug = 15s timeout.

---

## Allowed: Company by Domain

```sql
SELECT lc.company_name, lc.universal_name AS slug, lc.website, lc.employee_count
FROM linkedin_company lc
WHERE lc.domain = 'stripe.com'
ORDER BY lc.employee_count DESC NULLS LAST
LIMIT 1
```

> Always `ORDER BY employee_count DESC` -- multiple companies can share a domain.

---

## Allowed: Company by ID

```sql
SELECT lc.company_name, lc.website, lc.domain, lc.employee_count
FROM linkedin_company lc
WHERE lc.id = 2135371
```

---

## Allowed: Companies by Industry

```sql
SELECT lc.company_name, lc.website, lc.employee_count
FROM linkedin_company lc
WHERE lc.country_code = 'US'
  AND lc.industry_code IN (4, 6, 96)
LIMIT 50
```

| Code | Industry          |
| ---- | ----------------- |
| 4    | Computer Software |
| 6    | IT & Services     |
| 96   | IT Consulting     |

---

## Allowed: Companies by Region/Locality

```sql
-- By region (state) — 70ms
SELECT lc.company_name, lc.website, lc.employee_count
FROM linkedin_company lc
WHERE lc.region = 'California'
  AND lc.country_code = 'US'
LIMIT 50

-- By locality (city, exact match) — 530ms
SELECT lc.company_name, lc.website, lc.employee_count
FROM linkedin_company lc
WHERE lc.locality = 'San Francisco'
  AND lc.country_code = 'US'
LIMIT 50

-- By locality ILIKE — 170ms
SELECT lc.company_name, lc.website, lc.employee_count
FROM linkedin_company lc
WHERE lc.locality ILIKE '%Austin%'
  AND lc.country_code = 'US'
LIMIT 50
```

---

## Allowed: Companies by Employee Count

```sql
-- Range filter — 630ms
SELECT lc.company_name, lc.website, lc.employee_count
FROM linkedin_company lc
WHERE lc.employee_count BETWEEN 50 AND 500
  AND lc.industry_code = 4
  AND lc.country_code = 'US'
LIMIT 100

-- Minimum threshold — 180ms
SELECT lc.company_name, lc.website, lc.employee_count
FROM linkedin_company lc
WHERE lc.employee_count > 500
  AND lc.country_code = 'US'
LIMIT 50
```

> **NEVER add ORDER BY employee_count** — that turns a 180ms query into a 20s query!

---

## Allowed: Companies by Size Code (Fast Alternative)

Use `company_size_code` instead of `company_size` string:

```sql
-- ✅ FAST: company_size_code — 60ms
SELECT lc.company_name, lc.employee_count
FROM linkedin_company lc
WHERE lc.company_size_code IN ('C', 'D', 'E')
  AND lc.country_code = 'US'
LIMIT 50

-- ❌ BANNED: company_size string — 24s
-- WHERE lc.company_size = '51-200 employees'
```

| Code | Size Range |
| ---- | ---------- |
| A    | 1 employee |
| B    | 2-10       |
| C    | 11-50      |
| D    | 51-200     |
| E    | 201-500    |
| F    | 501-1000   |
| G    | 1001-5000  |
| H    | 5001-10000 |
| I    | 10001+     |

---

## Allowed: Public Companies (Ticker)

```sql
-- ✅ FAST: ticker lookup — 50ms
SELECT lc.company_name, lc.ticker, lc.employee_count
FROM linkedin_company lc
WHERE lc.ticker IS NOT NULL
  AND lc.ticker != ''
  AND lc.country_code = 'US'
LIMIT 50

-- ❌ BANNED: company_type = 'Public Company' — 26s
```

---

## Allowed: Recently Founded Companies

```sql
-- ✅ FAST: founded filter without ORDER BY — 50ms
SELECT lc.company_name, lc.founded, lc.employee_count
FROM linkedin_company lc
WHERE lc.founded >= 2020
  AND lc.country_code = 'US'
LIMIT 50

-- ❌ BANNED: ORDER BY founded DESC — 22s
```

---

## Allowed: Basic Funding (2-table only)

```sql
SELECT lc.company_name, lc.website, f.round_name, f.round_date, f.round_amount
FROM linkedin_company lc
JOIN linkedin_crunchbase_funding f ON f.linkedin_company_id = lc.id
WHERE lc.country_code = 'US'
  AND f.round_name = 'Series A'
LIMIT 50
```

**Do NOT add a third table (like profile or position).** That adds 500ms-1s.

---

## Allowed: Growth Metrics

```sql
SELECT c.name, c.slug, c.employee_count, c.employee_growth_12mo
FROM company c
WHERE c.country_name = 'United States'
  AND c.employee_growth_12mo > 1.5
  AND c.employee_count > 50
LIMIT 50
```

> Uses `company` table (not `linkedin_company`). Do NOT query `rank_fortune` or `rank_incmagazine` (5.3s).

---

## Allowed: Jobs at ONE Company

```sql
SELECT j.title, j.location, j.salary_range, j.posted_date
FROM linkedin_job j
WHERE j.linkedin_company_id = 2135371
  AND j.closed_since IS NULL
LIMIT 20
```

> **Single company only.** UNION ALL for multiple companies = 14.6s.

---

## Banned: Description Search

```sql
-- BANNED: 47ms-1.7s unreliable, regex = 10.2s, ORDER BY = 12.5s
WHERE lc.description ILIKE '%AI%'
WHERE lc.description ~* 'SaaS.*(platform)'
```

**Use web search:**

```typescript
const results = await services.web.search({
   query: 'site:linkedin.com/company "AI" "Austin" "Series B" -jobs'
});
// Then enrich URLs with services.company.linkedin.enrich
```

---

## Banned: Jobs by Role (LATERAL)

```sql
-- BANNED: LATERAL 200 = 28.7s, multiple titles = TIMEOUT
WITH title_ids AS (SELECT id FROM job_title WHERE title_key64 = key64('Account Executive'))
SELECT ... FROM title_ids t, LATERAL (SELECT * FROM linkedin_job ...) lj
```

**Use web search:**

```typescript
const results = await services.web.search({
   query: 'site:linkedin.com/jobs "Account Executive" "San Francisco"'
});
```

---

## Banned: company_name ILIKE (Rare Terms)

```sql
-- ❌ BANNED: rare terms — 9.4s
WHERE lc.company_name ILIKE '%fintech%'
WHERE lc.company_name ILIKE '%quantum%'
WHERE lc.company_name ILIKE '%biotech%'

-- ✅ OK: common terms — 150-300ms
WHERE lc.company_name ILIKE '%tech%'
WHERE lc.company_name ILIKE '%consulting%'
WHERE lc.company_name ILIKE '%software%'
```

**For rare terms, use domain/slug lookup or web search.**

---

## Banned: ORDER BY on Non-Indexed Columns

```sql
-- ❌ BANNED: All of these cause 20-23s queries
ORDER BY lc.employee_count DESC   -- 20.2s
ORDER BY lc.follower_count DESC   -- 23.3s
ORDER BY lc.founded DESC          -- 22.1s

-- ✅ OK: ORDER BY on indexed column
ORDER BY lc.id DESC               -- 1.2s (borderline)
```

**Sort results in application code instead.**

---

## Banned: COUNT(\*) and DISTINCT

```sql
-- ❌ BANNED: COUNT — 22.4s
SELECT COUNT(*) FROM linkedin_company WHERE industry_code = 4

-- ❌ BANNED: DISTINCT — 20s
SELECT DISTINCT industry FROM linkedin_company WHERE country_code = 'US'
```

**Use estimates or dedupe in application code.**

---

## Banned: Array and Boolean Filters

```sql
-- ❌ BANNED: Array ANY — 23.6s
WHERE 'Payments' = ANY(lc.specialties)

-- ❌ BANNED: Boolean filter — 28.6s
WHERE lc.has_careers = true

-- ❌ BANNED: String equality on unindexed columns — 24-26s
WHERE lc.company_type = 'Public Company'
WHERE lc.company_size = '51-200 employees'
```

**Use indexed alternatives:**

- For public companies: `ticker IS NOT NULL`
- For company size: `company_size_code IN ('C','D')`
- For specialties/has_careers: web search

---

## Output Requirements

- **Always include LIMIT** (max 100)
- **Always include LinkedIn URL**: `'https://www.linkedin.com/company/' || lc.universal_name AS lc_linkedin_url`
- **Use `lc` alias** for company tables
- **Default to US**: `lc.country_code = 'US'`

## Return Type

`services.company.linkedin.search()` returns an object envelope:

```typescript
{
   rows: (Record < string, unknown > []);
   count: number;
}
```

- `rows`: Result rows from your SQL query, with exactly the columns you selected.
- `count`: Number of rows returned in `rows`.

Example:

```typescript
const searchResult = await services.company.linkedin.search({
   sql: `
    SELECT
      lc.company_name,
      lc.domain,
      'https://www.linkedin.com/company/' || lc.universal_name AS lc_linkedin_url
    FROM linkedin_company lc
    WHERE lc.domain = 'stripe.com'
    LIMIT 1
  `
});

return searchResult.rows; // Most spreadsheet snippets should return rows
```

---

## Table Aliases

| Table                         | Alias  |
| ----------------------------- | ------ |
| `linkedin_company`            | `lc`   |
| `linkedin_company_slug`       | `slug` |
| `linkedin_crunchbase_funding` | `f`    |
| `linkedin_job`                | `j`    |
| `company`                     | `c`    |
