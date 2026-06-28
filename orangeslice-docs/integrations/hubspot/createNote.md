# createNote

Create a note and associate it with a deal, contact, or company.

```typescript
// Add a note to a deal
const result = await integrations.hubspot.createNote({
   properties: {
      hs_note_body: "Had a great call with the client. They're ready to move forward.",
      hs_timestamp: new Date().toISOString()
   },
   associations: [
      {
         to: { id: "123456" }, // Deal ID
         types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 214 }]
      }
   ]
});

// Add a note to a contact
const result = await integrations.hubspot.createNote({
   properties: {
      hs_note_body: "Follow up scheduled for next week.",
      hs_timestamp: new Date().toISOString()
   },
   associations: [
      {
         to: { id: "789012" }, // Contact ID
         types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }]
      }
   ]
});
```

## Common Association Type IDs

| From | To      | TypeId |
| ---- | ------- | ------ |
| Note | Deal    | 214    |
| Note | Contact | 202    |
| Note | Company | 190    |

## Input

```typescript
{
  properties: {
    hs_note_body?: string;      // The note content (HTML supported)
    hs_timestamp?: string;       // ISO 8601 timestamp
    hs_attachment_ids?: string;  // Comma-separated file IDs
    hubspot_owner_id?: string;   // Owner user ID
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
