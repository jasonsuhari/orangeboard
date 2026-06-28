# listNotes

List notes with pagination.

```typescript
const { results, paging } = await integrations.hubspot.listNotes({
  limit: 50,
  properties: ["hs_note_body", "hs_timestamp", "hubspot_owner_id"],
  associations: ["deals", "contacts"]
});

// Paginate through all notes
let after = undefined;
do {
  const { results, paging } = await integrations.hubspot.listNotes({
    limit: 100,
    after,
    properties: ["hs_note_body", "hs_timestamp"]
  });
  // Process results...
  after = paging?.next?.after;
} while (after);
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.limit` | `number` | Max results per page (default: 10) |
| `options.after` | `string` | Paging cursor |
| `options.properties` | `string[]` | Properties to return |
| `options.associations` | `string[]` | Associated objects to include |
| `options.archived` | `boolean` | Include archived notes |

## Output

```typescript
{
  results: Array<{ id, properties, createdAt, updatedAt, archived, associations? }>;
  paging?: { next?: { after: string } };
}
```

