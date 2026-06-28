---
name: QUICK_REF
description: Critical rules and query methodology for LinkedIn B2B database. Mandatory read before any query.
---

# B2B SQL Reference

> **🚫 BEFORE YOU QUERY: Is this for prospecting/discovery?** This database is almost never the right tool for finding new leads. It is primarily for lookups and enrichment of entities you already have identifiers for. The only prospecting exception is **trivially simple queries on single indexed columns** (e.g. `industry_code = 4 AND country_code = 'US'`). Any query with keywords, descriptions, ILIKE on names, skills, or semantic matching → use `services.web.search` with `site:linkedin.com` instead.

> Only fast indexed queries are allowed (under 3 seconds, max 2-table joins). Everything else falls back to `services.web.search` with `site:linkedin.com` patterns. **You MUST read `services/web/search` before using web search.**

---

## How to Call

```typescript
// Company queries
const { rows } = await services.company.linkedin.search({
   sql: "SELECT ... FROM linkedin_company ... LIMIT 50"
});

// Person queries
const { rows } = await services.person.linkedin.search({
   sql: "SELECT ... FROM linkedin_profile ... LIMIT 100"
});
```

---

## 3-Second Hard Budget

**Every query MUST complete in under 3 seconds.** If a query pattern typically exceeds 3s, it is BANNED — use web search instead.

---

## ALLOWED Query Types (Whitelist)

### Company Queries

| Query Type                     | Tables                     | Tested Time | Example                              |
| ------------------------------ | -------------------------- | ----------- | ------------------------------------ |
| Company by key64 slug          | company_slug + company     | 50ms        | Lookup Stripe by LinkedIn URL        |
| Company by domain              | company                    | 50ms        | `domain = 'stripe.com'`              |
| Company by ID                  | company                    | 60ms        | Direct ID lookup                     |
| Company by universal_name      | company                    | 50ms        | `universal_name = 'stripe'`          |
| Company by ticker              | company                    | 50ms        | `ticker = 'AAPL'` (indexed)          |
| Companies by industry_code     | company                    | 70-200ms    | `industry_code IN (4, 6, 96)`        |
| Companies by country_code      | company                    | 70ms        | `country_code = 'US'`                |
| Companies by region            | company                    | 70ms        | `region = 'California'`              |
| Companies by locality          | company                    | 170-530ms   | `locality ILIKE '%Austin%'`          |
| Companies by employee_count    | company                    | 180-850ms   | `employee_count BETWEEN 50 AND 500`  |
| Companies by company_size_code | company                    | 60ms        | `company_size_code IN ('C','D','E')` |
| Companies by founded year      | company                    | 50ms        | `founded >= 2020` (NO ORDER BY!)     |
| Multi-filter combo             | company                    | 200-850ms   | industry + country + employee        |
| Basic funding (2-table)        | company + funding          | 120-320ms   | Series A companies                   |
| Growth metrics (2-table)       | linkedin_company + company | 190-370ms   | `employee_growth_12mo > 0.25`        |
| Jobs at ONE company            | job                        | 510-690ms   | Open roles by company ID             |
| Multiple domain IN()           | company                    | 920ms       | Up to 5 domains                      |
| Employees at ONE company       | position                   | 60ms        | Current employees by company ID      |
| LIMIT up to 2000               | company                    | 300-500ms   | Batch retrieval                      |

### Person Queries

| Query Type                   | Tables                  | Tested Time | Example                   |
| ---------------------------- | ----------------------- | ----------- | ------------------------- |
| Person by key64 slug         | profile_slug + profile  | 5ms         | Find specific person      |
| People at company            | profile + position3     | 8-32ms      | Employees at Stripe by ID |
| Certifications               | profile + certification | 160-312ms   | AWS certified people      |
| Education-only               | profile + education     | 83-257ms    | Stanford graduates        |
| Basic alumni (no ORDER BY)   | profile + position3     | 29-248ms    | Former employees          |
| Headline (common terms ONLY) | profile                 | 51-161ms    | "engineer", "sales"       |

---

## BANNED Query Types (Use Web Search)

### Company Query Bans

