---
name: lookups
description: Find companies by domain, slug, or ID. Fast indexed lookups under 3s.
---

# Company Lookups

> **The LinkedIn DB is a lookup tool, not a search engine.** These are the ONLY allowed company lookup patterns. Everything else uses web search. **You MUST read `services/web/search` before using web search.**

Fast indexed lookups for finding specific companies.

---

## ALLOWED Lookup Methods

### 1. By LinkedIn URL Slug (key64) — 4-8ms

When you have a LinkedIn URL like `linkedin.com/company/stripe`:

```sql
SELECT lcs.linkedin_company_id AS id, lc.company_name, lc.domain, lc.employee_count,
       'https://www.linkedin.com/company/' || lc.universal_name AS lc_linkedin_url
FROM linkedin_company_slug lcs
JOIN linkedin_company lc ON lc.id = lcs.linkedin_company_id
WHERE lcs.slug_key64 = key64('stripe')
LIMIT 1
```

> **CRITICAL: ALWAYS use `key64()` for slug matching. Direct slug comparison = 15s timeout.**

```sql
-- ❌ BANNED: Direct slug comparison (15s timeout)
WHERE lcs.slug = 'openai'

-- ✅ ALLOWED: key64() (4-8ms)
WHERE lcs.slug_key64 = key64('openai')
```

### 2. By Domain — 5ms

```sql
SELECT lc.company_name, lc.universal_name AS slug, lc.website, lc.employee_count,
       'https://www.linkedin.com/company/' || lc.universal_name AS lc_linkedin_url
FROM linkedin_company lc
WHERE lc.domain = 'stripe.com'
ORDER BY lc.employee_count DESC NULLS LAST
LIMIT 1
```

> Always `ORDER BY employee_count DESC` — Multiple companies can share a domain.

### 3. By Company ID — 3ms

```sql
SELECT lc.company_name, lc.website, lc.domain, lc.employee_count,
       'https://www.linkedin.com/company/' || lc.universal_name AS lc_linkedin_url
FROM linkedin_company lc
WHERE lc.id = 2135371
```

---

## ALLOWED: With Industry Name (2-table)

```sql
SELECT lc.company_name, lc.website, lc.employee_count, ind.name AS industry,
       'https://www.linkedin.com/company/' || lc.universal_name AS lc_linkedin_url
FROM linkedin_company_slug lcs
JOIN linkedin_company lc ON lc.id = lcs.linkedin_company_id
LEFT JOIN linkedin_industry ind ON ind.id = lc.industry_code
WHERE lcs.slug_key64 = key64('stripe')
LIMIT 1
```

---

## ALLOWED: Companies by Industry — 70-200ms

```sql
SELECT lc.company_name, lc.website, lc.employee_count,
       'https://www.linkedin.com/company/' || lc.universal_name AS lc_linkedin_url
FROM linkedin_company lc
WHERE lc.country_code = 'US'
  AND lc.industry_code IN (4, 6, 96)
LIMIT 50
```

| Code | Industry                          |
| ---- | --------------------------------- |
| 4    | Computer Software                 |
| 6    | Information Technology & Services |
| 96   | IT Services and IT Consulting     |

---

## ALLOWED: Companies by Region/Locality — 70-530ms

```sql
-- By region (state)
SELECT lc.company_name, lc.website, lc.employee_count
FROM linkedin_company lc
WHERE lc.region = 'California'
  AND lc.country_code = 'US'
LIMIT 50

-- By locality (city)
SELECT lc.company_name, lc.website, lc.employee_count
FROM linkedin_company lc
WHERE lc.locality ILIKE '%Austin%'
  AND lc.country_code = 'US'
LIMIT 50
```

---

## ALLOWED: Companies by Employee Count — 180-850ms

```sql
SELECT lc.company_name, lc.website, lc.employee_count
FROM linkedin_company lc
WHERE lc.employee_count BETWEEN 50 AND 500
  AND lc.industry_code = 4
  AND lc.country_code = 'US'
LIMIT 100
```

> **NEVER add ORDER BY employee_count** — turns 180ms into 20s!

---

## ALLOWED: Companies by Size Code — 60ms

```sql
SELECT lc.company_name, lc.employee_count
FROM linkedin_company lc
WHERE lc.company_size_code IN ('C', 'D', 'E')
  AND lc.country_code = 'US'
LIMIT 50
```

| Code | Size    |
| ---- | ------- |
| C    | 11-50   |
| D    | 51-200  |
| E    | 201-500 |

---

## ALLOWED: Companies by Founded Year — 50ms

```sql
SELECT lc.company_name, lc.founded, lc.employee_count
FROM linkedin_company lc
WHERE lc.founded >= 2020
  AND lc.country_code = 'US'
LIMIT 50
```

> **NEVER add ORDER BY founded** — turns 50ms into 22s!

---

## ALLOWED: Public Companies (via ticker) — 50ms

```sql
SELECT lc.company_name, lc.ticker, lc.employee_count
FROM linkedin_company lc
WHERE lc.ticker IS NOT NULL
  AND lc.country_code = 'US'
LIMIT 50
```

---

## BANNED Patterns

| Pattern                          | Tested Time | Why Banned      | Alternative              |
| -------------------------------- | ----------- | --------------- | ------------------------ |
| `ORDER BY employee_count`        | **20.2s**   | Full table sort | Sort in code             |
| `ORDER BY follower_count`        | **23.3s**   | Full table sort | Sort in code             |
| `ORDER BY founded`               | **22.1s**   | Full table sort | Sort in code             |
| `COUNT(*)`                       | **22.4s**   | Full table scan | Estimate                 |
| `SELECT DISTINCT`                | **20.0s**   | Full table scan | Dedupe in code           |
| `'X' = ANY(specialties)`         | **23.6s**   | Array scan      | Web search               |
| `has_careers = true`             | **28.6s**   | Unindexed       | Web search               |
| `company_type = 'X'`             | **25.8s**   | Unindexed       | Use `ticker IS NOT NULL` |
| `company_size = 'X'`             | **23.7s**   | Unindexed       | Use `company_size_code`  |
| `company_name ILIKE '%fintech%'` | **9.4s**    | Rare term       | Domain/slug lookup       |
| `description ILIKE '%rare%'`     | **14.4s**   | Seq scan        | Web search               |
| Direct slug comparison           | 15s         | No index        | Use `key64()`            |
| Multi-company UNION ALL          | 14.6s       | Slow combine    | Loop per company         |

---

## Lookup Priority

1. **key64(slug)** — For LinkedIn URL-based lookups (most common)
2. **domain** — For well-known companies (indexed)
3. **universal_name** — Direct indexed lookup on main table
4. **ticker** — For public companies
5. **id** — When you have it from prior queries
