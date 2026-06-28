---
name: person
description: SQL patterns for person queries. Check ALLOWED vs BANNED before using any pattern.
---

# Person Search Patterns

> **The LinkedIn DB is a lookup tool, not a search engine.** Only fast indexed queries are allowed (under 3 seconds, max 2-table joins). **You MUST read `services/web/search` before using web search.**

---

## File Status: ALLOWED vs BANNED

| File                   | Status                        | Tested Time   |
| ---------------------- | ----------------------------- | ------------- |
| **lookups.md**         | ALLOWED                       | 5-32ms        |
| **certifications.md**  | ALLOWED (certs only)          | 160-312ms     |
| **education.md**       | ALLOWED (education-only)      | 83-257ms      |
| **alumni.md**          | ALLOWED (no ORDER BY)         | 29-248ms      |
| **headline-search.md** | ALLOWED (6 common terms only) | 51-161ms      |
| **headline-search.md** | **BANNED** (rare terms)       | TIMEOUT       |
| **certifications.md**  | **BANNED** (skills)           | 566ms-TIMEOUT |
| **joins.md**           | **BANNED** (3+ tables)        | 556ms-17.7s   |
| **anti-patterns.md**   | Reference for banned patterns | —             |

---

## Quick Decision Guide

| User Request                      | File                 | Status                      |
| --------------------------------- | -------------------- | --------------------------- |
| Find person by LinkedIn URL       | `lookups.md`         | ALLOWED                     |
| Employees at known company        | `lookups.md`         | ALLOWED                     |
| People with certifications        | `certifications.md`  | ALLOWED                     |
| Graduates of school X             | `education.md`       | ALLOWED                     |
| Former employees                  | `alumni.md`          | ALLOWED (no ORDER BY)       |
| People with headline "engineer"   | `headline-search.md` | ALLOWED                     |
| People with headline "kubernetes" | —                    | **BANNED** (use web search) |
| People with Python skills         | —                    | **BANNED** (use web search) |
| People at funded companies        | —                    | **BANNED** (decompose)      |
| Ex-Google now at startup          | —                    | **BANNED** (two queries)    |

---

## Web Search Alternatives

For any BANNED pattern, use web search:

```typescript
// Rare headline terms
services.web.search({ query: 'site:linkedin.com/in "kubernetes engineer"' });

// Skills-based search
services.web.search({ query: 'site:linkedin.com/in "python" "machine learning"' });

// Complex alumni
services.web.search({ query: 'site:linkedin.com/in "former Google" "startup"' });
```

---

## Key Rules

1. **3-second hard max** — Any query taking longer is banned
2. **2-table max** — 3+ table joins timeout
3. **Always use `key64()`** — Direct slug comparison = 15s timeout
4. **6 headline terms only** — engineer, CEO, manager, sales, developer, founder
5. **No skills** — All skill queries are banned
6. **No ORDER BY on alumni** — Sort in application code

---

## PREFERRED: Use Service Function

For employee searches, use `services.company.getEmployeesFromLinkedin`:

```typescript
const result = await services.company.getEmployeesFromLinkedin({
   companySlug: "stripe",
   titleVariations: ["engineer"],
   limit: 50
});
```

---

## Quick Patterns (ALLOWED)

### Person by Slug — 5ms

```sql
SELECT lp.first_name, lp.headline, lp.public_profile_url
FROM linkedin_profile_slug slug
JOIN linkedin_profile lp ON lp.id = slug.linkedin_profile_id
WHERE slug.slug_key64 = key64('satyanadella')
```

### People at Company — 8-32ms

```sql
SELECT lp.first_name, lp.headline, pos.title, lp.public_profile_url
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
WHERE pos.linkedin_company_id = 2135371
  AND pos.end_date IS NULL
  AND lp.location_country_code = 'US'
LIMIT 100
```

### Common Headline — 51-161ms

```sql
SELECT lp.first_name, lp.headline, lp.public_profile_url
FROM linkedin_profile lp
WHERE lp.headline ILIKE '%engineer%'
  AND lp.location_country_code = 'US'
LIMIT 100
```
