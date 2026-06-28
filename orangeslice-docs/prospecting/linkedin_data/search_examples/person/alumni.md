---
name: alumni
description: Find former employees. Basic alumni allowed (29-248ms). ORDER BY and complex alumni are banned.
---

# Alumni Queries

> **The LinkedIn DB is a lookup tool, not a search engine.** Only basic alumni queries are allowed (29-248ms). ORDER BY and complex alumni (ex-X now-at-Y) are banned. **You MUST read `services/web/search` before using web search.**

---

## ALLOWED: Basic Former Employees (no ORDER BY) — 29-248ms

```sql
SELECT lp.first_name, lp.last_name, lp.headline, pos.title,
       lp.public_profile_url AS lp_linkedin_url
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
WHERE pos.linkedin_company_id = 2135371
  AND pos.end_date IS NOT NULL
  AND lp.location_country_code = 'US'
LIMIT 100
```

---

## ALLOWED: With Title Filter (no ORDER BY)

```sql
SELECT lp.first_name, lp.last_name, lp.headline, pos.title,
       lp.public_profile_url AS lp_linkedin_url
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
WHERE pos.linkedin_company_id = 2135371
  AND pos.end_date IS NOT NULL
  AND pos.title ~* '(VP|Vice President|Director)'
  AND lp.location_country_code = 'US'
LIMIT 100
```

---

## BANNED: ORDER BY — TIMEOUT for large companies

```sql
-- ❌ BANNED: ORDER BY times out for large companies
SELECT lp.first_name, pos.title, pos.end_date
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
WHERE pos.linkedin_company_id = 2135371
  AND pos.end_date IS NOT NULL
ORDER BY pos.end_date DESC  -- TIMEOUT
LIMIT 100
```

**Skip ORDER BY. Sort in application code if needed:**

```typescript
const { rows } = await services.person.linkedin.search({
   sql: `SELECT ... WHERE pos.end_date IS NOT NULL LIMIT 200`
});
// Sort in code
rows.sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
```

---

## BANNED: Complex Alumni (Ex-X Now at Y) — TIMEOUT

```sql
-- ❌ BANNED: Multiple position joins always timeout
SELECT lp.first_name, prev.title AS prev_title, curr.title AS curr_title
FROM linkedin_profile lp
JOIN linkedin_profile_position3 prev ON prev.linkedin_profile_id = lp.id
JOIN linkedin_profile_position3 curr ON curr.linkedin_profile_id = lp.id
WHERE prev.linkedin_company_id = 1441  -- Google (past)
  AND prev.end_date IS NOT NULL
  AND curr.end_date IS NULL            -- Current job
```

**Use two separate queries instead:**

```typescript
// Step 1: Get former employees
const { rows: alumni } = await services.person.linkedin.search({
   sql: `SELECT lp.id, lp.first_name, lp.headline, lp.public_profile_url
         FROM linkedin_profile lp
         JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
         WHERE pos.linkedin_company_id = 1441
           AND pos.end_date IS NOT NULL
           AND lp.location_country_code = 'US'
         LIMIT 100`
});

// Step 2: Add "Current Company" as enrichment column
// Or query current position per profile separately
```

---

## BANNED: Recent Departures with Date Filter — Borderline

```sql
-- ❌ CAUTION: Can timeout for large companies
WHERE pos.end_date >= NOW() - INTERVAL '6 months'
```

**Use web search for "recent departures" queries:**

```typescript
const results = await services.web.search({
   query: 'site:linkedin.com/in "former" "Google" "left"'
});
```

---

## Summary

| Query Type                             | Status  | Time       |
| -------------------------------------- | ------- | ---------- |
| Basic alumni (no ORDER BY)             | ALLOWED | 29-248ms   |
| Alumni with title filter (no ORDER BY) | ALLOWED | 29-248ms   |
| Alumni with ORDER BY                   | BANNED  | TIMEOUT    |
| Ex-X now at Y                          | BANNED  | TIMEOUT    |
| Recent departures (date filter)        | BANNED  | Borderline |
