# updateContact

Update an existing contact's properties.

```typescript
// Update by ID
const updated = await integrations.hubspot.updateContact("123456", {
  properties: {
    jobtitle: "Senior Engineer",
    lifecyclestage: "customer"
  }
});

// Update by email
const updated = await integrations.hubspot.updateContact("john@example.com", {
  properties: { phone: "+1987654321" }
}, "email");
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `contactId` | `string` | Contact ID or unique property value |
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

