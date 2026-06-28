# getNote

Get a note by ID.

```typescript
const note = await integrations.hubspot.getNote("123456", {
  properties: ["hs_note_body", "hs_timestamp", "hubspot_owner_id"],
  associations: ["deals", "contacts", "companies"]
});
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `noteId` | `string` | Note ID |
| `options.properties` | `string[]` | Properties to return |
| `options.associations` | `string[]` | Associated objects (e.g., "deals", "contacts", "companies") |
| `options.archived` | `boolean` | Whether to return archived notes |

## Output

```typescript
{
  id: string;
  properties: Record<string, string | null>;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: Record<string, { results: Array<{ id: string; type: string }> }>;
}
```

