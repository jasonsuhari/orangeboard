# apify.runActor

Run any Apify actor. **Never guess params** — always discover first.

```ts
type runActor = (params: {
   actor: string; // 'username/actor-name'
   input?: Record<string, unknown>;
   datasetListParams?: { limit?: number; offset?: number; clean?: boolean; fields?: string[]; unwind?: string };
}) => Promise<{
   items: Record<string, unknown>[]; // The scraped data
   usageTotalUsd: number; // Exact cost charged by Apify
}>;
```

---

## Credits & Pricing

**Credits: variable (custom). Reserved based on estimated items + compute. Settled at exact `usageTotalUsd × 500`.**

- **Reservation:** Tiered on `datasetListParams.limit` — first 1000 items at 5 credits ($0.01), beyond 1000 at 1 credit ($0.002). Minimum 50 credits.
- **Allowed pricing models:** `FREE`, `PRICE_PER_DATASET_ITEM`, `PAY_PER_EVENT`
- **Blocked:** `FLAT_PRICE_PER_MONTH` (rental actors) — will throw an error
- **Credits conversion:** $0.002 per credit (e.g., $0.01 = 5 credits)
- **Settlement:** Based on exact `usageTotalUsd` from Apify after run completes

---

## 1. Search Actors (Algolia)

```ts
const res = await fetch("https://ow0o5i3qo7-dsn.algolia.net/1/indexes/prod_PUBLIC_STORE/query", {
   method: "POST",
   headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-algolia-api-key": "0ecccd09f50396a4dbbe5dbfb17f4525",
      "x-algolia-application-id": "OW0O5I3QO7"
   },
   body: JSON.stringify({
      query: "linkedin jobs",
      hitsPerPage: 5,
      filters: "NOT currentPricingInfo.pricingModel:FLAT_PRICE_PER_MONTH", // exclude rentals
      attributesToRetrieve: ["name", "username", "title", "description", "stats", "currentPricingInfo"]
   })
});
const { hits } = await res.json();
// Actor ID = `${hits[0].username}/${hits[0].name}`
```

---

## 2. Fetch Input Schema (OpenAPI)

```ts
// Get actor info (includes actId and latest buildId)
const actorInfo = await fetch(`https://api.apify.com/v2/acts/${username}~${actorName}`).then((r) => r.json());
const { id: actId, taggedBuilds } = actorInfo.data;
const buildId = taggedBuilds.latest.buildId;

// Fetch OpenAPI spec
const openapi = await fetch(`https://api.apify.com/v2/acts/${actId}/builds/${buildId}/openapi.json`).then((r) =>
   r.json()
);
const inputSchema = openapi.components.schemas.inputSchema;
// inputSchema.properties contains all input fields with types, enums, defaults, descriptions
```

---

## 3. Run Actor

```ts
const result = await services.apify.runActor({
   actor: "curious_coder/linkedin-jobs-scraper",
   input: { searchQueries: ["Software Engineer SF"], maxResults: 50 },
   datasetListParams: { limit: 50 }
});

// Access the items
const items = result.items;
```

---

## Rules

1. **Filter rentals** — `filters: "NOT currentPricingInfo.pricingModel:FLAT_PRICE_PER_MONTH"`
2. **Always fetch OpenAPI spec** — never guess input params
3. **Use `datasetListParams.limit`** — control output volume and costs
