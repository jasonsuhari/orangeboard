# getOwner

Get a specific owner by ID or userId.

```typescript
// Get by owner ID
const owner = await integrations.hubspot.getOwner("123456");

// Get by userId
const owner = await integrations.hubspot.getOwner(1296619, {
  idProperty: "userId"
});

// Include archived owners
const owner = await integrations.hubspot.getOwner("123456", {
  archived: true
});
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `ownerId` | `string \| number` | The owner ID or userId |
| `options.idProperty` | `"id" \| "userId"` | Which property to match against (default: "id") |
| `options.archived` | `boolean` | Whether to return archived owners (default: false) |

## Output

```typescript
{
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
}
```

## Notes

- The `id` is the owner ID used in `hubspot_owner_id` property assignments
- The `userId` is the HubSpot user ID (different from owner ID)
- Use `idProperty: "userId"` when you have the user ID instead of owner ID

