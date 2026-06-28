---
name: jobs-by-role
description: BANNED — LATERAL job queries timeout (407ms-28.7s). Use web search instead.
---

# Find Jobs by Role

> **BANNED: LATERAL job queries are unreliable (407ms-28.7s) and often timeout.**
>
> **Use web search instead:**
>
> ```typescript
> const results = await services.web.search({
>    query: 'site:linkedin.com/jobs "Account Executive" "San Francisco"'
> });
> ```

---

## Why This Is Banned

| Pattern                          | Tested Time | Result       |
| -------------------------------- | ----------- | ------------ |
| LATERAL single title (LIMIT 200) | 407ms       | Borderline   |
| LATERAL single title (LIMIT 500) | 28.7s       | TIMEOUT      |
| LATERAL multiple titles          | TIMEOUT     | Always fails |
| LATERAL with location filter     | TIMEOUT     | Always fails |

**The LinkedIn DB is a lookup tool, not a search engine.** LATERAL joins scan millions of rows. **You MUST read `services/web/search` before using web search.**

---

## Web Search Alternative

### Find Jobs by Role in Location

```typescript
const results = await services.web.search({
   query: 'site:linkedin.com/jobs "Account Executive" "San Francisco"'
});

// Extract job URLs
const jobUrls = results.results.filter((r) => r.link.includes("linkedin.com/jobs")).map((r) => r.link);
```

### Find Companies Hiring for Role

```typescript
const results = await services.web.search({
   query: 'site:linkedin.com/jobs "Software Engineer" "Austin" "startup"'
});

// Extract company names from results
// Then look up companies by domain/slug (allowed)
```

### Find Funded Companies Hiring for Role

```typescript
// Step 1: Web search for job postings
const results = await services.web.search({
   query: 'site:linkedin.com/jobs "DevOps Engineer" "Series A"'
});

// Step 2: Extract company URLs from results
const companyUrls = extractCompanyUrlsFromJobResults(results);

// Step 3: Look up funding per company (2-table join = allowed)
for (const url of companyUrls) {
   const slug = extractSlugFromUrl(url);
   const { rows } = await services.company.linkedin.search({
      sql: `SELECT lc.company_name, f.round_name, f.round_amount
            FROM linkedin_company_slug lcs
            JOIN linkedin_company lc ON lc.id = lcs.linkedin_company_id
            LEFT JOIN linkedin_crunchbase_funding f ON f.linkedin_company_id = lc.id
            WHERE lcs.slug_key64 = key64('${slug}')
            LIMIT 1`
   });
}
```

---

## NEVER Use These Patterns

```sql
-- ❌ BANNED: LATERAL with title_id
WITH title_ids AS (SELECT id FROM job_title WHERE title_key64 = key64('Account Executive'))
SELECT lj.* FROM title_ids t,
LATERAL (SELECT * FROM linkedin_job lj WHERE lj.title_id = t.id LIMIT 200) lj

-- ❌ BANNED: Multiple titles in LATERAL (always times out)
WITH title_ids AS (
  SELECT id FROM job_title WHERE title_key64 IN (key64('Recruiter'), key64('Senior Recruiter'))
)
SELECT * FROM title_ids t, LATERAL (SELECT * FROM linkedin_job lj WHERE lj.title_id = t.id LIMIT 100) lj

-- ❌ BANNED: Location filter in LATERAL
LATERAL (SELECT * FROM linkedin_job lj WHERE lj.address_region = 'CO' LIMIT 100)

-- ❌ BANNED: Funding + Role join
SELECT * FROM hiring_companies hc
JOIN linkedin_crunchbase_funding f ON f.linkedin_company_id = hc.linkedin_company_id
```

---

## Summary

**Do NOT use the LinkedIn DB to find jobs by role.**

Use `services.web.search("site:linkedin.com/jobs [role] [location]")` instead.

If you already have a specific company ID and want to see their job postings, use `jobs-at-company.md` (single company only).
