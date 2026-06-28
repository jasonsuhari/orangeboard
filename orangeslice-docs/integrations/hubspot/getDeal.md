# getDeal

Get a deal by ID.

```typescript
const deal = await integrations.hubspot.getDeal("123456", {
  properties: ["dealname", "amount", "dealstage", "closedate"],
  associations: ["contacts", "companies"]
});
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `dealId` | `string` | Deal ID |
| `options.properties` | `string[]` | Properties to return |
| `options.associations` | `string[]` | Associated objects (e.g., "contacts", "companies") |

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

