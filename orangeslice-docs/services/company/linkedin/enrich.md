---
description: Enrich company data from LinkedIn URL, slug, or domain
---

# LinkedIn Company Enrich

Enrich a company from the B2B database. **Fast (~300-500ms).**

**Credits: 1/result (per-result)**

## When to Use

Use this to get company information from a LinkedIn URL, slug, or domain. Returns structured company data from the B2B database.

## Input Parameters

Provide **at least one** of:

- `shorthand`: LinkedIn company slug (e.g., `"stripe"`)
- `url`: LinkedIn company URL (e.g., `"https://www.linkedin.com/company/stripe"`)
- `domain`: Company website domain (e.g., `"stripe.com"`)

**Optional:**

- `extended`: `boolean` (default: `false`) - Include growth metrics, funding data, and JSON fields

## Return Types

### Default (`extended: false`) - `B2BCompany`

Basic company info from the `linkedin_company` table:

```typescript
interface B2BCompany {
   name: string | null; // Company name
   slug: string | null; // LinkedIn URL slug (universal_name)
   domain: string | null; // Website domain
   website: string | null; // Full website URL
   description: string | null; // Company description
   industry: string | null; // Industry name
   employee_count: number | null; // Employee headcount
   follower_count: number | null; // LinkedIn followers
   founded_year: number | null; // Year founded
   locality: string | null; // City
   region: string | null; // State/region
   country_code: string | null; // Country code (e.g., "US")
   country_name: string | null; // Full country name
   company_type: string | null; // Type (e.g., "Public Company")
   company_size: string | null; // Size range label
   ticker: string | null; // Stock ticker
   logo: string | null; // Logo URL
   twitter_handle: string | null; // Twitter handle
   linkedin_url: string | null; // Full LinkedIn URL
   created_at: string | null; // Record created timestamp
   updated_at: string | null; // Record updated timestamp
}
```

> Important: LinkedIn company `industry` / `industries` coverage in the B2B DB is very sparse and often too weak for enrichment. These fields may be `null`, generic, stale, or missing even when the company record exists. Treat them as lookup metadata only, not as a high-confidence classification source for enrichment workflows.
>
> Preferred pattern for enrichment/classification:
>
> 1. Start from the company `domain` when available
> 2. `services.scrape.website(...)` the company site or a relevant subpage
> 3. `services.ai.generateObject(...)` to classify the company from the scraped content
>
> Use LinkedIn enrich primarily for fast lookup fields like company identity, URL, headcount, location, and description. Do **not** build industry enrichment pipelines that depend mainly on LinkedIn `industry`.

### Extended (`extended: true`) - `B2BCompanyExtended`

Full data from `lkd_company` + `company` tables. Includes everything from `B2BCompany` plus:

```typescript
interface B2BCompanyExtended extends B2BCompany {
   // Growth metrics - ratio where 1.05 = 5% growth, 0.95 = 5% decline
   employee_growth_01mo: number | null; // 1-month growth
   employee_growth_03mo: number | null; // 3-month growth
   employee_growth_06mo: number | null; // 6-month growth
   employee_growth_12mo: number | null; // 12-month growth (YoY)
   employee_growth_24mo: number | null; // 24-month growth

   // Rankings
   rank_fortune: number | null;
   rank_incmagazine: number | null;
   rank_internetretailer: number | null;

   // Industry codes
   naics_codes: B2BCompanyNaicsCode[] | null;
   sic_codes: number[] | null;

   // Structured fields (from lkd_company)
   industries: B2BCompanyIndustry[] | null;
   locations: B2BCompanyLocation[] | null;
   posts: B2BCompanyPost[] | null;
   crunchbase_funding: B2BCompanyCrunchbaseFunding[] | null;
   inferred_location: B2BCompanyInferredLocation | null;

   // Related companies (LinkedIn IDs, not directly usable)
   similar_pages: number[] | null; // LinkedIn IDs of similar companies
   affiliated_pages: number[] | null; // LinkedIn IDs of parent/subsidiary companies
   employees: number[] | null; // Sample LinkedIn profile IDs of employees
}

// NAICS industry code
interface B2BCompanyNaicsCode {
   code: string; // e.g., "611210"
   title: string; // e.g., "Junior Colleges"
}

// Industry entry
interface B2BCompanyIndustry {
   id: number;
   name: string;
   primary: boolean; // Whether this is the primary industry
}

// Office location entry
interface B2BCompanyLocation {
   address: string; // e.g., "San Francisco, CA, US"
   is_primary: boolean;
   inferred_location: B2BCompanyInferredLocation | null;
}

// LinkedIn post from the company
interface B2BCompanyPost {
   id: number;
   updated_at: string;
   linkedin_company_id: number;
   posted_date_range: { min: string; max: string } | null; // Estimated date window
   posted_date: string | null; // Best estimate of actual post date
   content_html: string | null;
   likes_count: number | null;
   comments_count: number | null;
   image_url: string | null; // Image hash/ID, not a full URL
   video_url: string | null;
   external_url: string | null;
   embedded_post: B2BCompanyEmbeddedPost | null; // Original post if this is a reshare
}

// Embedded/reshared post (when a company reshares another post)
interface B2BCompanyEmbeddedPost {
   id: number;
   updated_at: string;
   linkedin_company_id: number;
   posted_date_range: { min: string; max: string } | null;
   posted_date: string | null;
   content_html: string | null;
   likes_count: number | null;
   comments_count: number | null;
   image_url: string | null;
   video_url: string | null;
   external_url: string | null;
}

// Crunchbase funding round (each entry is one round)
interface B2BCompanyCrunchbaseFunding {
   funding_round_count: number; // Total rounds for the company (same across all entries)
   round_date: string | null; // Date of THIS round, e.g., "2024-10-25"
   round_name: string | null; // e.g., "Seed", "Series A", "Series B"
   round_amount: number | null; // Amount raised in this round
   round_currency: string | null; // e.g., "USD"
   crunchbase_company_name: string | null;
   crunchbase_company_url: string | null;
   investor_names: string[] | null;
   investor_count: number | null;
   funding_url: string | null; // Link to this specific round on Crunchbase
}

// Inferred geographic location
interface B2BCompanyInferredLocation {
   latitude: number;
   longitude: number;
   formatted_address: string;
   name: string;
   country_iso: string;
   locality: string | null;
   admin_district: string;
   postal_code: string | null;
}
```

