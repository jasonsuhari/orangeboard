# createDeal

Create a new deal in HubSpot.

```typescript
const result = await integrations.hubspot.createDeal({
   properties: {
      dealname: "Enterprise Contract",
      amount: "50000",
      dealstage: "appointmentscheduled",
      pipeline: "default",
      closedate: "2024-12-31"
   },
   // Associate with a contact
   associations: [
      {
         to: { id: "123456" },
         types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }]
      }
   ]
});
```

## Common Association Type IDs

| From | To      | TypeId |
| ---- | ------- | ------ |
| Deal | Contact | 3      |
| Deal | Company | 5      |

## Input

```typescript
{
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    dealtype?: string;
    description?: string;
    hubspot_owner_id?: string;
    hs_priority?: string;
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
