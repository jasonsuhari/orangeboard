---
name: prospecting
description: Strategies for searching or finding people and companies. This is a mantatory read before answering any user request regarding finding net new company / people.
---

# Mode: Prospecting

**Goal:** Find companies/people matching user's ICP.

---

## Two Ways to Prospect

### 1. Direct Query with Filters (Preferred)

Run queries with built-in filters when the criteria is searchable:

- **Web search (`services.web.search`)** — **Default for ALL prospecting**. Use for keywords, niche queries, fuzzy matching, anything descriptive. This includes finding LinkedIn profiles/companies via `site:linkedin.com` queries.
- **Crunchbase (`services.crunchbase.search`)** — **Default for funding data**. Use for funding-stage, round type, amount, date windows, and investor-backed company discovery.
- **Ocean.io (`services.ocean.search.*`)** — **Default for lookalike search**. When the user has example companies/domains and wants to find more like them. See [Lookalike Search Guide](../lookalike-search/).
- **Google Maps** — industry, location, ratings
- **LinkedIn job search** — job filters, titles
- **LinkedIn B2B DB** — **Almost never for prospecting.** Acceptable only for trivially simple single-indexed-column filters (e.g. `industry_code = 4 AND country_code = 'US'`), looking up entities you already have an identifier for, or listing employees at a single known company. Any query involving keywords, descriptions, names, skills, or multi-criteria matching = web search. See [QUICK_REF](./linkedin_data/QUICK_REF.md).

**Use this when possible.** It's fast and returns pre-filtered results.

### 2. Qualification Columns (When Filters Don't Exist)

Some criteria can't be searched directly:

- "Did this company recently switch software providers?"
- "Are they actively hiring for this role?"
- "Do they use [specific tool]?"

**For these:** Pull a broad list → add columns that answer the question → user filters.

---

## Company-First Prospecting (Recommended for B2B)

Often the best approach is to **find companies first, then find people** at those companies:

1. **Build a companies sheet** — Find companies matching your ICP (industry, size, tech stack, etc.)
2. **Qualify companies** — Add enrichment/verification columns to filter to best-fit companies
3. **Find people at qualified companies** — Search for decision-makers at each company
4. **Push to a new sheet** — Create a separate people sheet linked to the companies

**Why this works better:**

- Company data is often more reliable/searchable than people data
- You can qualify at the company level before spending credits on people
- Avoids pulling people from irrelevant companies
- Creates a clean funnel: Companies → Qualified Companies → People

````

**When to use company-first:**

- B2B sales where company fit matters
- Account-based approaches
- When you want to research companies before reaching out to people
- in this case if you want to find people you should find them by creating a column to fetch them, DO NOT do this in your code sandbox

**When to search people directly:**

- Role-based targeting (all "AI Engineers" regardless of company)
- Personal brand/content-based targeting
- Consumer or SMB where company size doesn't matter

---

## Circle & Star Framework

When using qualification columns, think Circle & Star:

- **Circle (⭕)** = Broad, queryable pool (industry, size, location)
- **Star (⭐)** = Specific criteria you can't query directly

**Golden rule:** Circle large enough to contain all stars, but no larger.

---

## Data Sources: When to Use Each

| Source                   | Use When                                                    | Limitations                                              |
| ------------------------ | ----------------------------------------------------------- | -------------------------------------------------------- |
| **Web Search (Default)** | **ALL prospecting/discovery** — keywords, niche, fuzzy, specific, LinkedIn profiles & companies via `site:linkedin.com` | Requires verification columns for false positives.       |
| **Crunchbase (Funding Default)** | Funding-focused prospecting: stage, round type, amount, recency, investors | Best for funding intelligence; use other sources for non-funding discovery criteria. |
| **Ocean.io (Lookalike Default)** | User has seed domains and wants similar companies/people. "Find companies like X." | Needs seed domains as input. Not for keyword/niche discovery from scratch. See [guide](../lookalike-search/). |
| **PredictLeads**         | Company intelligence, buying signals, and structured company events at scale | Coverage varies by company/market. Treat it as a prospecting/enrichment signal, not source-of-truth validation for whether a known company currently has an opening. |
| **Niche Directory Scrape** | Well-defined categories with existing lists (see below)   | Requires finding the right directory first.              |
| **LinkedIn B2B DB**      | **Almost never for prospecting.** Only for: (1) lookups by known identifier (URL/domain/ID), (2) employees at a single known company, (3) trivially simple single-indexed-column filters like `industry_code` or `country_code`. | **Any query with keywords, descriptions, names, ILIKE, skills, or multi-criteria = web search.** The bar is extremely high — if in doubt, use web search. |
| **Google Maps**          | Local/SMB, physical locations, restaurants, retail          | Limited to businesses with physical presence.            |
| **Apify Actors**         | Platform-specific scraping (Instagram, TikTok, job boards)  | Per-platform setup. May break with platform changes.     |

