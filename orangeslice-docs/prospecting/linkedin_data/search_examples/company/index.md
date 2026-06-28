---
name: company
description: SQL patterns for company queries. Check ALLOWED vs BANNED before using any pattern.
---

# Company Search Examples

> **The LinkedIn DB is a lookup tool, not a search engine.** Only fast indexed queries are allowed (under 3 seconds, max 2-table joins). **You MUST read `services/web/search` before using web search.**

---

## File Status: ALLOWED vs BANNED

| File                      | Status                        | Tested Time |
| ------------------------- | ----------------------------- | ----------- |
| **lookups.md**            | ALLOWED                       | 3-11ms      |
| **funding.md**            | ALLOWED (2-table only)        | 10-99ms     |
| **jobs-at-company.md**    | ALLOWED (single company)      | 72-130ms    |
| **growth.md**             | ALLOWED (basic 12mo only)     | 15-298ms    |
| **description-search.md** | **BANNED**                    | 47ms-10.2s  |
| **jobs-by-role.md**       | **BANNED**                    | 407ms-28.7s |
| **anti-patterns.md**      | Reference for banned patterns | —           |

---

## Quick Decision Guide

| User Request                      | File                 | Status                      |
| --------------------------------- | -------------------- | --------------------------- |
| Find company by URL/domain/ID     | `lookups.md`         | ALLOWED                     |
| Companies with funding            | `funding.md`         | ALLOWED                     |
| Jobs at ONE known company         | `jobs-at-company.md` | ALLOWED                     |
| Fast-growing companies            | `growth.md`          | ALLOWED                     |
| Companies by keywords/description | —                    | **BANNED** (use web search) |
| Companies hiring [role]           | —                    | **BANNED** (use web search) |

---

## Web Search Alternatives

For any BANNED pattern, use web search:

```typescript
// Company by keywords
services.web.search({ query: 'site:linkedin.com/company "AI" "Austin"' });

// Companies hiring specific role
services.web.search({ query: 'site:linkedin.com/jobs "Account Executive" "San Francisco"' });
```

---

## Key Rules

1. **3-second hard max** — Any query taking longer is banned
2. **2-table max** — 3+ table joins timeout
3. **Always use `key64()`** — Direct slug comparison = 15s timeout
4. **Single company for jobs** — UNION ALL = 14.6s timeout
5. **No description ILIKE** — Use web search
6. **No LATERAL** — Use web search

---

## Quick Patterns (ALLOWED)

### Company by Slug — 4-8ms

```sql
SELECT * FROM linkedin_company_slug lcs
JOIN linkedin_company lc ON lc.id = lcs.linkedin_company_id
WHERE lcs.slug_key64 = key64('stripe')
LIMIT 1
```

### Company by Domain — 5ms

```sql
SELECT * FROM linkedin_company lc
WHERE lc.domain = 'stripe.com'
ORDER BY lc.employee_count DESC NULLS LAST
LIMIT 1
```

### Basic Funding — 10-99ms

```sql
SELECT lc.company_name, f.round_name, f.round_amount
FROM linkedin_company lc
JOIN linkedin_crunchbase_funding f ON f.linkedin_company_id = lc.id
WHERE f.round_name = 'Series A'
LIMIT 50
```
