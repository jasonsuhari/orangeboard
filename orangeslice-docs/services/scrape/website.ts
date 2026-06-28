/** Credits: 1 (standard). Charged only if Firecrawl returns a valid result. */

/**
 * ## 🛑 Extracting a List of Items?
 * 
**When to use each approach:**

| Use `browser.execute`            | Use `scrape.website`                   |
| -------------------------------- | -------------------------------------- |
| Templated pages (same structure) | Truly random/mixed domains             |
| Need specific elements           | Just need general content              |
| Scraping multiple pages          | One-off page you'll never revisit      |
| Want deterministic results       | Structure is too chaotic for selectors |

**For lists** (startups, companies, products, jobs, sponsors, catalogs, search results):

→ Use `services.browser.execute` with CSS selectors  
→ Read `services/browser/execute` for the workflow  
→ Browser + `querySelectorAll` is 10x faster and more reliable than AI extraction

 * 🚨 MANDATORY GATE — Before calling scrape.website, ANSWER THIS:
 *
 *    Are URLs templated? (same domain + path pattern like site.com/product/*)
 *    Are you scraping a list of items from a page? (e.g., product, people, companies, search results)
 *
 *    → YES to either? STOP. DO NOT USE THIS. Use browser.execute instead.
 *    → NO to both? (mixed domains, truly unknown structures) Proceed.
 *    → UNSURE? Inspect ONE page first with browser.execute to see the DOM.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ❌ WRONG — You just burned 50x the cost for no reason:
 *
 *    // Scraping 20 URLs from clutch.co/profile/*
 *    for (const url of urls) {
 *       const { markdown } = await services.scrape.website({ url });
 *       const data = await services.ai.generateObject({ prompt: markdown, schema });
 *    }
 *    // Cost: ~$1.00, Time: ~60 seconds, Results: inconsistent
 *
 * ✅ CORRECT — Templated pages = browser.execute:
 *
 *    // Inspect ONE page to find selectors (reconnaissance)
 *    const { result: snapshot } = await services.browser.execute({ code: `
 *       await page.goto(url, { waitUntil: 'domcontentloaded' });
 *       return await page._snapshotForAI();
 *    `});
 *    // Analyze snapshot to find selectors, then extract all pages with querySelectorAll
 *    for (const url of urls) {
 *       const { result } = await services.browser.execute({ code: `
 *          await page.goto(url, { waitUntil: 'domcontentloaded' });
 *          return await page.evaluate(() => [...document.querySelectorAll('.card')].map(e => ({...})));
 *       `});
 *    }
 *    // Cost: ~$0.02, Time: ~6 seconds, Results: deterministic
 *
 * ════════════════════════════════════════════════════════════════════════════
 * COST COMPARISON:
 *    browser.execute:      ~$0.001/page, 10x faster, deterministic
 *    scrape.website + AI:  ~$0.05/page,  slow,       AI variability
 *
 * "I don't know the DOM" is NOT an excuse. Look at ONE page first.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This function is ONLY for:
 * - Truly mixed domains with different structures
 * - One-off pages you'll never scrape again
 * - Extracting social URLs from unknown pages
 *
 * Generally avoid using simple keyword search in websites. AI is cheap and more accurate at fuzzy text search.
 */
type website = (params: {
   /** The url to scrape. must start with http or https */
   url: string;
   params?: {
      /** The number of pages to scrape */
      limit: number;
   };
}) => Promise<{
   /** Helper field to merge all the markdown of all pages scraped */
   markdown: string;
   /** The array of pages scraped from the website */
   data: Array<{
      markdown: string;
      links: string[];
   }>;
   socialUrls: {
      emailGeneral: string[];
      facebookProfile: string[];
      facebookProfileById: string[];
      instagramProfile: string[];
      twitterUser: string[];
      twitterStatus: string[];
      youtubeChannel: string[];
      youtubeUser: string[];
      youtubeVideo: string[];
      tiktokProfile: string[];
      tiktokVideo: string[];
   };
}>;
