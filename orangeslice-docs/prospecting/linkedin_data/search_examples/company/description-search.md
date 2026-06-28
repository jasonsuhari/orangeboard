---
name: description-search
description: BANNED — Description search times out. Use web search instead.
---

# Company Description Search

> **BANNED: Description search is unreliable (47ms-10.2s) and often times out.**
>
> **Use web search instead:**
>
> ```typescript
> const results = await services.web.search({
>    query: 'site:linkedin.com/company "AI" "Austin" "Series B"'
> });
> ```

---

## Why This Is Banned

| Pattern             | Tested Time | Result     |
| ------------------- | ----------- | ---------- |
| Single term ILIKE   | 47ms-630ms  | Unreliable |
| Multiple AND terms  | 630ms       | Borderline |
| OR patterns         | 1.1s        | Too slow   |
| Regex patterns      | 10.2s       | TIMEOUT    |
| ORDER BY with ILIKE | 12.5s       | TIMEOUT    |

**The LinkedIn DB is a lookup tool, not a search engine.** Description search scans millions of rows and is not indexed. **You MUST read `services/web/search` before using web search.**

---

## Web Search Alternative

### Find Companies by Keywords

```typescript
const results = await services.web.search({
   query: 'site:linkedin.com/company "AI" "B2B SaaS" "Austin"'
});

// Extract company URLs
const companyUrls = results.results.filter((r) => r.link.includes("linkedin.com/company/")).map((r) => r.link);

// Enrich each company
for (const url of companyUrls) {
   const enriched = await services.company.linkedin.enrich({ url });
}
```

### Find Funded Companies with Keywords

```typescript
// Step 1: Web search for companies
const results = await services.web.search({
   query: 'site:linkedin.com/company "fintech" "Series A"'
});

// Step 2: Get company IDs from URLs
const companyIds = await getCompanyIdsFromUrls(results);

// Step 3: Look up funding data per company
for (const id of companyIds) {
   const { rows } = await services.company.linkedin.search({
      sql: `SELECT f.round_name, f.round_amount FROM linkedin_crunchbase_funding f WHERE f.linkedin_company_id = ${id}`
   });
}
```

---

## NEVER Use These Patterns

```sql
-- ❌ BANNED: Single term ILIKE (unreliable timing)
WHERE lc.description ILIKE '%AI%'

-- ❌ BANNED: Multiple terms (630ms)
WHERE lc.description ILIKE '%AI%' AND lc.description ILIKE '%video%'

-- ❌ BANNED: OR patterns (1.1s)
WHERE lc.description ILIKE '%saas%' OR lc.description ILIKE '%platform%'

-- ❌ BANNED: Regex (10.2s timeout)
WHERE lc.description ~* 'SaaS.*(usage|consumption)'

-- ❌ BANNED: ORDER BY with text search (12.5s timeout)
WHERE lc.description ILIKE '%saas%' ORDER BY lc.id
```

---

## Summary

**Do NOT use the LinkedIn DB for keyword/description search.**

Use `services.web.search("site:linkedin.com/company [keywords]")` instead, then enrich the resulting URLs.
