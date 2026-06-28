---
name: hiring-detection
description: Detect if companies are actively hiring for specific roles using LinkedIn DB or job board scrapers
---

# Hiring Detection

Check if companies are hiring for a specific role.

> **LinkedIn DB is a lookup tool, not a search engine.** For hiring detection, LinkedIn DB is ONLY for checking jobs at a **SINGLE known company** by ID. For "companies hiring [role]" (searching across companies), use web search instead.

---

## Option 1: LinkedIn Database (SINGLE COMPANY ONLY)

> **RESTRICTION:** LinkedIn DB is only for checking jobs at a company you already have the ID for. Do NOT use it to search for "companies hiring X role" across many companies — that requires LATERAL joins which timeout (28s+).

**Allowed:** Check if Stripe (company_id: 2135371) is hiring engineers:

```sql
SELECT j.title, j.location
FROM linkedin_job j
WHERE j.linkedin_company_id = 2135371
  AND j.title ILIKE '%engineer%'
  AND j.closed_since IS NULL
LIMIT 20
```

**BANNED:** Find all companies hiring Account Executives (uses LATERAL = TIMEOUT).

```typescript
// Use web search instead:
const results = await services.web.search({
   query: 'site:linkedin.com/jobs "Account Executive" "San Francisco"'
});
```

---

## Option 2: Apify (Indeed, other job boards)

For job boards not in the LinkedIn database, use Apify actors.

See `services/apify/runActor.md` for how to search and run actors.

---

## Option 3: Web Search (For "Companies Hiring X Role")

**Use web search for role-based hiring searches.** This works across all major ATS platforms — use the `site:` operator to target specific job boards.

### ATS Platforms

Pick 3-5 based on target market. Heavy overlap between boards — don't search all.

| Target     | Sites to search                                                                           |
| ---------- | ----------------------------------------------------------------------------------------- |
| Startups   | `linkedin.com/jobs`, `jobs.ashbyhq.com`, `jobs.lever.co`, `greenhouse.io`                 |
| Enterprise | `linkedin.com/jobs`, `greenhouse.io`, `wd1.myworkdayjobs.com`, `jobs.smartrecruiters.com` |
| SMB        | `linkedin.com/jobs`, `jobs.bamboohr.com`, `apply.jazz.co`, `careers.workable.com`         |

Other available: `careers.icims.com`, `jobs.jobvite.com`

### How to Search: Parallel Dorks

One search per platform in parallel. Don't combine `site:` operators — Google truncates long dorks.

```typescript
const sites = ["linkedin.com/jobs", "jobs.ashbyhq.com", "greenhouse.io", "jobs.lever.co"];
const roleQuery = '("founding engineer" OR "first engineer") AND ("hiring" OR "apply" OR "open role")';

const results = await services.web.batchSearch({
   queries: sites.map((site) => ({ query: `site:${site} ${roleQuery}` }))
});
```

### Deduplication

Same job appears across boards. Deduplicate by **company slug from the ATS URL** (most ATS URLs embed it: `greenhouse.io/stripe/...`, `jobs.lever.co/stripe/...`). For LinkedIn, extract company name from the result title (`"Role at Company | LinkedIn"`).

---

## Which to Use

| Use Case                             | Method                      |
| ------------------------------------ | --------------------------- |
| Check if ONE known company is hiring | LinkedIn DB (by company_id) |
| Find all companies hiring [role]     | Web search (any ATS site)   |
| Need Indeed/Glassdoor data           | Apify                       |
| Broader keyword search               | Web search or Apify         |
