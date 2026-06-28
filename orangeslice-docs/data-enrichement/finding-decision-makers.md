---
name: finding-decision-makers
description: Find employees, owners, and decision makers at any company
---

# Finding Decision Makers

| Company Type                           | Approach                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------- |
| Large companies with LinkedIn presence | [getEmployeesFromLinkedin](../services/company/getEmployeesFromLinkedin.md) |
| Local businesses / small companies     | Website scraping (below)                                                    |

---

## LinkedIn (Large Companies)

```ts
const { employees } = await services.company.getEmployeesFromLinkedin({
   linkedinUrl: row.linkedinCompanyUrl,
   titleSqlFilter: `pos.title ~* '\\mCEO\\M|\\mCOO\\M|\\mCFO\\M|Chief|President|Founder|Owner|Director|\\mVP\\M|Vice President|Manager'`,
   limit: 25
});
```

---

## Website Scraping (Local Businesses)

For businesses without LinkedIn — scrape their team/about pages.

**Tools:** [web.search](../services/web/search.md), [scrape.website](../services/scrape/website.ts)

```ts
const domain = row.website.replace(/^https?:\/\//, "").replace(/\/$/, "");

// 1. Find team/about pages via site: search
const queries = [`site:${domain} team`, `site:${domain} about us`, `site:${domain} staff`, `site:${domain} owner`];

const results = await services.web.batchSearch({
   queries: queries.map((q) => ({ query: q }))
});
const pageUrls = [...new Set(results.flatMap((r) => r.results.map((x) => x.link)))]
   .filter((url) => url.includes(domain))
   .slice(0, 5);

// 2. Scrape pages
const scraped = await Promise.all(pageUrls.map((url) => services.scrape.website({ url })));

// 3. Extract people with AI
const { object } = await services.ai.generateObject({
   prompt: `Extract people (owners, founders, managers, staff):\n\n${scraped.map((s) => s.markdown).join("\n\n")}`,
   schema: z.object({
      people: z.array(
         z.object({
            name: z.string(),
            title: z.string().optional(),
            email: z.string().optional(),
            phone: z.string().optional()
         })
      )
   })
});

return object.people;
```
