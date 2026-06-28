---
name: joins
description: BANNED — 3+ table joins timeout (556ms-17.7s). Decompose into 2-table queries.
---

# Multi-Table Joins

> **BANNED: 3+ table joins are unreliable (556ms-17.7s) and often timeout.**
>
> **Decompose into 2-table queries instead.**

---

## Why This Is Banned

| Pattern                                | Tested Time | Result     |
| -------------------------------------- | ----------- | ---------- |
| 3-table (profile + position + company) | 556ms       | Borderline |
| 4-table (+ funding)                    | 1.6s        | Too slow   |
| CTE with 5000 rows                     | 3s          | Too slow   |
| CTE with complex filters               | 17.7s       | TIMEOUT    |

**The LinkedIn DB is a lookup tool, not a search engine.** Multi-table joins create massive intermediate result sets. **You MUST read `services/web/search` before using web search.**

---

## Decompose Strategy

Instead of one complex query, run multiple simple queries:

### Example: Find Engineers at Funded Companies

**BANNED approach (4-table join):**

```sql
-- ❌ BANNED: 4-table join (1.6s)
SELECT lp.first_name, lc.company_name, f.round_name
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
JOIN linkedin_company lc ON lc.id = pos.linkedin_company_id
JOIN linkedin_crunchbase_funding f ON f.linkedin_company_id = lc.id
WHERE pos.title ILIKE '%engineer%' AND f.round_name = 'Series A'
```

**ALLOWED approach (decomposed):**

```typescript
// Step 1: Get funded companies (2-table join = 10-99ms)
const { rows: companies } = await services.company.linkedin.search({
   sql: `SELECT DISTINCT f.linkedin_company_id AS id, lc.company_name
         FROM linkedin_crunchbase_funding f
         JOIN linkedin_company lc ON lc.id = f.linkedin_company_id
         WHERE f.round_name = 'Series A' AND lc.country_code = 'US'
         LIMIT 20`
});

// Step 2: Get employees per company (2-table join = 8-32ms each)
for (const company of companies) {
   const { rows: employees } = await services.person.linkedin.search({
      sql: `SELECT lp.first_name, lp.headline, lp.public_profile_url
            FROM linkedin_profile lp
            JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
            WHERE pos.linkedin_company_id = ${company.id}
              AND pos.end_date IS NULL
              AND pos.title ILIKE '%engineer%'
              AND lp.location_country_code = 'US'
            LIMIT 20`
   });
   allEmployees.push(...employees.map((e) => ({ ...e, company_name: company.company_name })));
}
```

---

## NEVER Use These Patterns

### 3-Table Joins

```sql
-- ❌ BANNED: 3-table join (556ms)
SELECT lp.*, lc.*, pos.*
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
JOIN linkedin_company lc ON lc.id = pos.linkedin_company_id
WHERE ...
```

### 4-Table Joins

```sql
-- ❌ BANNED: 4-table join (1.6s)
SELECT lp.*, lc.*, f.*
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
JOIN linkedin_company lc ON lc.id = pos.linkedin_company_id
JOIN linkedin_crunchbase_funding f ON f.linkedin_company_id = lc.id
```

### CTEs with Large Result Sets

```sql
-- ❌ BANNED: CTE with 5000+ rows (3s-17.7s)
WITH target_companies AS (
   SELECT lc.id FROM linkedin_company lc WHERE ... LIMIT 5000
)
SELECT lp.*, lc.*
FROM target_companies tc
JOIN linkedin_profile_position3 pos ON pos.linkedin_company_id = tc.id
JOIN linkedin_profile lp ON lp.id = pos.linkedin_profile_id
```

### Denormalized Tables with Joins

```sql
-- ❌ BANNED: Never mix normalized and denormalized
SELECT * FROM lkd_profile lkd
JOIN linkedin_company lc ON ...  -- BROKEN
```

---

## Allowed 2-Table Patterns

| Pattern              | Tables                  | Time      |
| -------------------- | ----------------------- | --------- |
| Person by slug       | profile_slug + profile  | 5ms       |
| People at company    | profile + position3     | 8-32ms    |
| Company with funding | company + funding       | 10-99ms   |
| Certifications       | profile + certification | 160-312ms |
| Education only       | profile + education     | 83-257ms  |

---

## Summary

**Do NOT use 3+ table joins.**

Decompose into multiple 2-table queries and combine results in application code.
