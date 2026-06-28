---
name: anti-patterns
description: BANNED patterns that cause timeouts in person queries. Benchmarks included.
---

# Person Query Anti-Patterns

> **The LinkedIn DB is a lookup tool, not a search engine.** All patterns below are BANNED — they exceed the 3-second hard budget. **You MUST read `services/web/search` before using web search.**

---

## Banned Patterns Summary

| Anti-Pattern                 | Tested Time   | Alternative      |
| ---------------------------- | ------------- | ---------------- |
| Headline (rare terms)        | TIMEOUT       | Web search       |
| Skills (any)                 | 566ms-TIMEOUT | Web search       |
| 3+ table joins               | 556ms-17.7s   | Decompose        |
| Education + company CTE      | 3s            | Education-only   |
| Complex alumni (ex-X now-Y)  | TIMEOUT       | Two queries      |
| Alumni with ORDER BY         | TIMEOUT       | Skip ORDER BY    |
| Direct slug comparison       | 15s           | key64()          |
| UNION ALL multiple companies | 14.6s         | Loop per company |
| Location + headline          | TIMEOUT       | Filter in code   |

---

## BANNED: Headline Search (Rare Terms)

```sql
-- ❌ BANNED: Rare terms timeout
WHERE lp.headline ILIKE '%kubernetes%'   -- 2.1s
WHERE lp.headline ILIKE '%tensorflow%'   -- TIMEOUT
WHERE lp.headline ILIKE '%blockchain%'   -- 1.2s
WHERE lp.headline ILIKE '%solidity%'     -- TIMEOUT
WHERE lp.headline ILIKE '%iOS%'          -- TIMEOUT
```

**Only 6 terms are allowed:** engineer, CEO, manager, sales, developer, founder

**Use web search:**

```typescript
services.web.search({ query: 'site:linkedin.com/in "kubernetes engineer"' });
```

---

## BANNED: Skills Queries

```sql
-- ❌ BANNED: All skills queries are too slow
WHERE 'Python' = ANY(lp.skills)           -- 566ms
WHERE 'Python' = ANY(lp.skills)
  AND 'Machine Learning' = ANY(lp.skills) -- 4.6s
WHERE 'React' = ANY(lp.skills)            -- TIMEOUT
WHERE 'Kubernetes' = ANY(lp.skills)       -- TIMEOUT
WHERE 'TypeScript' = ANY(lp.skills)       -- TIMEOUT
```

**Use web search:**

```typescript
services.web.search({ query: 'site:linkedin.com/in "python" "machine learning"' });
```

---

## BANNED: 3+ Table Joins

```sql
-- ❌ BANNED: 3-table join (556ms)
SELECT lp.*, lc.*, pos.*
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
JOIN linkedin_company lc ON lc.id = pos.linkedin_company_id

-- ❌ BANNED: 4-table join (1.6s)
SELECT lp.*, lc.*, f.*
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
JOIN linkedin_company lc ON lc.id = pos.linkedin_company_id
JOIN linkedin_crunchbase_funding f ON f.linkedin_company_id = lc.id

-- ❌ BANNED: CTE with complex filters (17.7s)
WITH target_companies AS (...) SELECT ...
```

**Decompose into 2-table queries.**

---

## BANNED: Education + Company CTE

```sql
-- ❌ BANNED: Education + company CTE (3s)
WITH company_employees AS (
  SELECT pos.linkedin_profile_id FROM linkedin_profile_position3 pos
  WHERE pos.linkedin_company_id = -563704526 LIMIT 5000
)
SELECT lp.*, edu.*
FROM company_employees e
JOIN linkedin_profile lp ON lp.id = e.linkedin_profile_id
JOIN linkedin_profile_education2 edu ON edu.linkedin_profile_id = e.linkedin_profile_id
```

**Use education-only queries, or decompose.**

---

## BANNED: Complex Alumni (Ex-X Now at Y)

```sql
-- ❌ BANNED: Multiple position joins (TIMEOUT)
SELECT lp.first_name
FROM linkedin_profile lp
JOIN linkedin_profile_position3 prev ON prev.linkedin_profile_id = lp.id
JOIN linkedin_profile_position3 curr ON curr.linkedin_profile_id = lp.id
WHERE prev.linkedin_company_id = 1441
  AND prev.end_date IS NOT NULL
  AND curr.end_date IS NULL
```

**Use two separate queries.**

---

## BANNED: Alumni with ORDER BY

```sql
-- ❌ BANNED: ORDER BY on alumni (TIMEOUT for large companies)
SELECT lp.first_name, pos.end_date
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
WHERE pos.linkedin_company_id = 2135371
  AND pos.end_date IS NOT NULL
ORDER BY pos.end_date DESC
```

**Skip ORDER BY. Sort in application code.**

---

## BANNED: Direct Slug Comparison

```sql
-- ❌ BANNED: Direct slug (15s timeout)
WHERE slug.slug = 'satyanadella'

-- ✅ ALLOWED: key64() (5ms)
WHERE slug.slug_key64 = key64('satyanadella')
```

---

## BANNED: UNION ALL Multiple Companies

```sql
-- ❌ BANNED: UNION ALL (14.6s)
(SELECT * FROM linkedin_profile lp
 JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
 WHERE pos.linkedin_company_id = 2135371 LIMIT 30)
UNION ALL
(SELECT * FROM linkedin_profile lp
 JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
 WHERE pos.linkedin_company_id = 1441 LIMIT 30)
```

**Loop per company instead.**

---

## BANNED: Location + Headline

```sql
-- ❌ BANNED: Location filter makes headline search slower
WHERE lp.headline ILIKE '%engineer%'
  AND lp.location_name ILIKE '%austin%'
```

**Query headline only, filter location in application code.**

---

## BANNED: Denormalized Tables for Rare Terms

```sql
-- ❌ BANNED: Denormalized doesn't help with rare terms
SELECT lkd.first_name, lkd.headline
FROM lkd_profile lkd
WHERE lkd.headline ILIKE '%tensorflow%'  -- Still times out
```

---

## Quick Reference

| Pattern                    | Status  | Alternative  |
| -------------------------- | ------- | ------------ |
| Common headline (6 terms)  | ALLOWED | —            |
| Rare headline              | BANNED  | Web search   |
| Skills (any)               | BANNED  | Web search   |
| 2-table joins              | ALLOWED | —            |
| 3+ table joins             | BANNED  | Decompose    |
| Education only             | ALLOWED | —            |
| Education + company        | BANNED  | Decompose    |
| Basic alumni (no ORDER BY) | ALLOWED | —            |
| Alumni with ORDER BY       | BANNED  | Sort in code |
| Complex alumni             | BANNED  | Two queries  |
