---
name: google-serp-dorking
description: Advanced Google search operators and dorks for B2B prospecting and platform-specific searches
---

# Google Dorking Cheatsheet

Advanced search operators to find specific content across platforms.

**→ API Reference: [web.search](./services/web/search.md)**

---

## Core Operators

| Operator    | Example              | Effect             |
| ----------- | -------------------- | ------------------ |
| `"..."`     | `"exact phrase"`     | Match exact text   |
| `OR`        | `CEO OR Founder`     | Match either term  |
| `-`         | `startup -jobs`      | Exclude term       |
| `site:`     | `site:linkedin.com`  | Restrict to domain |
| `inurl:`    | `inurl:status`       | URL must contain   |
| `intitle:`  | `intitle:"series A"` | Title must contain |
| `filetype:` | `filetype:pdf`       | File extension     |

**Combine freely:** `"John Smith" site:linkedin.com/in -jobs`

---

## Platform Dorks

| Goal               | Dork                                                |
| ------------------ | --------------------------------------------------- |
| LinkedIn profiles  | `site:linkedin.com/in "query"`                      |
| LinkedIn companies | `site:linkedin.com/company "query"`                 |
| LinkedIn posts     | `site:linkedin.com/posts "query"`                   |
| Twitter/X posts    | `site:x.com inurl:status "query"`                   |
| Twitter/X profiles | `site:x.com -inurl:status "query"`                  |
| Reddit threads     | `site:reddit.com "query"`                           |
| Subreddit specific | `site:reddit.com/r/sales "query"`                   |
| GitHub repos       | `site:github.com "query"`                           |
| Crunchbase         | `site:crunchbase.com/organization "query"`          |
| News articles      | `site:techcrunch.com OR site:bloomberg.com "query"` |

---

## B2B Prospecting Dorks

```
# Find employees at company
"Stripe" site:linkedin.com/in

# Find leadership
"Acme Corp" CEO OR Founder OR "Co-founder" site:linkedin.com/in

# Find by title
"VP Sales" "Series A" site:linkedin.com/in

# Find company pages by criteria
"YC W24" site:linkedin.com/company
"Series B" fintech site:linkedin.com/company

# Find companies by product category
"AI CRM" OR "AI-powered CRM" site:linkedin.com/company
"sales intelligence" platform site:linkedin.com/company

# Find portfolio companies
site:a16z.com/portfolio
site:sequoiacap.com/companies

# Find job postings (hiring signals)
"hiring" "sales engineer" site:linkedin.com/jobs

# Find company tech stack from jobs
"Stripe" "Salesforce" OR "HubSpot" site:linkedin.com/jobs
```

---

## Fast but Requires Verification

**Dorking for people/companies is super fast and reliable** — you can pull 50-100 LinkedIn URLs in seconds by running parallel queries. But **it often returns false positives** because Google matches keywords loosely.

**Example: "AI CRM" companies**

````ts
// Step 1: Fast dork to get candidate URLs
const results = await services.web.search({
   query: '"AI CRM" OR "AI-powered CRM" site:linkedin.com/company'
});


```ts
type search = (params: {
   query: string;
   domain?: string; // Restrict results to this domain
   advance_search?: boolean; // Enable knowledge graph
   page?: number; // 1-indexed, default 1
   tbs?: string; // Time/filter param (see below)
}) => Promise<{
   results: Array<{
      title: string;
      link: string;
      displayed_link: string;
      snippet: string;
   }>;
   knowledgeGraph: { title; description; image; website; hours_links };
   pagination: { currentPage; totalPages; totalResults; hasNextPage };
}>;
````

const companyUrls = results.results.map((r) => r.link);

// Step 2: Add to sheet
await sheet.addRows(
companyUrls.map((url) => ({ linkedin_url: url })),
{ create: true }
);

// Step 3: ADD VERIFICATION COLUMNS — dorking alone isn't enough
// - Enrich via LinkedIn to get actual company description
// - Add AI column: "Is this actually an AI CRM? Check description."
// - Filter out false positives

````

**Why verification is required:**

- A company mentioning "we integrate with AI CRMs" will match but isn't an AI CRM
- Job posts saying "experience with AI CRM tools" will match unrelated companies
- Google indexes old/cached content that may be outdated

**Verification methods:**

1. **LinkedIn enrichment** — pull company/person data, let AI classify
2. **Scrape website** — check product page, about page for confirmation
3. **AI classification column** — "Based on [enriched data], does this match [criteria]?"

---

## Query Permutation Strategy

SERP is cheap. Run 10-30 variations in parallel:

| Dimension | Variations                                      |
| --------- | ----------------------------------------------- |
| Name      | Full name, initials, nicknames, maiden name     |
| Company   | Full name, abbreviation, domain, Inc/LLC        |
| Title     | CEO/Founder/Chief, VP/Director, formal/informal |
| Location  | City, metro area, state, "Bay Area"             |

```ts
const queries = [
   `"John Smith" "Acme" site:linkedin.com/in`,
   `"J. Smith" Acme site:linkedin.com/in`,
   `"John Smith" CEO site:linkedin.com/in`,
   `johnsmith acme.com site:linkedin.com/in`
];
const results = await services.web.batchSearch({
   queries: queries.map((q) => ({ query: q }))
});
````

---

## Time Filters

Add `tbs` parameter to restrict recency:

| Value   | Period     |
| ------- | ---------- |
| `qdr:d` | Past 24h   |
| `qdr:w` | Past week  |
| `qdr:m` | Past month |
| `qdr:y` | Past year  |

```ts
services.web.search({ query: "Stripe hiring", tbs: "qdr:m" });
```

---

## Pro Tips

1. **LinkedIn DB timeout?** SERP it: `"company name" site:linkedin.com/company`
2. **Always verify** — SERP returns keyword matches, not confirmed identities. Scrape to confirm.
3. **Nested loops OK** — Generate all permutations programmatically, run in parallel.
4. **Paginate** — First page often enough, but can fetch up to 10 pages per query.
