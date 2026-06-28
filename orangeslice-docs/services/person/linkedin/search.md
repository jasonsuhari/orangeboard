---
description: Search LinkedIn B2B database for people by company ID or slug lookup. NOT for prospecting — use web search for discovery.
---

# Person LinkedIn Search

**Credits: 1/result (per-result). Reserves based on query `LIMIT`.**

> **🚫 PROSPECTING CHECK:** Are you using this to **discover new people**? This service is almost never the right choice for finding people you don't already have identifiers for. Use `services.web.search` with `site:linkedin.com/in` patterns for discovery. This service is meant for: looking up a person by slug, or listing employees at a single company you already have the ID for.

> Only fast indexed queries are allowed (under 3 seconds, max 2-table joins). Everything else falls back to `services.web.search`. **You MUST read `services/web/search` before using web search.**

> **IMPORTANT:** These tables (`linkedin_profile`, `linkedin_profile_position3`, etc.) are in an **EXTERNAL B2B database** -- NOT accessible via `ctx.sql()`.
>
> Use `services.person.linkedin.search({ sql: "SELECT ... FROM linkedin_profile ..." })` to query this data.

---

## Allowed Query Types (all under 3s)

| Query Type        | Tables                  | Tested Time | Example                                |
| ----------------- | ----------------------- | ----------- | -------------------------------------- |
| Person by slug    | profile_slug + profile  | 5ms         | Find specific person by LinkedIn URL   |
| People at company | profile + position3     | 8-32ms      | Employees at Stripe by company_id      |
| Certifications    | profile + certification | 160-312ms   | AWS certified people                   |
| Education only    | profile + education     | 83-257ms    | Stanford graduates (no company filter) |
| Basic alumni      | profile + position3     | 29-248ms    | Former employees (NO ORDER BY)         |

## Banned Query Types (use web search instead)

| Query Type                     | Why Banned                             | Alternative                                              |
| ------------------------------ | -------------------------------------- | -------------------------------------------------------- |
| Headline search (rare terms)   | TIMEOUT for tensorflow, solidity, etc. | `services.web.search("site:linkedin.com/in [keywords]")` |
| Skills queries                 | Python=566ms, React/Kubernetes=TIMEOUT | `services.web.search("site:linkedin.com/in [skill]")`    |
| 3+ table joins                 | 556ms-17.7s, unreliable                | Decompose into 2-table queries                           |
| Education + company            | CTE=3s, naive=TIMEOUT                  | Education-only, then filter by company separately        |
| Complex alumni (ex-X now-at-Y) | TIMEOUT                                | Two separate queries                                     |
| UNION ALL multiple companies   | 14.6s                                  | Loop with `getEmployeesFromLinkedin`                     |

---

## PREFERRED: `services.company.getEmployeesFromLinkedin()`

**For finding employees at a company, ALWAYS use this function instead of raw SQL.**

```typescript
// Single company
const result = await services.company.getEmployeesFromLinkedin({
   companySlug: "stripe",
   titleVariations: ["engineer", "developer"],
   limit: 50,
   onlyCurrent: true,
   usOnly: true
});

// Multiple companies - loop (NOT UNION ALL)
for (const slug of ["stripe", "anthropic", "openai"]) {
   const result = await services.company.getEmployeesFromLinkedin({
      companySlug: slug,
      titleVariations: ["engineer"],
      limit: 30
   });
   allEmployees.push(...result.employees);
}

// Leadership roles - use web search
const leaders = await services.company.getEmployeesFromLinkedin({
   companySlug: "stripe",
   searchStrategy: "web",
   titleVariations: ["CEO", "founder", "CTO"],
   limit: 10
});
```

| Parameter         | Type                | Default    | Description                              |
| ----------------- | ------------------- | ---------- | ---------------------------------------- |
| `companySlug`     | string              | -          | LinkedIn universal_name (e.g., "stripe") |
| `linkedinUrl`     | string              | -          | Full LinkedIn company URL                |
| `searchStrategy`  | "database" \| "web" | "database" | "web" for leadership/rare roles          |
| `titleVariations` | string[]            | -          | Title keywords (ILIKE filters)           |
| `limit`           | number              | 25         | Max results (max 100)                    |
| `onlyCurrent`     | boolean             | true       | Current employees only                   |
| `usOnly`          | boolean             | true       | US-based only                            |

