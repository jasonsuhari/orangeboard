# createContact

Create a new contact in HubSpot.

```typescript
const result = await integrations.hubspot.createContact({
   properties: {
      email: "john@example.com",
      firstname: "John",
      lastname: "Doe",
      phone: "+1234567890",
      company: "Acme Inc",
      jobtitle: "Engineer",
      lifecyclestage: "lead"
   },
   associations: [] // optional: link to companies/deals
});

// Returns:  { id, properties, createdAt, ... }
```

## Input

```typescript
{
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    mobilephone?: string;
    company?: string;
    website?: string;
    jobtitle?: string;
    lifecyclestage?: string;
    hubspot_owner_id?: string;
    hs_lead_status?: string;
    [key: string]: string | undefined;
  };
  associations?: Array<{
    to: { id: string };
    types: Array<{ associationCategory: "HUBSPOT_DEFINED" | "USER_DEFINED" | "INTEGRATOR_DEFINED"; associationTypeId: number }>;
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
