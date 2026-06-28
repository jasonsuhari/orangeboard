---
name: anti-patterns
description: BANNED patterns that cause timeouts in company queries. Benchmarks included.
---

# Company Query Anti-Patterns

> **The LinkedIn DB is a lookup tool, not a search engine.** All patterns below are BANNED — they exceed the 3-second hard budget. **You MUST read `services/web/search` before using web search.**

---

## Banned Patterns Summary

| Anti-Pattern                 | Tested Time | Alternative        |
| ---------------------------- | ----------- | ------------------ |
| Description ILIKE (any)      | 47ms-10.2s  | Web search         |
| Regex on description         | 10.2s       | Web search         |
| ORDER BY + text search       | 12.5s       | Skip ORDER BY      |
| LATERAL job queries          | 407ms-28.7s | Web search         |
| company_name ILIKE           | 813ms-11.7s | Domain/slug lookup |
| UNION ALL multiple companies | 14.6s       | Loop per company   |
| Direct slug comparison       | 15s         | key64()            |
| Rank columns                 | 5.3s        | Web search         |
| 3+ table joins               | 1s+         | Decompose          |

---

## BANNED: Description Search

```sql
-- ❌ BANNED: Single term (47ms-630ms unreliable)
WHERE lc.description ILIKE '%AI%'

-- ❌ BANNED: Multiple terms (630ms)
WHERE lc.description ILIKE '%AI%' AND lc.description ILIKE '%video%'

-- ❌ BANNED: OR patterns (1.1s)
WHERE lc.description ILIKE '%saas%' OR lc.description ILIKE '%platform%'

-- ❌ BANNED: Regex (10.2s)
WHERE lc.description ~* 'SaaS.*(usage|consumption)'

-- ❌ BANNED: ORDER BY with text search (12.5s)
WHERE lc.description ILIKE '%saas%' ORDER BY lc.id
```

**Use web search:**

```typescript
services.web.search({ query: 'site:linkedin.com/company "AI" "Austin"' });
```

---

## BANNED: LATERAL Job Queries

```sql
-- ❌ BANNED: LATERAL single title (407ms-28.7s)
SELECT * FROM title_ids t,
LATERAL (SELECT * FROM linkedin_job lj WHERE lj.title_id = t.id LIMIT 200) lj

-- ❌ BANNED: LATERAL multiple titles (TIMEOUT)
WITH title_ids AS (SELECT id FROM job_title WHERE title_key64 IN (...))
SELECT * FROM title_ids t, LATERAL (SELECT * FROM linkedin_job lj WHERE lj.title_id = t.id LIMIT 100) lj

-- ❌ BANNED: LATERAL with location (TIMEOUT)
LATERAL (SELECT * FROM linkedin_job lj WHERE lj.address_region = 'CO' LIMIT 100)
```

**Use web search:**

```typescript
services.web.search({ query: 'site:linkedin.com/jobs "Account Executive" "San Francisco"' });
```

---

## BANNED: company_name ILIKE

```sql
-- ❌ BANNED: company_name search (813ms-11.7s)
WHERE lc.company_name ILIKE '%stripe%'
WHERE lc.company_name ILIKE '%google%'
```

**Use domain or slug lookup instead:**

```sql
-- ✅ ALLOWED: Domain (5ms)
WHERE lc.domain = 'stripe.com'

-- ✅ ALLOWED: Slug with key64 (4-8ms)
WHERE lcs.slug_key64 = key64('stripe')
```

---

## BANNED: UNION ALL Multiple Companies

```sql
-- ❌ BANNED: UNION ALL (14.6s)
(SELECT * FROM linkedin_job j WHERE j.linkedin_company_id = 2135371 LIMIT 15)
UNION ALL
(SELECT * FROM linkedin_job j WHERE j.linkedin_company_id = 1441 LIMIT 15)
```

**Loop instead:**

```typescript
for (const companyId of [2135371, 1441]) {
   const { rows } = await services.company.linkedin.search({
      sql: `SELECT * FROM linkedin_job j WHERE j.linkedin_company_id = ${companyId} LIMIT 15`
   });
}
```

---

## BANNED: Direct Slug Comparison

```sql
-- ❌ BANNED: Direct slug (15s timeout)
WHERE lcs.slug = 'openai'
WHERE lc.universal_name = 'stripe'

-- ✅ ALLOWED: key64() (4-8ms)
WHERE lcs.slug_key64 = key64('openai')
```

---

## BANNED: Rank Columns

```sql
-- ❌ BANNED: Rank columns (5.3s)
WHERE c.rank_fortune IS NOT NULL
WHERE c.rank_incmagazine IS NOT NULL
```

**Use web search:**

```typescript
services.web.search({ query: 'site:linkedin.com/company "Fortune 500"' });
```

---

## BANNED: 3+ Table Joins

```sql
-- ❌ BANNED: 3-table join (1s+)
SELECT lp.*, lc.*, f.*
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
JOIN linkedin_company lc ON lc.id = pos.linkedin_company_id
JOIN linkedin_crunchbase_funding f ON f.linkedin_company_id = lc.id
```

**Decompose into 2-table queries:**

1. Query companies with funding (2-table)
2. Query employees per company (2-table)

---

## BANNED: IN Subquery with Large Set

```sql
-- ❌ BANNED: Builds full list in memory
WHERE lc.id IN (SELECT linkedin_company_id FROM linkedin_crunchbase_funding)
```

**Use EXISTS (but only if necessary):**

```sql
WHERE EXISTS (SELECT 1 FROM linkedin_crunchbase_funding f WHERE f.linkedin_company_id = lc.id)
```

---

## Sparse/Broken Fields

These fields don't work — avoid them:

| Field                | Problem              |
| -------------------- | -------------------- |
| `specialties` array  | <5% populated, slow  |
| `has_careers = true` | Never populated      |
| `rank_fortune`       | Not indexed, timeout |
| `rank_incmagazine`   | Not indexed, timeout |
