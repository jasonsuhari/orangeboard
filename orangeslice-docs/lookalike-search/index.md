---
name: lookalike-search
description: Find companies and people similar to a user's best customers or seed list using Ocean.io. Mandatory read for any "find me companies like X" or "lookalike" request.
---

# Mode: Lookalike Search

**Goal:** Find companies and people that are similar to a user's existing customers, seed domains, or ideal customer profile — using Ocean.io's lookalike engine.

---

## When to Use Lookalike Search

Use Ocean.io lookalike search when the user:

- Has **example companies** (domains) and wants to find more like them
- Says "companies like", "similar to", "lookalike", "companies that look like my customers"
- Wants to **expand a seed list** of known-good accounts into a larger pipeline
- Needs **account-based prospecting** starting from a handful of reference accounts
- Wants to find the **right people** at companies matching a lookalike profile

**Not a good fit when:**

- User wants keyword/niche discovery ("AI CRM companies") → use `web.search`
- User wants funding-based filtering → use `crunchbase.search`
- User wants a specific company lookup → use LinkedIn B2B DB
- User only has descriptions, not example domains → use `web.search` or `crunchbase.search` first to build a seed list

---

## The Two Endpoints

### 1. `services.ocean.search.companies` — Find Lookalike Companies

Provide seed domains and filters, get back similar companies with rich firmographic data.

```ts
const results = await services.ocean.search.companies({
   companiesFilters: {
      lookalikeDomains: ["stripe.com", "brex.com", "ramp.com"],
      companySizes: ["51-200", "201-500"],
      countries: ["us"]
   },
   size: 50
});

// results.companies → array of { company, relevance }
// results.total → total matches
// results.searchAfter → cursor for next page
```

**Key filters:**

| Filter             | Example                        | Notes                                                        |
| ------------------ | ------------------------------ | ------------------------------------------------------------ |
| `lookalikeDomains` | `["stripe.com", "plaid.com"]`  | Core input — seed domains to find lookalikes for             |
| `companySizes`     | `["51-200", "201-500"]`        | Filter by employee count range                               |
| `countries`        | `["us", "gb", "de"]`           | Two-letter ISO country codes                                 |
| `industries`       | `["SaaS", "Fintech"]`          | Industry category names                                      |
| `ecommerce`        | `true`                         | E-commerce companies only                                    |
| `peopleFilters`    | `{ seniorities: ["C-Level"] }` | Top-level filter. Only return companies with matching people |

**Pagination:** Use `searchAfter` from the previous response for efficient cursor-based pagination. Max `size` per request is 100.

**Do not send these fields to `services.ocean.search.companies`:**

- `excludeDomains`
- `includeDomains`
- `from`
- `minScore`
- `technologyCategories`
- `revenueRanges`

Ocean v3 rejects each of those with `422`.

**Fields that are not safe as simple string arrays:** `technologies` and `keywords`.

When sent as string arrays, Ocean v3 returns `422` with `Input should be a valid dictionary or object to extract fields from`. Until we document the exact upstream shape, do not have the agent generate them.

### 2. `services.ocean.search.people` — Find People at Companies

Combine company filters with people filters to find the right contacts.

```ts
const results = await services.ocean.search.people({
   companiesFilters: {
      lookalikeDomains: ["stripe.com", "brex.com"]
   },
   peopleFilters: {
      seniorities: ["C-Level", "VP"],
      departments: ["Engineering", "Product"]
   },
   size: 50,
   enableEmailSearch: true
});

// results.people → array of OceanPersonResult
// Each person has: name, jobTitle, linkedinUrl, email, phone, company info
```

**People filters:**

| Filter               | Example                          | Notes                                            |
| -------------------- | -------------------------------- | ------------------------------------------------ |
| `seniorities`        | `["C-Level", "VP", "Director"]`  | Job seniority levels                             |
| `departments`        | `["Engineering", "Sales"]`       | Department targeting                             |
| `jobTitleKeywords`   | `["CTO", "Head of Engineering"]` | Title keyword matching                           |
| `countries`          | `["us"]`                         | People location filter                           |
| `lookalikePeopleIds` | `["id1", "id2"]`                 | Find people similar to these Ocean.io person IDs |

**Contact data:**

- Set `enableEmailSearch: true` to get verified email addresses
- Set `enablePhoneSearch: true` to get verified phone numbers
- Both cost additional Ocean.io credits

---

## Standard Workflow

### Company-first (most common)

1. **Collect seed domains** — from user input, an existing sheet column, or a prior prospecting step
2. **Search lookalike companies** — `services.ocean.search.companies` with seed domains + filters
3. **Add to sheet** — populate a "Companies" sheet with domain, name, size, industry, etc.
4. **Qualify** — add enrichment columns (LinkedIn enrich, tech stack, etc.) to score/filter
5. **Find people** — add a column using `services.ocean.search.people` or `services.company.getEmployeesFromLinkedin`

### People-direct (when you already know the company profile)

1. **Search people directly** — `services.ocean.search.people` with company + people filters
2. **Add to sheet** — populate with name, title, email, LinkedIn URL, company
3. **Qualify** — add verification/enrichment columns

---

## Pagination Pattern

Ocean.io returns up to `size` results per call (max 100). For larger result sets, paginate with `searchAfter`:

```ts
let allCompanies = [];
let searchAfter = undefined;

for (let page = 0; page < 5; page++) {
   const results = await services.ocean.search.companies({
      companiesFilters: { lookalikeDomains: ["stripe.com"] },
      size: 100,
      searchAfter
   });

   allCompanies.push(...results.companies);
   searchAfter = results.searchAfter;

   if (!searchAfter || allCompanies.length >= results.total) break;
}
```

---

## Tips

- **More seed domains = better results.** 3-5 seeds produce much better lookalikes than a single domain.
- **Combine with enrichment.** Ocean.io returns firmographic data, but you can enrich further with LinkedIn, BuiltWith, or PredictLeads.
- **Exclude seed domains client-side.** Ocean v3 rejects `excludeDomains`, so filter out seed domains after the response if needed.
- **Credits:** 5 credits per result. A search returning 50 companies = 250 credits. Reserve is based on the requested `size`.
