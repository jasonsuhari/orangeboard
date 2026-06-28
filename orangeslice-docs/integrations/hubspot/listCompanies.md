# listCompanies

List companies with pagination.

```typescript
const { results, paging } = await integrations.hubspot.listCompanies({
   limit: 50,
   properties: ["name", "domain", "industry"]
});

// Paginate
let after: string | undefined;
do {
   const response = await integrations.hubspot.listCompanies({ limit: 100, after });
   after = response.paging?.next?.after;
} while (after);
```

## Input

| Parameter              | Type       | Description                        |
| ---------------------- | ---------- | ---------------------------------- |
| `options.limit`        | `number`   | Max results per page (default: 10) |
| `options.after`        | `string`   | Paging cursor                      |
| `options.properties`   | `string[]` | Properties to return               |
| `options.associations` | `string[]` | Associated objects to include      |

## Output

```typescript
{
  results: Array<{ id, properties, createdAt, updatedAt, archived, associations? }>;
  paging?: { next?: { after: string } };
}
```
