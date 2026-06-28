---
name: jobs-at-company
description: Query jobs at a SINGLE known company by ID. 72-130ms. UNION ALL is banned.
---

# Jobs at Specific Company

> **The LinkedIn DB is a lookup tool, not a search engine.** Only single-company job queries are allowed (72-130ms). UNION ALL for multiple companies is banned (14.6s). **You MUST read `services/web/search` before using web search.**

Query job postings when you **already have a company ID**.

---

## ALLOWED: Jobs at ONE Company — 72-130ms

```sql
SELECT j.title, j.location, j.salary_range, j.posted_date
FROM linkedin_job j
WHERE j.linkedin_company_id = 2135371
  AND j.closed_since IS NULL
LIMIT 20
```

## ALLOWED: Filter by Title at ONE Company

```sql
SELECT j.title, j.salary_range, j.location
FROM linkedin_job j
WHERE j.linkedin_company_id = 2135371
  AND j.title ILIKE '%engineer%'
  AND j.closed_since IS NULL
LIMIT 20
```

---

## BANNED: UNION ALL Multiple Companies — 14.6s

```sql
-- ❌ BANNED: UNION ALL (14.6s)
(SELECT j.title FROM linkedin_job j WHERE j.linkedin_company_id = 2135371 LIMIT 15)
UNION ALL
(SELECT j.title FROM linkedin_job j WHERE j.linkedin_company_id = 1441 LIMIT 15)
```

**Loop instead:**

```typescript
const companies = [2135371, 1441, 9576];
const allJobs = [];

for (const companyId of companies) {
   const { rows } = await services.company.linkedin.search({
      sql: `SELECT j.title, j.location, j.posted_date
            FROM linkedin_job j
            WHERE j.linkedin_company_id = ${companyId}
              AND j.closed_since IS NULL
            LIMIT 20`
   });
   allJobs.push(...rows);
}
```

---

## BANNED: IN() for Multiple Companies

```sql
-- ❌ BANNED: Results are unbalanced (all from first company)
WHERE j.linkedin_company_id IN (2135371, 1441, 9576)
```

**Loop instead** (see above).

---

## BANNED: Jobs by Role Across Companies

For "companies hiring [role]", see `jobs-by-role.md` — but that pattern is also **BANNED** (LATERAL timeout).

**Use web search instead:**

```typescript
const results = await services.web.search({
   query: 'site:linkedin.com/jobs "Account Executive" "San Francisco"'
});
```

---

## Job Table Columns

| Column                     | Type | Notes                               |
| -------------------------- | ---- | ----------------------------------- |
| `linkedin_company_id`      | int  | **Indexed** - always filter by this |
| `title`                    | text | Job title                           |
| `location`                 | text | Location string                     |
| `salary_range`             | text | e.g., "$150k-$200k"                 |
| `salary_min`, `salary_max` | int  | Numeric values                      |
| `posted_date`              | date | When posted                         |
| `closed_since`             | date | NULL = open                         |

---

## Browser Verification Required

Job data can be stale. After querying:

1. Visit LinkedIn job page via browser
2. Check for "No longer accepting applications"
3. Only proceed with jobs that are actually open
