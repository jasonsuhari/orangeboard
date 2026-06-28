# listOwners

List owners (users) in your HubSpot account with pagination. Owners can be assigned to CRM records via the `hubspot_owner_id` property.

```typescript
// Basic list
const { results, paging } = await integrations.hubspot.listOwners();

// Filter by email
const { results } = await integrations.hubspot.listOwners({
  email: "john@company.com"
});

// With pagination options
const { results, paging } = await integrations.hubspot.listOwners({
  limit: 50,
  archived: false
});

// Paginate through all owners
let after: string | undefined;
do {
  const response = await integrations.hubspot.listOwners({ limit: 100, after });
  // process response.results
  after = response.paging?.next?.after;
} while (after);
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.email` | `string` | Filter by owner email address |
| `options.limit` | `number` | Max results per page (default: 100) |
| `options.after` | `string` | Paging cursor from previous response |
| `options.archived` | `boolean` | Whether to return archived owners (default: false) |

## Output

```typescript
{
  results: Array<{
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    userId?: number;
    userIdIncludingInactive?: number;
    type: "PERSON" | "QUEUE";
    teams?: Array<{
      id: string;
      name: string;
      primary: boolean;
    }>;
    createdAt: string;
    updatedAt: string;
    archived: boolean;
  }>;
  paging?: {
    next?: { after: string };
  };
}
```

## Notes

- Owners can be of type `PERSON` (individual user) or `QUEUE` (shared queue)
- Use the owner `id` to assign records via `hubspot_owner_id` property
- Teams are only available if your HubSpot tier supports team features

