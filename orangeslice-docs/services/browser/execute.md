---
description: Cloud Playwright browser automation for scraping and testing
---

# browser.execute

Execute Playwright code with `page` in scope. Browser is automatically acquired from a pre-warmed pool and released when done.

**Credits: 1 (standard)**

## 🚨 USE THIS for templated pages — NOT scrape.website

| Method              | Cost         | Speed      | Results       |
| ------------------- | ------------ | ---------- | ------------- |
| **browser.execute** | ~$0.001/page | 10x faster | Deterministic |
| scrape.website + AI | ~$0.05/page  | Slow       | Inconsistent  |

**Templated pages** = same domain + path pattern (e.g., `site.com/product/*`)
→ These have IDENTICAL DOM structure → Use `querySelectorAll`, not AI

### Don't know the selectors? LOOK AT ONE PAGE FIRST.

```ts
// STEP 1: Reconnaissance — inspect one page to find selectors
const reconResponse = await services.browser.execute({
   code: `
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return await page._snapshotForAI();
   `
});
// reconResponse = { success: true, result: "..." } or { success: false, error: "..." }
// Analyze the snapshot → find selectors → NOW you can extract

// STEP 2: Extract all pages with discovered selectors
for (const url of urls) {
   const response = await services.browser.execute({
      code: `
         await page.goto(url, { waitUntil: 'domcontentloaded' });
         return await page.evaluate(() => {
            return [...document.querySelectorAll('.discovered-selector')].map(e => ({
               name: e.querySelector('h2')?.textContent?.trim(),
               // ... other fields
            }));
         });
      `
   });
   // response.success tells you if it worked, response.error has details if not
}
```

**"I don't know the DOM" is NOT an excuse to use AI. Reconnaissance first, then extract.**

```ts
type execute = (params: {
   code: string;
   timeout_sec?: number; // default 60
}) => Promise<{ success: boolean; result?: any; error?: string }>;
```

> ⚠️ **Hard limit: 3 minutes.** The Inngest function times out at 3 minutes regardless of `timeout_sec`. Plan multi-page scrapes accordingly.

## 💡 Page Snapshots

Use `await page._snapshotForAI()` in return statements to get a comprehensive snapshot of the page state for analysis:

```ts
const response = await services.browser.execute({
   code: `
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return await page._snapshotForAI();
   `
});
// response.result contains the page snapshot for structure analysis
```

## ⚠️ Don't Destructure Only `result`

The response can be an error — always keep the full response so you can see `success` and `error`:

```ts
// ❌ BAD — ignores errors, you won't see timeouts/failures
const { result } = await services.browser.execute({ code: `...` });

// ✅ GOOD — full response shows success/error
const response = await services.browser.execute({ code: `...` });
// response = { success: true, result: {...} }
// response = { success: false, error: "page.goto: Timeout 30000ms exceeded..." }
```

---

## Workflow: Analyze → Extract → Debug

### 1. Analyze Structure First (REQUIRED)

Never guess selectors. Discover them:

```ts
const response = await services.browser.execute({
   code: `
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // Find repeating patterns
      const patterns = await page.evaluate(() => {
         return ['article','[class*="card"]','[class*="item"]','[class*="result"]','li','tr']
            .map(sel => ({ sel, count: document.querySelectorAll(sel).length }))
            .filter(p => p.count >= 3);
      });
      
      const snapshot = await page._snapshotForAI();
      return { patterns, snapshot };
   `
});
// response.success = true/false, response.result = { patterns, snapshot }, response.error = "..."
// Analyze snapshot + patterns to find: item selector, field selectors, pagination
```

### 2. Extract Structured Data

Return objects, not HTML:

```ts
const response = await services.browser.execute({
   code: `
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return await page.evaluate(() => {
         return [...document.querySelectorAll('.discovered-selector')].map(el => ({
            title: el.querySelector('h2')?.textContent?.trim(),
            url: el.querySelector('a')?.href
         }));
      });
   `
});
// response.result = [{ title, url }, ...]
```

### 3. Debug Failures

If extraction returns empty:

```ts
const response = await services.browser.execute({
   code: `
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      return await page.evaluate(() => ({
         count: document.querySelectorAll('.selector').length,
         text: document.body.innerText.slice(0, 2000)
      }));
   `
});
// response.result = { count, text }
```

---

## Approaches (Pick One)

**A) Selectors** — Default for consistent HTML structure

```ts
return await page.evaluate(() => {
   return [...document.querySelectorAll(".item")].map((e) => ({
      title: e.querySelector("h2")?.textContent
   }));
});
```