### PredictLeads: When It Is Better Than Everything Else

Use PredictLeads first when the user needs **high-quality structured company data** and not just URLs.

PredictLeads is usually the best choice for:
- Tracking **company signals over time** (news, financing, hiring, tech detections, product changes, website evolution)
- Pulling **normalized lists** (job openings, technologies, investors/connections, similar companies) for prospecting/enrichment without custom scraping
- Building qualification columns where consistency matters more than recall
- Workflows that need stable structured fields instead of parsing search snippets

Prefer other sources when:
- You need **brand-new niche discovery** with fuzzy intent matching -> use `web.search`
- You need local storefront/SMB discovery -> use Google Maps
- You need to look up a specific company/person by known URL/domain/ID -> use LinkedIn B2B DB (lookup only, NOT discovery)

### Funding Prospecting Standard: Use Crunchbase First

For any request centered on funding data (for example: "Series A fintech companies", "companies that raised in the last 12 months", "recently funded startups"), use `services.crunchbase.search` as the **standard/default source**.

**Never use LinkedIn B2B DB for funding discovery.** Crunchbase is always the right choice for finding funded companies. LinkedIn B2B DB funding tables should only be used when you already have a specific company ID and need to check its funding history.

### Niche Directory Scraping — For Well-Defined Categories

When users ask for companies in a **specific, well-defined niche** (e.g., "fast food chains", "Fortune 500 companies", "Y Combinator startups"), the best approach is often to **find and scrape a curated directory or list**.

**When to use directory scraping:**

- User asks for a comprehensive list of companies in a known category
- The category has well-known directories, Wikipedia lists, or industry databases
- You need a complete/authoritative list rather than search results

**Examples:**

| User Request                    | Best Source                                                              |
| ------------------------------- | ------------------------------------------------------------------------ |
| "Fast food chains"              | `https://en.wikipedia.org/wiki/List_of_fast_food_restaurant_chains`      |
| "Fortune 500 companies"         | Fortune's official list or Wikipedia                                     |
| "Y Combinator companies"        | YC's company directory                                                   |
| "Unicorn startups"              | CB Insights unicorn list                                                 |
| "Law firms in AmLaw 100"        | AmLaw's official ranking                                                 |

**How to scrape:** Use [`browser.execute`](../services/browser/execute.md) to extract data from the directory.


**Tip:** First use web search to find the best directory for the niche, then scrape it.

---

## 🚨 Critical: Web Search vs B2B Database

### Web Search (`services.web.search`) — DEFAULT CHOICE FOR PROSPECTING

**Use web search for almost all prospecting and discovery. The LinkedIn B2B DB should almost never be your first choice.**

> **🚫 STOP: Are you about to query the LinkedIn B2B DB to find new leads?**
> Unless your query is a **trivially simple single-indexed-column filter** (e.g. `industry_code = 4 AND country_code = 'US'`), **use web search instead**. The moment your query involves keywords, descriptions, company names, headlines, skills, ILIKE, or any multi-criteria matching — it's a web search query, not a DB query.

