---
name: tech-stack-detection
description: Detect technologies used by companies via BuiltWith API or browser inspection.
---

# Tech Stack Detection

## Quick Reference

| Goal                       | Service                                                             | Description                                 |
| -------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| **Find companies by tech** | [`builtWith.searchByTech`](../services/builtWith/searchByTech.ts)   | "Give me all companies using Salesforce"    |
| **Check a domain's stack** | [`builtWith.lookupDomain`](../services/builtWith/lookupDomain.ts)   | "What tech does acme.com use?"              |
| **Find related domains**   | [`builtWith.relationships`](../services/builtWith/relationships.ts) | "Find subsidiaries via shared tracking IDs" |
| **Custom detection**       | [`browser.execute`](../services/browser/execute.md)                 | Inspect DOM, globals, network requests      |

---

## Method 1: BuiltWith API (Recommended)

**Use when:** You need reliable, comprehensive tech data at scale.

```typescript
// Find leads using a specific technology
const leads = await services.builtWith.searchByTech({
   tech: "Salesforce",
   includeMeta: true,
   country: "US"
});

// Check a specific prospect's stack
const stack = await services.builtWith.lookupDomain({ domain: "acme.com" });
const usesSalesforce = stack.technologies.some((t) => t.name.includes("Salesforce"));
```

**Full docs:** [`services/builtWith/index.md`](../services/builtWith/index.md)

---

## Method 2: Browser Inspection (DIY)

**Use when:** BuiltWith doesn't have the data, or you need real-time detection.

**Cost: ~$0.001/page** — Be thorough. Capture everything in ONE call.

> ⚠️ READ [`services/browser/execute.md`](../services/browser/execute.md) BEFORE USING

The browser can run ANY JavaScript. Write 50-100 lines to:

- Intercept network requests (scripts, API calls, tracking pixels)
- Inspect DOM (framework attributes, meta tags, comments)
- Check global variables (React, Vue, analytics, CMS globals)
- Extract inline scripts and stylesheets

**Don't make multiple calls** — capture everything in a single `browser.execute`.

### What to Check

| Check      | How                                                                               |
| ---------- | --------------------------------------------------------------------------------- |
| Globals    | `__NEXT_DATA__`, `__NUXT__`, `React`, `Vue`, `Shopify`, `gtag`, `fbq`, `Intercom` |
| DOM attrs  | `data-reactroot`, `data-v-*`, `ng-*`, `x-data`                                    |
| Scripts    | `src` URLs, inline snippets                                                       |
| Network    | Intercept requests for analytics, CDNs, APIs                                      |
| Meta tags  | `og:*`, `generator`, framework hints                                              |
| Preconnect | `<link rel="preconnect">` reveals services                                        |

---

## Common Signals

| Signal                               | Indicates     |
| ------------------------------------ | ------------- |
| `__NEXT_DATA__`, `/_next/`           | Next.js       |
| `__NUXT__`                           | Nuxt          |
| `data-v-*`                           | Vue           |
| `ng-*`, `_ngcontent`                 | Angular       |
| `/wp-content/`                       | WordPress     |
| `Shopify`, `Webflow`, `wixBiSession` | CMS platforms |

**Extend as needed** — CRMs, payments, analytics. Write the code, the browser will run it.
