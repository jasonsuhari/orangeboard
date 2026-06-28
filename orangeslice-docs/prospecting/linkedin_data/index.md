---
name: linkedin_data
description: LinkedIn B2B database — LOOKUP & ENRICHMENT TOOL. Almost never for prospecting. Only trivially simple indexed-column filters are acceptable for discovery.
---

# LinkedIn B2B Database

> **🚫 This database is almost never the right choice for prospecting/discovery.** It is primarily a lookup & enrichment tool for entities you already have identifiers for. The only prospecting exception is **trivially simple queries on single indexed columns** (e.g. `industry_code = 4 AND country_code = 'US'`).
>
> **Before querying this database, ask yourself:** "Am I searching/discovering, or am I looking up something I already have an ID for?" If searching → use `services.web.search`. If looking up → proceed.

---

## When to Use This Database

| Use Case                         | Example                                                    | OK?                                            |
| -------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| **Lookup by known identifier**   | Company by domain/slug/ID, person by LinkedIn URL          | ✅ Always OK                                   |
| **Employees at a known company** | People at Stripe by company_id                             | ✅ Always OK                                   |
| **Trivially simple prospecting** | `WHERE industry_code = 4 AND country_code = 'US' LIMIT 50` | ✅ OK — no keywords, no ILIKE, no descriptions |
| **Keyword/description search**   | "AI CRM companies", "fintech startups"                     | ❌ Use web search                              |
| **Any ILIKE on names/headlines** | `headline ILIKE '%kubernetes%'`                            | ❌ Use web search                              |
| **Skills, rare terms, fuzzy**    | "python engineers", "climate tech"                         | ❌ Use web search                              |
| **Multi-criteria discovery**     | Industry + funding + keywords                              | ❌ Use web search + Crunchbase                 |

**The test:** Can your query be expressed with ONLY indexed equality/range filters (industry_code, country_code, company_size_code, employee_count, region)? If yes, LinkedIn DB is acceptable. If you need ANY keywords, descriptions, ILIKE, skills, or semantic matching — **use web search**.

---

## What This Database CAN Do (Under 3s)

| Query Type                           | Example                                           |
| ------------------------------------ | ------------------------------------------------- |
| Company by domain/slug/ID            | Find Stripe by `stripe.com`                       |
| Employees at known company           | People at Stripe by company_id                    |
| Simple indexed-column company filter | `industry_code = 4 AND country_code = 'US'`       |
| Basic funding (2-table)              | Funding history for a known company               |
| Jobs at ONE company                  | Open roles at Stripe                              |
| Person by LinkedIn URL               | Find person by slug                               |
| Certifications                       | AWS certified people                              |
| Education-only                       | Stanford graduates                                |
| Headline (6 common terms ONLY)       | engineer, CEO, manager, sales, developer, founder |

## What This Database CANNOT Do (Use Web Search)

| Query Type                      | Web Search Alternative                     |
| ------------------------------- | ------------------------------------------ |
| Company by keywords/description | `site:linkedin.com/company [keywords]`     |
| Any ILIKE on names/headlines    | `site:linkedin.com/in [keywords]`          |
| Jobs by role across companies   | `site:linkedin.com/jobs [role] [location]` |
| People by rare headline terms   | `site:linkedin.com/in [keywords]`          |
| People by skills                | `site:linkedin.com/in [skill]`             |
| 3+ table joins                  | Decompose into 2-table queries             |
| Complex alumni (ex-X now-Y)     | Two separate queries                       |
| Any fuzzy/semantic matching     | Web search with relevant keywords          |

---

## CRITICAL RULES

1. **3-second hard max** — Any query taking longer is banned
2. **2-table max** — 3+ table joins timeout
3. **Always use `key64()`** — Direct slug comparison = 15s timeout
4. **Always LIMIT** — Max 100 for people, 50 for companies
5. **Single company for jobs** — UNION ALL = 14.6s timeout
6. **No skills** — All skill queries timeout
7. **No LATERAL** — LATERAL joins timeout

---

> **🚨 CRITICAL: ALWAYS SAVE QUERY RESULTS TO A FILE 🚨**
> Every query against this database is **billed per execution**. You **MUST** persist results immediately using `fs.writeFile("files/<name>.json", JSON.stringify(rows))`. Never return results without saving them — if the query needs to be re-run, the user is **double-charged**. Always `fs.writeFile()` in the same step as the query.

---

## Directory Structure

- **QUICK_REF.md** — **READ THIS FIRST.** Whitelist of allowed queries, routing table, mandatory rules.
- **tables/** — Schema documentation for all database tables
- **search_examples/** — SQL query patterns (check ALLOWED vs BANNED status)

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

// 🚨 ALWAYS save results immediately
await fs.writeFile("files/results.json", JSON.stringify(rows));
```

## Quick Start

1. Read `QUICK_REF.md` for the whitelist of allowed queries
2. Read the service spec: `services/person/linkedin/search` or `services/company/linkedin/search`
3. Find query patterns in `search_examples/` — check if pattern is ALLOWED or BANNED
4. If BANNED, use `services.web.search` instead

## Preferred: Wrapper Functions

For employee searches, use `services.company.getEmployeesFromLinkedin` instead of raw SQL:

```typescript
const result = await services.company.getEmployeesFromLinkedin({
   companySlug: "stripe",
   titleVariations: ["engineer"],
   limit: 50
});
```
