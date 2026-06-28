# createCompany

Create a new company in HubSpot.

```typescript
const result = await integrations.hubspot.createCompany({
   properties: {
      name: "Acme Inc",
      domain: "acme.com",
      industry: "Technology",
      phone: "+1234567890",
      city: "San Francisco",
      state: "CA",
      country: "USA"
   }
});
```

## Input

```typescript
{
  properties: {
    name?: string;
    domain?: string;
    description?: string;
    phone?: string;
    website?: string;
    industry?: string;
    numberofemployees?: string;
    annualrevenue?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
    address?: string;
    lifecyclestage?: string;
    hubspot_owner_id?: string;
    [key: string]: string | undefined;
  };
  associations?: Array<{
    to: { id: string };
    types: Array<{ associationCategory: string; associationTypeId: number }>;
  }>;
}
```

## Output

```typescript
{
   id: string;
   properties: Record<string, string | null>;
   createdAt: string;
   updatedAt: string;
   archived: boolean;
}
```