---

## Examples

### Basic Enrich by URL

```typescript
const company = await services.company.linkedin.enrich({
   url: "https://www.linkedin.com/company/stripe"
});

return {
   name: company?.name,
   employees: company?.employee_count,
   industry: company?.industry,
   location: [company?.locality, company?.country_code].filter(Boolean).join(", ")
};
```

### Basic Enrich by Domain

```typescript
const company = await services.company.linkedin.enrich({
   domain: "openai.com"
});

return company?.name; // "OpenAI"
```

### Basic Enrich by Shorthand (Slug)

```typescript
const company = await services.company.linkedin.enrich({
   shorthand: "microsoft"
});

return company?.employee_count; // e.g., 221000
```

### Extended Enrich with Growth Metrics

```typescript
const company = await services.company.linkedin.enrich({
   url: "https://www.linkedin.com/company/stripe",
   extended: true
});

return {
   name: company?.name,
   employees: company?.employee_count,
   growth_1mo: company?.employee_growth_01mo,
   growth_12mo: company?.employee_growth_12mo,
   funding: company?.crunchbase_funding,
   fortune_rank: company?.rank_fortune
};
```

### Extended Enrich for Funding Data

```typescript
const company = await services.company.linkedin.enrich({
   domain: "perplexity.ai",
   extended: true
});

// crunchbase_funding is a JSON object with funding rounds
const funding = company?.crunchbase_funding;
return funding;
```

---

## Common Patterns

### Find LinkedIn URL and Enrich

When you only have a company name (not the LinkedIn URL), use `findUrl` first:

```typescript
// Find the LinkedIn URL from company name
const linkedinUrl = await services.company.linkedin.findUrl({
   name: row.companyName
});

if (linkedinUrl) {
   const company = await services.company.linkedin.enrich({
      url: linkedinUrl,
      extended: true
   });
   return company;
}
```

### Extract Key Metrics

```typescript
const company = await services.company.linkedin.enrich({
   url: row.companyUrl,
   extended: true
});

if (!company) return "Company not found";

return {
   name: company.name,
   employees: company.employee_count,
   growthYoY: company.employee_growth_12mo ? `${((company.employee_growth_12mo - 1) * 100).toFixed(1)}%` : null,
   location: [company.locality, company.country_code].filter(Boolean).join(", ")
};
```

### Classify Industry from Domain, Not LinkedIn

If your goal is enrichment or categorization, prefer the company website over LinkedIn `industry`:

```typescript
const company = await services.company.linkedin.enrich({
   domain: row.domain
});

const { markdown } = await services.scrape.website({
   url: `https://${row.domain}`
});

const { object } = await services.ai.generateObject({
   prompt: `
Classify this company based on its website content.

Do not rely on LinkedIn industry because it is sparse and often too generic.
Use LinkedIn only as lightweight context for identity verification.

Domain: ${row.domain}
LinkedIn name: ${company?.name ?? "unknown"}
LinkedIn description: ${company?.description ?? "unknown"}

Website content:
${markdown}
   `,
   schema: z.object({
      industry: z.string().nullable(),
      subindustry: z.string().nullable(),
      businessModel: z.string().nullable(),
      confidence: z.enum(["low", "medium", "high"])
   })
});

return object;
```

### Handle Missing Companies

```typescript
const company = await services.company.linkedin.enrich({
   domain: row.domain
});

if (!company) {
   return "Company not found in B2B database";
}

return company.name;
```

---

## Performance

- **Fast**: ~300-500ms for indexed lookups
- **Default**: Use `extended: false` for quick lookups
- **Extended**: Use `extended: true` only when you need growth metrics or funding data