| Query Type                    | Tested Time | Why Banned        | Alternative                   |
| ----------------------------- | ----------- | ----------------- | ----------------------------- |
| **ORDER BY employee_count**   | **20.2s**   | Full table sort   | Remove ORDER BY, sort in code |
| **ORDER BY follower_count**   | **23.3s**   | Full table sort   | Remove ORDER BY, sort in code |
| **ORDER BY founded**          | **22.1s**   | Full table sort   | Remove ORDER BY, sort in code |
| **COUNT(\*)**                 | **22.4s**   | Full table scan   | Estimate or skip              |
| **SELECT DISTINCT**           | **20.0s**   | Full table scan   | Dedupe in code                |
| **'X' = ANY(specialties)**    | **23.6s**   | Array scan        | Web search                    |
| **has_careers = true**        | **28.6s**   | Unindexed boolean | Web search                    |
| **company_type = 'X'**        | **25.8s**   | Unindexed string  | Use `ticker IS NOT NULL`      |
| **company_size = 'X'**        | **23.7s**   | Unindexed string  | Use `company_size_code`       |
| **company_name ILIKE (rare)** | **9.4s**    | Seq scan          | Domain/slug or web search     |
| **description ILIKE (rare)**  | **14.4s**   | Seq scan          | Web search                    |
| Jobs by role (LATERAL)        | 28.7s       | N+1 pattern       | Web search                    |
| Direct slug comparison        | 15s         | No index          | Use `key64()`                 |
| Multi-company UNION ALL       | 14.6s       | Slow combine      | Loop per company              |

> **Note:** `company_name ILIKE` with COMMON terms (`%tech%`, `%consulting%`) is OK at 150-300ms. Only RARE terms are banned.

### Person Query Bans

| Query Type                  | Tested Time   | Why Banned                       | Alternative                 |
| --------------------------- | ------------- | -------------------------------- | --------------------------- |
| Headline (rare terms)       | TIMEOUT       | tensorflow, solidity, blockchain | Web search                  |
| Skills queries              | 566ms-TIMEOUT | Even "common" skills timeout     | Web search                  |
| Education + company CTE     | 3s-TIMEOUT    | CTE overhead                     | Education-only, then filter |
| Complex alumni (ex-X now-Y) | TIMEOUT       | Multiple conditions              | Two separate queries        |
| Rank columns                | 5.3s          | rank_fortune, rank_incmagazine   | Skip or post-filter         |
| Hypergrowth 3mo             | 2.6s          | Computed column overhead         | Basic growth only           |
| 3+ table joins              | 556ms-17.7s   | Multiplies rows                  | Decompose into 2-table      |

---

## Route to the Correct Example File

| User Request Type                  | Read This File                                    | Status                      |
| ---------------------------------- | ------------------------------------------------- | --------------------------- |
| Company by domain/slug/ID          | `./search_examples/company/lookups.md`            | ALLOWED                     |
| Company description/keyword search | `./search_examples/company/description-search.md` | **BANNED** — use web search |
| Funding/VC-backed companies        | `./search_examples/company/funding.md`            | ALLOWED (2-table only)      |
| Jobs at specific company           | `./search_examples/company/jobs-at-company.md`    | ALLOWED (single company)    |
| Jobs by role across companies      | `./search_examples/company/jobs-by-role.md`       | **BANNED** — use web search |
| Company growth metrics             | `./search_examples/company/growth.md`             | ALLOWED (basic only)        |
| Person by LinkedIn URL             | `./search_examples/person/lookups.md`             | ALLOWED                     |
| Employees at a company             | `./search_examples/person/lookups.md`             | ALLOWED                     |
| Headline search (common terms)     | `./search_examples/person/headline-search.md`     | ALLOWED (6 terms only)      |
| Headline search (other terms)      | —                                                 | **BANNED** — use web search |
| People at companies (3+ table)     | `./search_examples/person/joins.md`               | **BANNED** — decompose      |
| Education/alumni queries           | `./search_examples/person/education.md`           | ALLOWED (education-only)    |
| Former employees                   | `./search_examples/person/alumni.md`              | ALLOWED (no ORDER BY)       |
| Skills-based search                | —                                                 | **BANNED** — use web search |
| What NOT to do                     | `./search_examples/*/anti-patterns.md`            | Read for banned patterns    |

---

## Web Search Fallbacks

