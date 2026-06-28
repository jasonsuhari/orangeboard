# listContacts

List contacts with pagination.

```typescript
// Basic list
const { results, paging } = await integrations.hubspot.listContacts();

// With options
const { results, paging } = await integrations.hubspot.listContacts({
  limit: 50,
  properties: ["email", "firstname", "lastname", "company"],
  associations: ["companies"]
});

// Paginate through all
let after: string | undefined;
do {
  const response = await integrations.hubspot.listContacts({ limit: 100, after });
  // process response.results
  after = response.paging?.next?.after;
} while (after);
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.limit` | `number` | Max results per page (default: 10) |
| `options.after` | `string` | Paging cursor from previous response |
| `options.properties` | `string[]` | Properties to return |
| `options.propertiesWithHistory` | `string[]` | Properties to return with history |
| `options.associations` | `string[]` | Associated objects to include |
| `options.archived` | `boolean` | Whether to return archived contacts |

## Output

```typescript
{
  results: Array<{
    id: string;
    properties: Record<string, string | null>;
    createdAt: string;
    updatedAt: string;
    archived: boolean;
    associations?: Record<string, { results: Array<{ id: string; type: string }> }>;
  }>;
  paging?: {
    next?: { after: string };
  };
}
```

