---
name: headline-search
description: Headline search — ONLY 6 common terms allowed (51-161ms). Everything else uses web search.
---

# Headline Search

> **The LinkedIn DB is a lookup tool, not a search engine.** Only 6 common headline terms are allowed. All other terms require web search. **You MUST read `services/web/search` before using web search.**

---

## ALLOWED Terms (Under 200ms)

Only these 5 terms are fast enough:

| Term      | Tested Time |
| --------- | ----------- |
| engineer  | 51ms        |
| manager   | 78ms        |
| sales     | 91ms        |
| developer | 103ms       |
| founder   | 161ms       |

---

## ALLOWED: Common Term Search — 51-161ms

```sql
SELECT lp.first_name, lp.last_name, lp.headline,
       lp.public_profile_url AS lp_linkedin_url
FROM linkedin_profile lp
WHERE lp.location_country_code = 'US'
  AND lp.headline ILIKE '%engineer%'
LIMIT 100
```

---

## BANNED: All Other Terms

| Term       | Tested Time | Result   |
| ---------- | ----------- | -------- |
| DevOps     | 847ms       | Too slow |
| blockchain | 1.2s        | Too slow |
| kubernetes | 2.1s        | Too slow |
| tensorflow | TIMEOUT     | Fails    |
| solidity   | TIMEOUT     | Fails    |
| mobile     | TIMEOUT     | Fails    |
| iOS        | TIMEOUT     | Fails    |

**Use web search instead:**

```typescript
const results = await services.web.search({
   query: 'site:linkedin.com/in "kubernetes engineer" "San Francisco"'
});

// Extract URLs
const urls = results.results.filter((r) => r.link.includes("linkedin.com/in/")).map((r) => r.link);

// Enrich each profile
for (const url of urls) {
   const profile = await services.person.linkedin.enrich({ url });
}
```

---

## BANNED: Denormalized Tables

The documentation previously suggested using `lkd_profile` for rare terms. **This is incorrect** — denormalized tables do not help with rare terms. They still timeout.

```sql
-- ❌ BANNED: Denormalized doesn't help
SELECT lkd.first_name, lkd.headline
FROM lkd_profile lkd
WHERE lkd.headline ILIKE '%tensorflow%'  -- Still times out
```

---

## BANNED: Multiple Terms with Regex

```sql
-- ❌ BANNED: Regex patterns are not faster
WHERE lp.headline ~* '(\\mCEO\\M|\\mCTO\\M|\\mCFO\\M)'
```

**Use separate queries for each common term, or web search for rare terms.**

---

## BANNED: Location + Headline

```sql
-- ❌ BANNED: Location filter makes headline search slower
WHERE lp.headline ILIKE '%engineer%'
  AND lp.location_name ILIKE '%austin%'
```

**Filter location in application code after querying:**

```typescript
const { rows } = await services.person.linkedin.search({
   sql: `SELECT lp.first_name, lp.headline, lp.location_name
         FROM linkedin_profile lp
         WHERE lp.headline ILIKE '%engineer%'
           AND lp.location_country_code = 'US'
         LIMIT 200`
});

// Filter in code
const austinResults = rows.filter((r) => r.location_name?.toLowerCase().includes("austin"));
```

---

## Summary

| Scenario                                                        | Method      |
| --------------------------------------------------------------- | ----------- |
| Common term (engineer, CEO, manager, sales, developer, founder) | LinkedIn DB |
| Any other term                                                  | Web search  |
| Term + specific location                                        | Web search  |
| Multiple terms combined                                         | Web search  |

**When in doubt, use web search:**

```typescript
services.web.search({ query: 'site:linkedin.com/in "[keywords]" "[location]"' });
```
