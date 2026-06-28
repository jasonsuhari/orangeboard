---
name: builtWith
description: Technographic data enrichment — discover what technologies, frameworks, and tools companies use on their websites.
---

# BuiltWith Services

## Available Methods

| Method          | Description                            | Credits |
| --------------- | -------------------------------------- | ------- |
| `lookupDomain`  | Get full technology stack for a domain | 20      |
| `relationships` | Find related/connected domains         | 10      |
| `searchByTech`  | Find companies using a specific tech   | 100     |

## Use Cases

- **Lead generation**: Find all companies using a specific tool via `searchByTech`
- **Technographic targeting**: Check if prospects use specific tools
- **Competitive analysis**: Find companies using competitor products
- **Personalization**: Tailor outreach based on their stack
- **Account mapping**: Find related domains/subsidiaries via `relationships`

## searchByTech Limitations

| Works ✅                    | Blocked ❌                         |
| --------------------------- | ---------------------------------- |
| Salesforce, Hubspot, Stripe | WordPress, React, Google Analytics |
| Zendesk, Intercom, Shopify  | jQuery, Bootstrap, PHP             |
| Marketo, Pardot, Drift      | Any tech with 3M+ sites            |

- **Case-sensitive**: Use "Hubspot" not "HubSpot"
- **Find exact names**: Use `lookupDomain` on a site to see correct tech names
- **Pagination**: Each page returns up to 900 results. Use `offset` from previous response to get next page. Each page costs 100 credits.

## Example Workflows

```typescript
// Find all companies using Salesforce
const leads = await services.builtWith.searchByTech({
   tech: "Salesforce",
   includeMeta: true,
   country: "US"
});

// Check a specific prospect's tech stack
const tech = await services.builtWith.lookupDomain({ domain: "acme.com" });
const usesSalesforce = tech.technologies.some((t) => t.name.includes("Salesforce"));

// Find exact tech name from a domain
const stack = await services.builtWith.lookupDomain({ domain: "hubspot.com" });
// → Shows "Hubspot" (not "HubSpot") - use this exact name in searchByTech
```
