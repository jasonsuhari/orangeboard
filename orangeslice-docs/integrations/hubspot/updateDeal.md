# updateDeal

Update an existing deal.

```typescript
const updated = await integrations.hubspot.updateDeal("123456", {
  properties: {
    dealstage: "closedwon",
    amount: "75000"
  }
});
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `dealId` | `string` | Deal ID |
| `input.properties` | `object` | Properties to update |

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

