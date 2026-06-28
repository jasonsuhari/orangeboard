---
description: Batch Google SERP queries in one call
---

# web.batchSearch

Run many Google queries in one service call. Use this whenever you would otherwise do `Promise.all` over `services.web.search`.

**Credits: 1 per query with results**

**Preferred batching primitive:** If you have 2+ queries, use `web.batchSearch`.

---

## Signature

```ts
type batchSearch = (params: {
   queries: Array<{
      query: string;
      domain?: string; // Restrict this query to a domain
      page?: number; // 1-indexed, default 1
      tbs?: string; // Time/filter param
      linkRegexPattern?: string; // Optional link filter regex
   }>;
   timeout?: string; // Optional duration, e.g. "2m"
}) => Promise<
   Array<{
      results: Array<{
         title: string;
         link: string;
         displayed_link: string;
         snippet?: string;
         snippet_highlighted_words?: string[];
         rich_snippet?: any;
         source?: string;
      }>;
      knowledgeGraph?: {
         title?: string;
         type?: string;
         website?: string | null;
         imageUrl?: string;
         description?: string;
         descriptionSource?: string;
         descriptionLink?: string;
         attributes?: Record<string, string>;
      };
      pagination: {
         currentPage: number;
         totalPages: number;
         totalResults: number;
         resultsPerPage: number;
         hasNextPage: boolean;
      };
   }>
>;
```

---

## When To Use

- Query permutations for person/company discovery
- Running role/title variants (`CEO`, `Founder`, `Head of Growth`, etc.)
- Multi-domain scans where each query differs
- Any time you are about to call `services.web.search` in a loop

---

## Example

```ts
const queries = [
   { query: '"John Smith" "Acme" site:linkedin.com/in' },
   { query: '"J. Smith" "Acme" site:linkedin.com/in' },
   { query: '"John Smith" CEO Acme site:linkedin.com/in' },
   { query: '"John Smith" founder Acme site:linkedin.com/in', tbs: "qdr:y" }
];

const batches = await services.web.batchSearch({ queries });
const links = [...new Set(batches.flatMap((r) => r.results.map((x) => x.link)))];
```

---

## Notes

- Input order is preserved in output order.
- Each item returns the same shape as `services.web.search`.
- For a single query, `services.web.search` is still fine.