> **🚨 Before using `services.web.search`, you MUST read `services/web/search` for the full API, parameters, and usage patterns.**

Every BANNED pattern has a concrete alternative:

```typescript
// Company by description/keywords
const results = await services.web.search({
   query: 'site:linkedin.com/company "AI" "Austin" "Series B"'
});

// Jobs by role across companies
const results = await services.web.search({
   query: 'site:linkedin.com/jobs "Account Executive" "San Francisco"'
});

// People by rare headline
const results = await services.web.search({
   query: 'site:linkedin.com/in "kubernetes engineer" "San Francisco"'
});

// People by skills
const results = await services.web.search({
   query: 'site:linkedin.com/in "python" "machine learning" engineer'
});
```

Then enrich URLs with `services.person.linkedin.enrich` or `services.company.linkedin.enrich`.

---

## Mandatory Rules

| Rule                                                     | Why                                                        |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| **3s hard max**                                          | Queries exceeding 3s are banned                            |
| **2-table max**                                          | 3+ table joins can timeout (small ref tables OK)           |
| **Always LIMIT**                                         | Max 100 for people, max 2000 for companies                 |
| **Always key64()**                                       | Direct slug = 15s timeout                                  |
| **Use indexed columns first**                            | Filter by ID, then ILIKE                                   |
| **Single company for jobs**                              | UNION ALL = 14.6s                                          |
| **Common headline terms only**                           | 6 terms: engineer, CEO, manager, sales, developer, founder |
| **No skills**                                            | All skill queries are banned                               |
| **No LATERAL**                                           | LATERAL joins timeout                                      |
| **NO ORDER BY on employee_count/follower_count/founded** | Turns 50ms → 20s+                                          |
| **NO COUNT(\*) or DISTINCT**                             | Full table scans (20-23s)                                  |
| **NO has_careers, company_type, company_size strings**   | Unindexed (24-29s)                                         |
| **Use company_size_code** instead of company_size        | 60ms vs 24s                                                |
| **Use ticker IS NOT NULL** for public companies          | 50ms vs 26s                                                |

---

## Indexed Columns (ONLY these are fast)

| Table                         | Indexed Columns                              | Speed     |
| ----------------------------- | -------------------------------------------- | --------- |
| `linkedin_company`            | `id`, `domain`, `universal_name`, `ticker`   | 50-60ms   |
| `linkedin_company_slug`       | `slug_key64` (via `key64()`)                 | 50ms      |
| `linkedin_profile`            | `id`, `location_country_code`                | —         |
| `linkedin_profile_slug`       | `slug_key64` (via `key64()`)                 | 5ms       |
| `linkedin_profile_position3`  | `linkedin_profile_id`, `linkedin_company_id` | 8-60ms    |
| `linkedin_job`                | `linkedin_company_id`                        | 510-690ms |
| `linkedin_crunchbase_funding` | `linkedin_company_id`                        | 120-320ms |
| `company`                     | `linkedin_id`                                | 190ms     |

**FAST filters (not indexed but quick due to selectivity):**

- `country_code`, `industry_code`, `region`, `locality`, `employee_count`, `company_size_code`, `founded`

**NOT indexed (WILL TIMEOUT with rare terms or ORDER BY):**

- `headline`, `title`, `description`, `company_name`, `company_type`, `company_size`, `has_careers`, `specialties`, `skills`

---

## Required Aliases

| Table                         | Alias |
| ----------------------------- | ----- |
| `linkedin_profile`            | `lp`  |
| `linkedin_company`            | `lc`  |
| `linkedin_profile_position3`  | `pos` |
| `linkedin_crunchbase_funding` | `f`   |
| `linkedin_job`                | `j`   |

---

## Output Format

Always include LinkedIn URLs:

```sql
'https://www.linkedin.com/company/' || lc.universal_name AS lc_linkedin_url
lp.public_profile_url AS lp_linkedin_url
```

---

## PREFERRED: Use Wrapper Functions

For employee searches, **ALWAYS use `services.company.getEmployeesFromLinkedin`** instead of raw SQL:

```typescript
const result = await services.company.getEmployeesFromLinkedin({
   companySlug: "stripe",
   titleVariations: ["engineer"],
   limit: 50
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
