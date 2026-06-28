# getCompany

Get a company by ID or unique property value.

```typescript
// Get by ID
const company = await integrations.hubspot.getCompany("123456");

// Get by domain
const company = await integrations.hubspot.getCompany("acme.com", {
  idProperty: "domain",
  properties: ["name", "industry", "numberofemployees"]
});

// With associations
const company = await integrations.hubspot.getCompany("123456", {
  properties: ["name", "domain"],
  associations: ["contacts", "deals"]
});
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `companyId` | `string` | Company ID or unique property value |
| `options.properties` | `string[]` | Properties to return |
| `options.associations` | `string[]` | Associated objects (e.g., "contacts", "deals") |
| `options.idProperty` | `string` | Property name if using unique property lookup |

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

