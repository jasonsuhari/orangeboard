---
name: education
description: Query people by education. Education-only queries allowed (83-257ms). Education+company CTEs are banned (3s).
---

# Education Queries

> **The LinkedIn DB is a lookup tool, not a search engine.** Only education-only queries are allowed (83-257ms). Education + company CTEs are banned (3s). **You MUST read `services/web/search` before using web search.**

---

## ALLOWED: Education-Only Queries — 83-257ms

### By School

```sql
SELECT lp.first_name, lp.last_name, lp.headline,
       edu.school_name, edu.degree, edu.field_of_study,
       lp.public_profile_url AS lp_linkedin_url
FROM linkedin_profile lp
JOIN linkedin_profile_education2 edu ON edu.linkedin_profile_id = lp.id
WHERE lp.location_country_code = 'US'
  AND edu.school_name ILIKE '%stanford%'
LIMIT 100
```

### By Field of Study

```sql
SELECT lp.first_name, lp.last_name, lp.headline,
       edu.school_name, edu.field_of_study,
       lp.public_profile_url AS lp_linkedin_url
FROM linkedin_profile lp
JOIN linkedin_profile_education2 edu ON edu.linkedin_profile_id = lp.id
WHERE lp.location_country_code = 'US'
  AND edu.field_of_study ILIKE '%computer science%'
LIMIT 100
```

### By Degree + Recency

```sql
SELECT lp.first_name, lp.last_name, lp.headline,
       edu.school_name, edu.degree,
       lp.public_profile_url AS lp_linkedin_url
FROM linkedin_profile lp
JOIN linkedin_profile_education2 edu ON edu.linkedin_profile_id = lp.id
WHERE lp.location_country_code = 'US'
  AND edu.degree ILIKE '%MBA%'
  AND edu.end_date_year >= 2022
LIMIT 100
```

---

## BANNED: Education + Company CTEs — 3s

```sql
-- ❌ BANNED: Education + Company CTE (3s)
WITH company_employees AS (
  SELECT pos.linkedin_profile_id
  FROM linkedin_profile_position3 pos
  WHERE pos.linkedin_company_id = -563704526
    AND pos.end_date IS NULL
  LIMIT 5000
)
SELECT lp.first_name, edu.school_name
FROM company_employees e
JOIN linkedin_profile lp ON lp.id = e.linkedin_profile_id
JOIN linkedin_profile_education2 edu ON edu.linkedin_profile_id = e.linkedin_profile_id
WHERE edu.school_name ILIKE '%University of Michigan%'
```

**Why banned:** Even with LIMIT 5000, the CTE + education join exceeds 3s.

---

## Alternative: Decomposed Approach

If you need alumni at a specific company:

```typescript
// Step 1: Get company employees (2-table = 8-32ms)
const { rows: employees } = await services.person.linkedin.search({
   sql: `SELECT lp.id, lp.first_name, lp.last_name, lp.headline, lp.public_profile_url
         FROM linkedin_profile lp
         JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
         WHERE pos.linkedin_company_id = -563704526
           AND pos.end_date IS NULL
           AND lp.location_country_code = 'US'
         LIMIT 100`
});

// Step 2: Add education as enrichment column (queries per profile)
// This is done via sheet enrichment, not a join
```

**Or use web search:**

```typescript
const results = await services.web.search({
   query: 'site:linkedin.com/in "University of Michigan" "JPMorgan"'
});
```

---

## BANNED: Batching

```typescript
// ❌ BANNED: Multiple batches of CTE queries
while (results.length < targetCount) {
   const { rows } = await services.person.linkedin.search({
      sql: `WITH company_employees AS (...OFFSET ${offset}...) SELECT ...`
   });
   offset += 5000;
}
```

**Why banned:** Each batch takes 3s+. Total time is unbounded.

---

## Education Table Columns

| Column            | Type | Example                      |
| ----------------- | ---- | ---------------------------- |
| `school_name`     | text | "Stanford University"        |
| `degree`          | text | "Bachelor of Science", "MBA" |
| `field_of_study`  | text | "Computer Science"           |
| `start_date_year` | int  | 2018                         |
| `end_date_year`   | int  | 2022 (NULL if current)       |

---

## Summary

| Query Type                             | Status  | Time      |
| -------------------------------------- | ------- | --------- |
| Education only (school, degree, field) | ALLOWED | 83-257ms  |
| Education + company CTE                | BANNED  | 3s        |
| Education + company batching           | BANNED  | Unbounded |

**For alumni at a specific company, use web search or decompose into separate queries.**
