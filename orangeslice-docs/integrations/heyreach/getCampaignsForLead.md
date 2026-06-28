# getCampaignsForLead

Get all campaigns that a lead is part of. Identify the lead by email, LinkedIn ID, or profile URL.

```typescript
// By profile URL
const campaigns = await integrations.heyreach.getCampaignsForLead({
  profileUrl: "https://linkedin.com/in/johndoe"
});

// By email
const campaigns = await integrations.heyreach.getCampaignsForLead({
  email: "john@acme.com",
  limit: 50
});

// By LinkedIn ID
const campaigns = await integrations.heyreach.getCampaignsForLead({
  linkedinId: "ACoAABxxxxxx"
});
```

## Input

```typescript
{
  email?: string;       // Lead's email address
  linkedinId?: string;  // LinkedIn member ID
  profileUrl?: string;  // LinkedIn profile URL
  offset?: number;      // Pagination offset
  limit?: number;       // Max results per page (must be between 1 and 100)
}
```

## Output

```typescript
any  // Campaign data for the lead
```

