---
name: growth
description: Query employee growth metrics. Basic 12mo growth only, under 3s.
---

# Company Employee Growth

> **The LinkedIn DB is a lookup tool, not a search engine.** Only basic growth queries are allowed (15-298ms). Rank columns and hypergrowth (3mo) are banned. **You MUST read `services/web/search` before using web search.**

**Note:** Uses the `company` table (not `linkedin_company`).

---

## Growth Rate Columns

| Column                 | Notes                               |
| ---------------------- | ----------------------------------- |
| `employee_growth_12mo` | 12-month growth rate (ALLOWED)      |
| `employee_growth_06mo` | 6-month growth rate (CAUTION)       |
| `employee_growth_03mo` | 3-month growth rate (BANNED - 2.6s) |

**Value interpretation:**

| Value | Meaning     |
| ----- | ----------- |
| 1.5   | 50% growth  |
| 1.2   | 20% growth  |
| 1.0   | No change   |
| 0.9   | 10% decline |

---

## ALLOWED: Fast-Growing Companies (12mo) — 217ms

```sql
SELECT c.name, c.slug, c.employee_count, c.employee_growth_12mo
FROM company c
WHERE c.country_name = 'United States'
  AND c.employee_growth_12mo > 1.5
  AND c.employee_count > 50
LIMIT 50
```

---

## ALLOWED: With LinkedIn URL — 298ms

```sql
SELECT c.name, c.employee_growth_12mo, c.employee_count,
       'https://www.linkedin.com/company/' || lc.universal_name AS lc_linkedin_url
FROM company c
JOIN linkedin_company lc ON lc.id = c.linkedin_id
WHERE c.country_name = 'United States'
  AND c.employee_growth_12mo > 1.3
  AND c.employee_count > 50
LIMIT 50
```

---

## ALLOWED: Shrinking Companies

```sql
SELECT c.name, c.slug, c.employee_count, c.employee_growth_12mo
FROM company c
WHERE c.country_name = 'United States'
  AND c.employee_growth_12mo < 0.9
  AND c.employee_growth_12mo > 0
  AND c.employee_count > 100
LIMIT 50
```

---

## BANNED: Hypergrowth (3mo) — 2.6s

```sql
-- ❌ BANNED: 3-month growth queries (2.6s)
SELECT c.name, c.employee_growth_03mo
FROM company c
WHERE c.employee_growth_03mo > 1.2
```

**Use 12mo growth instead** — it's indexed and fast.

---

## BANNED: Rank Columns — 5.3s

```sql
-- ❌ BANNED: Rank columns (5.3s timeout)
WHERE c.rank_fortune IS NOT NULL
WHERE c.rank_incmagazine IS NOT NULL
```

**These columns are NOT indexed.** If you need Fortune 500 companies, use web search:

```typescript
const results = await services.web.search({
   query: 'site:linkedin.com/company "Fortune 500"'
});
```

---

## Company Table Columns

| Column                 | Type    | Notes                  |
| ---------------------- | ------- | ---------------------- |
| `name`                 | text    | Company name           |
| `slug`                 | text    | URL slug               |
| `linkedin_id`          | int     | FK to linkedin_company |
| `employee_count`       | int     | Current headcount      |
| `employee_growth_12mo` | decimal | 12-month growth rate   |
| `locality`             | text    | City                   |
| `country_name`         | text    | Country                |
