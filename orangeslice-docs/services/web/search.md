---
description: Google SERP search with dorking, time filters, and pagination
---

# web.search

Search Google for any query. Returns organic results, knowledge graph, and pagination info.

**Credits: 1 (standard)**

**SERP is cheap** — run many query permutations for better recall.

**When batching multiple queries, prefer `services.web.batchSearch` over `Promise.all(services.web.search(...))`.** It has lower orchestration overhead and better grouped execution behavior.

---

## Signature

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
```

---

## Search Operators

| Operator | Example                | Use Case                |
| -------- | ---------------------- | ----------------------- |
| `"..."`  | `"exact phrase"`       | Match exact text        |
| `OR`     | `"CEO" OR "Founder"`   | Match either term       |
| `-`      | `results -exclude`     | Exclude terms           |
| `site:`  | `site:linkedin.com/in` | Restrict to domain/path |

---

## Time Filters (`tbs` parameter)

| Value   | Description      |
| ------- | ---------------- |
| `qdr:h` | Past hour        |
| `qdr:d` | Past 24 hours    |
| `qdr:w` | Past week        |
| `qdr:m` | Past month       |
| `qdr:y` | Past year        |
| `li:1`  | Verbatim (exact) |

---

## Always Verify Results

Web search returns URLs based on keywords, **not confirmed matches**. Scrape the page to confirm identity before adding to sheet.

---

## Company Subpage Discovery Rule

To find pages on a company's own website, **never search Google by company name**. Always start from the verified domain and dork with `site:` plus `inurl:` hints.

```ts
await services.web.search({ query: "site:stripe.com inurl:team OR inurl:about OR inurl:careers" });
```

Never do this for subpage discovery:

```ts
await services.web.search({ query: '"Stripe" careers' });
```

---

## Parallel Query Permutations

Always run multiple query variations for better coverage.

If you are running more than one query, use `services.web.batchSearch`:

```ts
const queries = [
   '"John Smith" "Acme Corp" site:linkedin.com/in',
   '"John Smith" Acme site:linkedin.com/in',
   '"J. Smith" "Acme" site:linkedin.com/in',
   '"John Smith" CEO Acme site:linkedin.com/in'
];

const allResults = await services.web.batchSearch({
   queries: queries.map((query) => ({ query }))
});
const uniqueLinks = [...new Set(allResults.flatMap((r) => r.results.map((x) => x.link)))];
```

| Use Case       | Permutation Ideas                                                           |
| -------------- | --------------------------------------------------------------------------- |
| Person search  | Full name, initials, nicknames, with/without middle name                    |
| Company search | Prefer verified domain first; use name variants only for off-site discovery |
| Title search   | CEO/Founder/Chief, VP/Director, formal/informal titles                      |

---

## Google Dorking

Use `site:` and `inurl:` to target specific platforms and verified company domains.

| Platform           | Dork                        | Example                                      |
| ------------------ | --------------------------- | -------------------------------------------- |
| LinkedIn profiles  | `site:linkedin.com/in`      | `"Sarah Chen" "Stripe" site:linkedin.com/in` |
| LinkedIn companies | `site:linkedin.com/company` | `"YC W24" site:linkedin.com/company`         |
| Twitter/X          | `site:x.com inurl:status`   | `site:x.com inurl:status "Apollo" review`    |
| Reddit             | `site:reddit.com`           | `site:reddit.com/r/sales "cold email"`       |

```ts
// Find company subpages from a verified domain
const domain = "stripe.com";
const queries = [
   `site:${domain} inurl:team OR inurl:about OR inurl:leadership`,
   `site:${domain} inurl:careers OR inurl:jobs`,
   `site:${domain} inurl:blog OR inurl:news OR inurl:press`,
   `site:${domain} inurl:contact OR inurl:locations`
];

const results = await services.web.batchSearch({
   queries: queries.map((query) => ({ query }))
});
const subpages = [...new Set(results.flatMap((r) => r.results.map((x) => x.link)))];
```

---

## Pagination

```ts
const first = await services.web.search({ query, page: 1 });
const allResults = [...first.results];

if (first.pagination.totalPages > 1) {
   const pages = Array.from({ length: Math.min(first.pagination.totalPages - 1, 9) }, (_, i) => i + 2);
   const rest = await services.web.batchSearch({
      queries: pages.map((page) => ({ query, page }))
   });
   rest.forEach((p) => allResults.push(...p.results));
}
```

---

## Prospecting Pattern: Search → Scrape → Import

For curated lists, award pages, or directories:

```ts
// Step 1: Find list pages
const searchResults = await services.web.search({
   query: '"top 100 fintech startups 2024" list'
});

const listUrl = searchResults.results[0]?.link;
if (!listUrl) return { error: "No results found" };

// Step 2: Recon — discover page structure
const recon = await services.browser.execute({
   code: `
      await page.goto("${listUrl}", { waitUntil: 'domcontentloaded' });
      return await page._snapshotForAI();
   `
});

// Step 3: Extract with discovered selectors
const response = await services.browser.execute({
   code: `
      await page.goto("${listUrl}", { waitUntil: 'domcontentloaded' });
      return await page.evaluate(() => {
         return [...document.querySelectorAll('.company-card')].map(el => ({
            name: el.querySelector('h3')?.textContent?.trim(),
            website: el.querySelector('a')?.href
         }));
      });
   `
});

// Step 4: Add to sheet
const sheet = ctx.sheet("Companies");
await sheet.addRows(response.result, { create: true });
```

Use for: curated lists, directories, award pages, accelerator cohorts, portfolio pages.
