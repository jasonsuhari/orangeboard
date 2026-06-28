---
name: search_examples
description: SQL query patterns for LinkedIn B2B database — WHITELIST ONLY. Check ALLOWED vs BANNED before using any pattern.
---

# Search Examples

> **The LinkedIn DB is a lookup tool, not a search engine.** Only fast indexed queries are allowed (under 3 seconds, max 2-table joins). Everything else falls back to `services.web.search` with `site:linkedin.com` patterns. **You MUST read `services/web/search` before using web search.**

---

## ALLOWED Patterns (Under 3s)

| Pattern                    | File                         | Tested Time |
| -------------------------- | ---------------------------- | ----------- |
| Company by key64 slug      | `company/lookups.md`         | 4-8ms       |
| Company by domain          | `company/lookups.md`         | 5ms         |
| Company by ID              | `company/lookups.md`         | 3ms         |
| Basic funding (2-table)    | `company/funding.md`         | 10-99ms     |
| Jobs at ONE company        | `company/jobs-at-company.md` | 72-130ms    |
| Basic growth               | `company/growth.md`          | 15-298ms    |
| Person by key64 slug       | `person/lookups.md`          | 5ms         |
| People at company          | `person/lookups.md`          | 8-32ms      |
| Certifications (2-table)   | `person/certifications.md`   | 160-312ms   |
| Education-only             | `person/education.md`        | 83-257ms    |
| Basic alumni (no ORDER BY) | `person/alumni.md`           | 29-248ms    |
| Headline (common terms)    | `person/headline-search.md`  | 51-161ms    |

## BANNED Patterns (Use Web Search)

| Pattern                | File                            | Why Banned    | Web Search Alternative                 |
| ---------------------- | ------------------------------- | ------------- | -------------------------------------- |
| Description ILIKE      | `company/description-search.md` | 47ms-10.2s    | `site:linkedin.com/company [keywords]` |
| Jobs by role (LATERAL) | `company/jobs-by-role.md`       | 407ms-28.7s   | `site:linkedin.com/jobs [role]`        |
| company_name ILIKE     | `company/anti-patterns.md`      | 813ms-11.7s   | Use domain lookup                      |
| UNION ALL              | `company/anti-patterns.md`      | 14.6s         | Loop per company                       |
| 3+ table joins         | `person/joins.md`               | 556ms-17.7s   | Decompose                              |
| Headline (rare terms)  | `person/headline-search.md`     | TIMEOUT       | `site:linkedin.com/in [keywords]`      |
| Skills queries         | `person/certifications.md`      | 566ms-TIMEOUT | `site:linkedin.com/in [skill]`         |
| Education + company    | `person/education.md`           | 3s-TIMEOUT    | Education-only                         |
| Complex alumni         | `person/alumni.md`              | TIMEOUT       | Two queries                            |
| ORDER BY on alumni     | `person/alumni.md`              | TIMEOUT       | Skip ORDER BY                          |

---

## Directory Structure

- **company/** — Company lookups, funding, jobs at ONE company, growth
- **person/** — Person lookups, headline (common terms), certifications, education, alumni

---

## Usage Pattern

> **🚨 CRITICAL: ALWAYS SAVE QUERY RESULTS TO A FILE 🚨**
> LinkedIn B2B database queries are **billed per execution**. You **MUST** persist results immediately using `fs.writeFile()`. Never return, preview, or summarize results without also saving them to a file.

```typescript
const { rows } = await services.person.linkedin.search({
   sql: "SELECT ... FROM ... WHERE ... LIMIT 100"
});
// 🚨 IMMEDIATELY save results
await fs.writeFile("files/linkedin_people.json", JSON.stringify(rows));
```

---

## Web Search Fallback

> **🚨 Before using `services.web.search`, you MUST read `services/web/search` for the full API, parameters, and usage patterns.**

For ANY banned pattern, use web search + enrich:

```typescript
// Step 1: Web search
const results = await services.web.search({
   query: 'site:linkedin.com/in "kubernetes engineer" "San Francisco"'
});

// Step 2: Extract URLs
const urls = results.results.map((r) => r.link);

// Step 3: Enrich each URL
for (const url of urls) {
   const enriched = await services.person.linkedin.enrich({ url });
}
```

---

## Key Rules

1. **3-second hard max** — Any query taking longer is banned
2. **2-table max** — 3+ table joins timeout
3. **Always use `key64()`** — Direct slug comparison = 15s timeout
4. **Always LIMIT** — Max 100 for people, 50 for companies
5. **Check ALLOWED vs BANNED** before using any pattern

See `../QUICK_REF.md` for complete methodology.
