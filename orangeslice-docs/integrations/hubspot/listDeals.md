# listDeals

List deals with pagination.

```typescript
const { results, paging } = await integrations.hubspot.listDeals({
  limit: 50,
  properties: ["dealname", "amount", "dealstage", "closedate"]
});
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.limit` | `number` | Max results per page (default: 10) |
| `options.after` | `string` | Paging cursor |
| `options.properties` | `string[]` | Properties to return |
| `options.associations` | `string[]` | Associated objects to include |

## Output

```typescript
{
  results: Array<{ id, properties, createdAt, updatedAt, archived, associations? }>;
  paging?: { next?: { after: string } };
}
```

