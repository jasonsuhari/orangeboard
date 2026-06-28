---
name: lookups
description: Fast indexed lookups for finding people by slug or at companies. 5-32ms.
---

# Person Lookups

> **The LinkedIn DB is a lookup tool, not a search engine.** Only slug and company_id lookups are allowed (5-32ms). **You MUST read `services/web/search` before using web search.**

---

## PREFERRED: Use Service for Employee Lookups

**For finding employees at a company, ALWAYS use `services.company.getEmployeesFromLinkedin`:**

```typescript
const result = await services.company.getEmployeesFromLinkedin({
   companySlug: "stripe",
   titleVariations: ["engineer", "developer"],
   limit: 50,
   onlyCurrent: true,
   usOnly: true
});
```

For leadership roles or rare titles, use `searchStrategy: "web"`:

```typescript
const leaders = await services.company.getEmployeesFromLinkedin({
   companySlug: "stripe",
   searchStrategy: "web",
   titleVariations: ["CEO", "founder", "CTO"],
   limit: 10
});
```

---

## ALLOWED: Lookup by LinkedIn Slug — 5ms

> **CRITICAL: ALWAYS use `key64()` for slug matching. Direct slug comparison = 15s timeout.**

```sql
SELECT lp.first_name, lp.last_name, lp.headline,
       lp.public_profile_url AS lp_linkedin_url
FROM linkedin_profile_slug slug
JOIN linkedin_profile lp ON lp.id = slug.linkedin_profile_id
WHERE slug.slug_key64 = key64('satyanadella')
```

```sql
-- ❌ BANNED: Direct slug comparison (15s timeout)
WHERE slug.slug = 'satyanadella'

-- ✅ ALLOWED: key64() (5ms)
WHERE slug.slug_key64 = key64('satyanadella')
```

---

## ALLOWED: People at Company — 8-32ms

Filter by `linkedin_company_id` (indexed), then apply title filters.

```sql
SELECT lp.first_name, lp.last_name, lp.headline, pos.title,
       lp.public_profile_url AS lp_linkedin_url
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
WHERE pos.linkedin_company_id = 2135371
  AND pos.end_date IS NULL
  AND lp.location_country_code = 'US'
LIMIT 100
```

### With Title Filter

```sql
SELECT lp.first_name, lp.last_name, lp.headline, pos.title,
       lp.public_profile_url AS lp_linkedin_url
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
WHERE pos.linkedin_company_id = 2135371
  AND pos.end_date IS NULL
  AND pos.title ILIKE '%engineer%'
  AND lp.location_country_code = 'US'
LIMIT 100
```

---

## Helper: Get Company ID First

### By LinkedIn Slug — 4-8ms

```sql
SELECT lcs.linkedin_company_id
FROM linkedin_company_slug lcs
WHERE lcs.slug_key64 = key64('stripe')
LIMIT 1
```

### By Domain — 5ms

```sql
SELECT lc.id
FROM linkedin_company lc
WHERE lc.domain = 'stripe.com'
ORDER BY lc.employee_count DESC NULLS LAST
LIMIT 1
```

---

## BANNED Patterns

| Pattern                         | Why Banned  | Alternative      |
| ------------------------------- | ----------- | ---------------- |
| Direct slug comparison          | 15s timeout | Use key64()      |
| Multiple companies in one query | Slow        | Loop per company |
| 3+ table joins                  | 556ms-17.7s | Decompose        |
| Headline search (rare terms)    | TIMEOUT     | Web search       |
| Skills queries                  | TIMEOUT     | Web search       |

---

## Output Requirements

- **Always include LIMIT** (max 100)
- **Always include LinkedIn URL**: `lp.public_profile_url AS lp_linkedin_url`
- **Use `lp` alias** for profile tables
- **Default to US**: `lp.location_country_code = 'US'`
