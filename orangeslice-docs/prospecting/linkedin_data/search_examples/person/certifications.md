---
name: certifications
description: Certifications allowed (160-312ms). ALL skills queries are banned.
---

# Certifications

> **The LinkedIn DB is a lookup tool, not a search engine.** Certifications are allowed (160-312ms). ALL skills queries are banned — they timeout. **You MUST read `services/web/search` before using web search.**

---

## ALLOWED: Certification Queries — 160-312ms

```sql
SELECT lp.first_name, lp.last_name, lp.headline,
       cert.title AS cert_title, cert.company_name,
       lp.public_profile_url AS lp_linkedin_url
FROM linkedin_profile lp
JOIN linkedin_profile_certification cert ON cert.linkedin_profile_id = lp.id
WHERE lp.location_country_code = 'US'
  AND cert.title ILIKE '%AWS%'
LIMIT 100
```

### Cloud Certifications

| Provider | Filter Pattern                                                                |
| -------- | ----------------------------------------------------------------------------- |
| AWS      | `cert.title ILIKE '%AWS%' OR cert.company_name ILIKE '%Amazon Web Services%'` |
| GCP      | `cert.title ILIKE '%Google Cloud%' OR cert.title ILIKE '%GCP%'`               |
| Azure    | `cert.title ILIKE '%Azure%' OR cert.title ILIKE '%Microsoft Certified%'`      |

### Security Certifications

```sql
WHERE cert.title ~* '(CISSP|CISM|CEH|Security\\+|CompTIA Security)'
```

---

## BANNED: ALL Skills Queries — 566ms to TIMEOUT

```sql
-- ❌ BANNED: Python (566ms - too slow)
WHERE 'Python' = ANY(lp.skills)

-- ❌ BANNED: Python + ML (4.6s)
WHERE 'Python' = ANY(lp.skills) AND 'Machine Learning' = ANY(lp.skills)

-- ❌ BANNED: React, Kubernetes, TypeScript (TIMEOUT)
WHERE 'React' = ANY(lp.skills)
WHERE 'Kubernetes' = ANY(lp.skills)
WHERE 'TypeScript' = ANY(lp.skills)
```

**Use web search instead:**

```typescript
const results = await services.web.search({
   query: 'site:linkedin.com/in "python" "machine learning" engineer'
});
```

---

## BANNED: Skills + Certifications Combined

```sql
-- ❌ BANNED: Array scan + join too expensive
WHERE 'Python' = ANY(lp.skills)
  AND cert.title ILIKE '%AWS%'
```

---

## BANNED: Skills + Company Constraint

```sql
-- ❌ BANNED: Even with denormalized tables
SELECT lkd.first_name, lkd.headline
FROM lkd_profile lkd
WHERE 'Python' = ANY(lkd.skills)
  AND lkd.linkedin_company_id = 2135371
```

---

## Certification Table Columns

| Column            | Type | Example                   |
| ----------------- | ---- | ------------------------- |
| `title`           | text | "AWS Solutions Architect" |
| `company_name`    | text | "Amazon Web Services"     |
| `issue_date`      | date | When issued               |
| `expiration_date` | date | NULL if no expiration     |

---

## Summary

| Query Type              | Status  | Time          |
| ----------------------- | ------- | ------------- |
| Certifications          | ALLOWED | 160-312ms     |
| Skills (any)            | BANNED  | 566ms-TIMEOUT |
| Skills + certifications | BANNED  | TIMEOUT       |
| Skills + company        | BANNED  | TIMEOUT       |

**For skills-based searches, use web search:**

```typescript
services.web.search({ query: 'site:linkedin.com/in "[skill]" "[role]"' });
```