---

## Allowed: Person by Slug (key64)

```sql
SELECT lp.first_name, lp.last_name, lp.headline, lp.public_profile_url
FROM linkedin_profile_slug slug
JOIN linkedin_profile lp ON lp.id = slug.linkedin_profile_id
WHERE slug.slug_key64 = key64('satyanadella')
```

> **CRITICAL:** Always use `key64()` for slug lookups. Direct slug comparison = 15s timeout.

---

## Allowed: People at Company

```sql
SELECT lp.first_name, lp.last_name, lp.headline, pos.title
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
WHERE pos.linkedin_company_id = 2135371
  AND pos.end_date IS NULL
  AND lp.location_country_code = 'US'
LIMIT 100
```

Get company ID first:

```sql
SELECT linkedin_company_id FROM linkedin_company_slug WHERE slug_key64 = key64('stripe')
```

---

## Allowed: Headline Search (COMMON TERMS ONLY)

Only these terms are fast enough (under 200ms):

- `engineer`, `developer`, `CEO`, `manager`, `sales`, `founder`

```sql
SELECT lp.first_name, lp.last_name, lp.headline
FROM linkedin_profile lp
WHERE lp.location_country_code = 'US'
  AND lp.headline ILIKE '%engineer%'
LIMIT 100
```

**For any other headline term** (DevOps, blockchain, kubernetes, tensorflow, etc.):

```typescript
// Use web search instead
const results = await services.web.search({
   query: 'site:linkedin.com/in "kubernetes engineer" "San Francisco"'
});
// Then enrich URLs with services.person.linkedin.enrich
```

---

## Banned: Skills Queries

Skills are NOT reliably fast. Even "common" skills timeout or take too long.

```sql
-- BANNED: Python = 566ms, Python+ML = 4.6s, React/Kubernetes = TIMEOUT
WHERE 'Python' = ANY(lp.skills)
```

**Use web search:**

```typescript
const results = await services.web.search({
   query: 'site:linkedin.com/in "python" "machine learning" engineer'
});
```

---

## Banned: UNION ALL Multiple Companies

```sql
-- BANNED: Takes 14.6s
(SELECT ... WHERE pos.linkedin_company_id = 2135371 LIMIT 30)
UNION ALL
(SELECT ... WHERE pos.linkedin_company_id = 1441 LIMIT 30)
```

**Use a loop instead:**

```typescript
for (const companyId of [2135371, 1441]) {
   const { rows } = await services.person.linkedin.search({
      sql: `SELECT ... WHERE pos.linkedin_company_id = ${companyId} LIMIT 30`
   });
   allResults.push(...rows);
}
```

---

## Banned: 3+ Table Joins

```sql
-- BANNED: 3-table = 556ms, 4-table with funding = 1.6s, CTE = 17.7s
SELECT ... FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON ...
JOIN linkedin_company lc ON ...
-- Don't add more tables
```

**Decompose instead:**

1. Query companies (2 tables max)
2. Query people at each company (2 tables max)
3. Combine in application code

---

## Output Requirements

- **Always include LIMIT** (max 100)
- **Always include LinkedIn URL**: `lp.public_profile_url AS lp_linkedin_url`
- **Use `lp` alias** for person tables
- **Default to US**: `lp.location_country_code = 'US'`

## Return Type

`services.person.linkedin.search()` returns an object envelope:

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
const searchResult = await services.person.linkedin.search({
   sql: `
    SELECT
      lp.first_name,
      lp.last_name,
      lp.public_profile_url AS lp_linkedin_url
    FROM linkedin_profile lp
    WHERE lp.location_country_code = 'US'
    LIMIT 10
  `
});

return searchResult.rows; // Most spreadsheet snippets should return rows
```

---

## Table Aliases

| Table                            | Alias  |
| -------------------------------- | ------ |
| `linkedin_profile`               | `lp`   |
| `linkedin_profile_position3`     | `pos`  |
| `linkedin_profile_education2`    | `edu`  |
| `linkedin_profile_slug`          | `slug` |
| `linkedin_profile_certification` | `cert` |
