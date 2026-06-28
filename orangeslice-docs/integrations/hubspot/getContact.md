# getContact

Get a contact by ID or unique property value (like email).

```typescript
// Get by ID
const contact = await integrations.hubspot.getContact("123456");

// Get by email
const contact = await integrations.hubspot.getContact("john@example.com", {
  idProperty: "email",
  properties: ["firstname", "lastname", "company"]
});

// Get with associations
const contact = await integrations.hubspot.getContact("123456", {
  properties: ["email", "firstname"],
  associations: ["companies", "deals"]
});
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `contactId` | `string` | Contact ID or unique property value |
| `options.properties` | `string[]` | Properties to return |
| `options.propertiesWithHistory` | `string[]` | Properties to return with history |
| `options.associations` | `string[]` | Associated objects to include (e.g., "companies", "deals") |
| `options.archived` | `boolean` | Whether to return archived contacts |
| `options.idProperty` | `string` | Property name if using unique property lookup (e.g., "email") |

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

