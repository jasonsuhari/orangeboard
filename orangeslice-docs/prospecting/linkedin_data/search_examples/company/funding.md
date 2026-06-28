---
name: funding
description: Query funding rounds and investors. 2-table joins only, under 3s.
---

# Company Funding Queries

> **The LinkedIn DB is a lookup tool, not a search engine.** Only 2-table funding joins are allowed (10-99ms). 3+ table joins are banned. **You MUST read `services/web/search` before using web search.**

---

## ALLOWED: Basic Funding (2-table) — 10-99ms

### Companies by Funding Round

```sql
SELECT lc.company_name, lc.website, lc.employee_count,
       f.round_amount, f.round_date,
       'https://www.linkedin.com/company/' || lc.universal_name AS lc_linkedin_url
FROM linkedin_company lc
JOIN linkedin_crunchbase_funding f ON f.linkedin_company_id = lc.id
WHERE lc.country_code = 'US'
  AND f.round_name = 'Series A'
LIMIT 50
```

### Recently Funded

```sql
SELECT lc.company_name, lc.website,
       f.round_name, f.round_date, f.round_amount,
       'https://www.linkedin.com/company/' || lc.universal_name AS lc_linkedin_url
FROM linkedin_company lc
JOIN linkedin_crunchbase_funding f ON f.linkedin_company_id = lc.id
WHERE lc.country_code = 'US'
  AND f.round_date >= '2024-01-01'
LIMIT 50
```

### By Investor

```sql
SELECT lc.company_name, lc.website,
       f.round_name, f.round_amount,
       'https://www.linkedin.com/company/' || lc.universal_name AS lc_linkedin_url
FROM linkedin_company lc
JOIN linkedin_crunchbase_funding f ON f.linkedin_company_id = lc.id
WHERE lc.country_code = 'US'
  AND 'Sequoia' = ANY(f.investor_names)
LIMIT 50
```

---

## ALLOWED: Deduplication with DISTINCT ON

Companies may have multiple funding entries. Get one row per company:

```sql
SELECT DISTINCT ON (lc.id)
  lc.company_name, lc.domain, lc.employee_count,
  f.round_name, f.round_amount, f.round_date,
  'https://www.linkedin.com/company/' || lc.universal_name AS lc_linkedin_url
FROM linkedin_company lc
JOIN linkedin_crunchbase_funding f ON f.linkedin_company_id = lc.id
WHERE f.round_name ILIKE '%series a%'
  AND f.round_date >= '2024-01-01'
ORDER BY lc.id, f.round_date DESC
LIMIT 50
```

---

## BANNED: 3+ Table Joins (Decision Makers at Funded Companies)

```sql
-- ❌ BANNED: 3-table join (1s+ timeout risk)
SELECT lp.first_name, lp.title, lc.company_name
FROM linkedin_profile lp
JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
JOIN linkedin_company lc ON lc.id = pos.linkedin_company_id
WHERE lc.id IN (SELECT cf.linkedin_company_id FROM linkedin_crunchbase_funding cf ...)
```

**Decompose instead:**

1. Query funded companies (2-table) → get company IDs
2. Query employees per company ID (2-table)

```typescript
// Step 1: Get funded company IDs
const { rows: companies } = await services.company.linkedin.search({
   sql: `SELECT DISTINCT f.linkedin_company_id AS id
         FROM linkedin_crunchbase_funding f
         JOIN linkedin_company lc ON lc.id = f.linkedin_company_id
         WHERE f.round_name = 'Series A' AND lc.country_code = 'US'
         LIMIT 20`
});

// Step 2: Get employees per company
for (const company of companies) {
   const { rows: employees } = await services.person.linkedin.search({
      sql: `SELECT lp.first_name, lp.headline, lp.public_profile_url
            FROM linkedin_profile lp
            JOIN linkedin_profile_position3 pos ON pos.linkedin_profile_id = lp.id
            WHERE pos.linkedin_company_id = ${company.id}
              AND pos.end_date IS NULL
              AND lp.location_country_code = 'US'
            LIMIT 20`
   });
}
```

---

## Funding Table Columns

| Column                       | Type   | Notes                                |
| ---------------------------- | ------ | ------------------------------------ |
| `round_name`                 | text   | 'Seed', 'Series A', 'Series B', etc. |
| `round_date`                 | date   | When funding was announced           |
| `round_amount`               | text   | Human-readable: "$10M"               |
| `parsed_round_amount_number` | bigint | In cents (divide by 100 for USD)     |
| `investor_names`             | text[] | Array of investor names              |

---

## Funding Stage Patterns

| Stage     | Pattern                        |
| --------- | ------------------------------ |
| Pre-seed  | `round_name ILIKE 'Pre-seed%'` |
| Seed      | `round_name ILIKE 'Seed%'`     |
| Series A  | `round_name ILIKE 'Series A%'` |
| Series B  | `round_name ILIKE 'Series B%'` |
| Series C+ | `round_name ILIKE 'Series C%'` |