Web search handles:
- Keywords, product names, technologies ("AI CRM", "Salesforce", "React")
- Niche/specific queries ("climate tech founders", "Series A fintech")
- Fuzzy matching (anything that's hard to express as exact filters)
- Any descriptive criteria (company descriptions, headlines, bios)
- Small-to-medium result sets (10-500 results)
- **Most volume requests** — batched web searches are often better than DB queries even for high volume

```
site:linkedin.com/company "AI CRM"
site:linkedin.com/in "VP Sales" "fintech"
```

Web search is fast, cheap, and works for almost everything. **When in doubt, use web search.**

### LinkedIn B2B Database — LAST RESORT FOR PROSPECTING

> **🚫 The LinkedIn DB is almost never the right tool for prospecting.** It is primarily an enrichment/lookup tool for entities you ALREADY know about. The only prospecting exception is **trivially simple queries on single indexed columns** (e.g. `industry_code`, `country_code`, `company_size_code`, `employee_count`).

> **🚨 CRITICAL: ALWAYS SAVE LINKEDIN DB RESULTS TO A FILE 🚨**
> LinkedIn B2B database queries are **billed per execution**. You **MUST** persist query results immediately using `fs.writeFile("files/<name>.json", JSON.stringify(rows))`. If you return results without saving them, the query must be re-run — **double-charging the user**. Never discard, summarize-only, or preview LinkedIn DB results without also writing them to a file in the same step.

**Acceptable uses of LinkedIn B2B DB:**
- Look up a specific company by its domain, slug, or ID (you already have the identifier)
- List employees at a single company you already identified (you have the company_id)
- Check funding history for a specific company you already identified
- **Trivially simple prospecting** on a single indexed column: e.g. `WHERE industry_code = 4 AND country_code = 'US' LIMIT 50` — no keywords, no ILIKE, no descriptions, no names

**The test: can your query be expressed with ONLY indexed equality/range filters on 1-2 columns?** If yes, LinkedIn DB is OK. If you need keywords, descriptions, ILIKE on names, skills, fuzzy matching, or anything semantic — **use web search**.

**❌ BANNED for prospecting (use web search):**
- ❌ Any query with keywords or descriptions ("AI CRM", "fintech", "climate tech")
- ❌ Any query with ILIKE on names, headlines, or titles
- ❌ Any query requiring skills matching
- ❌ Any query with 3+ table joins
- ❌ Any query where you're "searching" rather than "filtering by a code"
- ❌ "Find Series A startups" → Crunchbase
- ❌ "Find VPs at fintech companies" → web search

**✅ ALLOWED for prospecting (trivially simple):**
- "US software companies" → `WHERE industry_code = 4 AND country_code = 'US'`
- "Companies with 100-500 employees in California" → `WHERE employee_count BETWEEN 100 AND 500 AND region = 'California'`

**✅ ALLOWED (enrichment/lookup of known entities):**
- "Get details on Stripe" (you have the domain `stripe.com`) → LinkedIn DB lookup
- "List engineers at Stripe" (you have company_id `2135371`) → LinkedIn DB employees query
- "What's this person's headline?" (you have their LinkedIn slug) → LinkedIn DB lookup

**❌ BANNED (discovery) — use web search:**
- "AI CRM companies" → `services.web.search("site:linkedin.com/company AI CRM")`
- "Kubernetes engineers" → `services.web.search("site:linkedin.com/in kubernetes engineer")`
- "VPs who worked at Google" → `services.web.search("site:linkedin.com/in VP Google")`
- "Companies hiring Account Executives" → `services.web.search("site:linkedin.com/jobs Account Executive")`
- "1000 software engineers in Bay Area" → batched `services.web.search` queries
- "Healthcare companies that do X" → `services.web.search("site:linkedin.com/company healthcare X")`

## Fast but Requires Verification

**Web search for people/companies is super fast and reliable** — you can pull 50-100 LinkedIn URLs in seconds by running parallel queries. But **it often returns false positives** because Google matches keywords loosely.

**Example: "AI CRM" companies**

```ts
// Step 1: Fast web search to get candidate URLs
const results = await services.web.search({
   query: '"AI CRM" OR "AI-powered CRM" site:linkedin.com/company'
});
const companyUrls = results.results.map((r) => r.link);

// Step 2: Add to sheet
await sheet.addRows(
   companyUrls.map((url) => ({ linkedin_url: url })),
   { create: true }
);

🚨 WEB SEARCH REQUIRES VERIFICATION 🚨
When using web search to find companies or people, you MUST add:
1. An enrichment column (LinkedIn enrich or scrape)
2. SPECIFICALLY AI verification columns (AI check: "Does this actually match the criteria?")
3. You must use AI for verification
NEVER deliver web search results without verification columns. Web search produces false positives.

````

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

## Sort Prospects by Fit

After prospecting, sort the sheet so the best-fit prospects are at the top. Use `SET FILTERS` to apply a sort immediately:

```ts
await ctx.sql(`SET FILTERS ON "Companies" ORDER BY "Score" DESC`);
```

**Sort > filter.** Sorting keeps all rows visible so the user can see how many prospects were disqualified — this makes the work visible. Filtering hides rows and makes it look like nothing happened.

Boolean columns work too — `true` sorts after `false` with DESC: `ORDER BY "Qualified" DESC, "In ICP" DESC NULLS LAST`

Optionally create a saved view if the user would benefit from toggling between perspectives:

```ts
await ctx.sql(`CREATE VIEW "Best First" ON "Companies" AS SELECT * FROM "Companies" ORDER BY "Score" DESC`);
```

## Examples

| User Request                                     | Approach         | Why                                                                                                     |
| ------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------- |
| "AI CRM companies"                               | Web search       | Keyword query → `"AI CRM" site:linkedin.com/company`                                                    |
| "Fintech startups"                               | Web search       | Fuzzy/descriptive → `"fintech" "startup" site:linkedin.com/company`                                     |
| "SDRs at Series A companies"                     | Web search       | Specific criteria → `"SDR" "Series A" site:linkedin.com/in`                                             |
| "Series A/B companies raised last year"          | Crunchbase       | Funding-specific discovery is best handled via `services.crunchbase.search`                             |
| "Companies using Kubernetes"                     | Web search       | Technology match → `"Kubernetes" site:linkedin.com/company`                                             |
| "VPs who worked at Google"                       | Web search       | Fuzzy history match → `"VP" "Google" site:linkedin.com/in`                                              |
| "Companies like Stripe and Brex"                 | Ocean.io         | Lookalike search with seed domains → `ocean.search.companies`                                           |
| "Find VPs at companies similar to our customers" | Ocean.io         | Lookalike companies + people filters → `ocean.search.people`                                            |
| "1000 software engineers in Bay Area"            | Web search       | Batched `site:linkedin.com/in "software engineer" "Bay Area"` queries                                   |
| "US software companies with 100-500 people"      | B2B DB           | Trivially simple: `industry_code = 4 AND employee_count BETWEEN 100 AND 500` — no keywords/ILIKE needed |
| "Healthcare companies that use AI"               | Web search       | Has keywords ("AI") → `site:linkedin.com/company "healthcare" "AI"` + enrich                            |
| "Fast food chains that..."                       | Directory scrape | Scrape Wikipedia list → `browser.execute`                                                               |
| "Restaurants in Austin"                          | Google Maps      | Local/SMB with physical presence                                                                        |
| "Companies hiring SDRs"                          | LinkedIn Jobs    | Job search with title filter                                                                            |
| "Warehouses implementing WMS"                    | Circle + columns | Pull logistics companies → add "WMS Score" column                                                       |
| "Companies that recently switched CRMs"          | Circle + columns | Pull SaaS companies → add "CRM Change Signals" column                                                   |

---

## Tools

- **LinkedIn DB (LOOKUP + trivially simple filters ONLY):** `services.company.linkedin.search(...)`, `services.person.linkedin.search(...)` — **Primarily for enrichment/lookup. Only use for prospecting when the query is a trivially simple indexed-column filter (e.g. industry_code, country_code). Any keywords, ILIKE, descriptions, names, skills = web search.**
- **Funding:** `services.crunchbase.search({ sql: "SELECT ... FROM ... WHERE ..." })` — **Default for funding search and screening.**
- **Lookalike:** `services.ocean.search.companies`, `services.ocean.search.people` — **Default for "find companies like X".** See [Lookalike Search Guide](../lookalike-search/).
- **Local/SMB:** `googleMaps.scrape`
- **Web:** `web.search` + `browser.execute`
- **Platforms:** `services.apify.runActor`

Refuse unreasonable volume requests (1k+ rows at once). Slow iteration is fine.
