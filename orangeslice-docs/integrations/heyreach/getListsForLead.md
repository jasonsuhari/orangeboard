# getListsForLead

Get all lists that contain a specific lead. Identify the lead by email, LinkedIn ID, or profile URL.

```typescript
// By profile URL
const lists = await integrations.heyreach.getListsForLead({
  profileUrl: "https://linkedin.com/in/johndoe"
});

// By email
const lists = await integrations.heyreach.getListsForLead({
  email: "john@acme.com",
  limit: 50
});

// By LinkedIn ID
const lists = await integrations.heyreach.getListsForLead({
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
any  // List data for the lead
```

