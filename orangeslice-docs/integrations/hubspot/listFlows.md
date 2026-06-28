# listFlows

List all workflows (flows) with pagination.

```typescript
// Basic list
const { results, paging } = await integrations.hubspot.listFlows();

// With options
const { results, paging } = await integrations.hubspot.listFlows({
  limit: 50,
  after: "cursor-token"
});

// Paginate through all workflows
let after: string | undefined;
do {
  const response = await integrations.hubspot.listFlows({ limit: 100, after });
  // process response.results
  after = response.paging?.next?.after;
} while (after);
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.limit` | `number` | Max results per page (default: 100) |
| `options.after` | `string` | Paging cursor from previous response |

## Output

```typescript
{
  results: Array<{
    id: string;
    name?: string;
    uuid?: string;
    flowType: string;
    objectTypeId: string;
    isEnabled: boolean;
    revisionId: string;
    createdAt: string;
    updatedAt: string;
  }>;
  paging?: {
    next?: { after: string };
  };
}
```

