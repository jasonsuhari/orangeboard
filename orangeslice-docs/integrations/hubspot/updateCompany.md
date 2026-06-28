# updateCompany

Update an existing company's properties.

```typescript
const updated = await integrations.hubspot.updateCompany("123456", {
  properties: {
    numberofemployees: "500",
    annualrevenue: "10000000"
  }
});
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `companyId` | `string` | Company ID or unique property value |
| `input.properties` | `object` | Properties to update |
| `idProperty` | `string` | Optional property name if using unique property lookup |

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