**B) API Interception** — 10-100x faster, check FIRST for paginated/infinite scroll

```ts
const reqs = [];
page.on("response", async (r) => {
   if (r.url().includes("/api/")) reqs.push({ url: r.url(), body: await r.text().catch(() => null) });
});
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); // trigger load
await page.waitForTimeout(2000);
return reqs; // Found API? Call directly with fetch instead
```

**C) AI Fallback** — Last resort after 2-3 selector attempts

```ts
const text = await page.evaluate(() => document.body.innerText);
// Pass to services.ai.generateObject with schema
```

---

## Lazy Loading

```ts
let prevH = 0;
for (let i = 0; i < 5; i++) {
   await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
   await page.waitForTimeout(1000);
   const h = await page.evaluate(() => document.body.scrollHeight);
   if (h === prevH) break;
   prevH = h;
}
```

---

## 🛡️ Bot Protection & Session Strategy

**Before scraping multiple pages from the same domain:**

### 1. Check for APIs First (Network Interception as Reconnaissance)

Many SPAs (React, Next.js, etc.) fetch data via JSON/GraphQL. This is 10x cleaner than DOM scraping:

```ts
const response = await services.browser.execute({
   code: `
      const apiCalls = [];
      page.on('response', async (r) => {
         const url = r.url();
         if (url.includes('/api/') || url.includes('/graphql') || url.includes('/_next/data')) {
            apiCalls.push({ 
               url, 
               body: await r.text().catch(() => null) 
            });
         }
      });
      await page.goto(entryUrl, { waitUntil: 'networkidle' });
      return apiCalls;
   `
});
// If you find a useful API → call it directly with fetch instead of scraping DOM
```

### 2. Single-Session Navigation for Bot-Protected Sites

When scraping multiple pages on a site with bot protection, stay in ONE browser session:

```ts
// ❌ BAD — Each call spawns new session, each hits bot check
for (const url of urls) {
   const response = await services.browser.execute({
      code: `
         await page.goto(url, { waitUntil: 'domcontentloaded' });
         return await page.evaluate(() => /* extract */);
      `
   });
   // Many will fail Cloudflare/CAPTCHA checks
}

// ✅ GOOD — Single session, navigate within the same browser context
const response = await services.browser.execute({
   code: `
      // Navigate to entry page (passes bot check once)
      await page.goto(entryUrl, { waitUntil: 'domcontentloaded' });
      
      // Extract URLs to visit
      const urls = await page.evaluate(() => 
         [...document.querySelectorAll('a.product-link')].map(a => a.href)
      );
      
      // Visit each page IN THE SAME SESSION (already verified)
      const results = [];
      for (const url of urls) {
         await page.goto(url, { waitUntil: 'domcontentloaded' });
         const data = await page.evaluate(() => ({
            title: document.querySelector('h1')?.textContent?.trim(),
            // ... other fields
         }));
         results.push(data);
      }
      return results;
   `
});
// ⚠️ Remember: Inngest function times out at 3 min total — limit pages accordingly
```

### Signs You Need Single-Session Navigation

- Cloudflare, Akamai, PerimeterX, or CAPTCHA on first visit
- Site uses cookies/tokens that persist after verification
- You're scraping 5+ pages from the same domain

### Additional Bot Bypass Techniques

```ts
// Add Google referer (makes request look like it came from search)
await page.goto(url, {
   waitUntil: "domcontentloaded",
   referer: "https://www.google.com/"
});

// Or with a search query (more convincing for advanced bot detection)
await page.goto(url, {
   waitUntil: "domcontentloaded",
   referer: "https://www.google.com/search?q=relevant+keywords"
});

// Or navigate FROM Google (most convincing)
await page.goto("https://www.google.com");
await page.goto(url, { waitUntil: "domcontentloaded" });

// Wait for bot check to complete
await page.waitForTimeout(3000);
// Then verify you're past the check before extracting
```

---

## Rules

1. **NEVER use plain `page.goto(url)`** — always use `page.goto(url, { waitUntil: 'domcontentloaded' })` to avoid hanging forever
2. **Bot detection?** Use single-session navigation (see above). Add Google referer or navigate from Google directly.
3. **NEVER destructure only `result`** — keep full response to see `success`/`error`
4. **ANALYZE before extracting** — discover selectors, don't guess
5. **Return structured data** — `querySelectorAll` → objects, not HTML
6. **Check for APIs first** — network interception beats DOM scraping
7. **Use `innerText` not `innerHTML`** — much smaller
8. **Use `page._snapshotForAI()`** — for page structure analysis
9. **Multi-page same domain?** — Use single-session loops, not separate `browser.execute` calls
