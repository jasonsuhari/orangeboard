# Get Company Revenue

Get company revenue, employee count, and firmographic data from a company domain.

**Credits: 2 (standard). Charged only if a valid result is returned.**

## Input Parameters

| Parameter | Type     | Required | Description                                                               |
| --------- | -------- | -------- | ------------------------------------------------------------------------- |
| `domain`  | `string` | Yes      | Company website domain (e.g., `stripe.com`, `https://www.salesforce.com`) |

Accepts any format: bare domain (`stripe.com`), with www (`www.stripe.com`), or full URL (`https://www.stripe.com/about`). The domain is automatically normalized.

## Output

```typescript
{
   revenue: number | null; // USD (e.g., 5100000000 for $5.1B). Ranges averaged.
   employees: number | null; // Count (e.g., 750 for "501-1,000"). Ranges averaged.
   headquarters: string | null; // e.g., "San Francisco, California, United States"
   industry: string | null; // e.g., "Business Intelligence (BI) Software, Software"
   website: string | null; // e.g., "www.stripe.com"
   funding: number | null; // USD (e.g., 8700000000 for $8.7B)
   description: string | null; // Company description paragraph
   sourceUrl: string | null; // The data source URL
}
```

## Examples

### Basic Revenue Lookup

```typescript
const companyData = await services.company.revenue({
   domain: row.domain
});
return companyData.revenue; // 5100000000
```

### Extract Multiple Fields

```typescript
const companyData = await services.company.revenue({
   domain: row.website
});
return {
   revenue: companyData.revenue,
   employees: companyData.employees,
   industry: companyData.industry,
   hq: companyData.headquarters
};
```

### Filter by Revenue Size

```typescript
const companyData = await services.company.revenue({
   domain: row.domain
});
if (companyData.revenue && companyData.revenue > 1_000_000_000) {
   return "Enterprise";
} else if (companyData.revenue && companyData.revenue > 100_000_000) {
   return "Mid-Market";
}
return "SMB";
```

## Key Rules

1. **Domain input only** — pass the company's website domain. URLs, bare domains, and www-prefixed domains all work.
2. **Numbers are parsed** — revenue, employees, and funding are returned as numbers (not formatted strings). Ranges are averaged.
3. **All fields nullable** — if the data source doesn't list a field (e.g., funding for a bootstrapped company), it returns `null`.
4. **Handles normalization** — `https://www.stripe.com/about`, `www.stripe.com`, and `stripe.com` all resolve to the same company.
