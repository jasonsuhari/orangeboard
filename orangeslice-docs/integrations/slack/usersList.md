# usersList

List users in the workspace.

```typescript
const result = await integrations.slack.usersList({
  limit: 100
});

for (const user of result.members || []) {
  console.log(`${user.name}: ${user.profile?.email}`);
}

// Paginate through all users
let cursor;
do {
  const result = await integrations.slack.usersList({ cursor, limit: 100 });
  // Process users...
  cursor = result.response_metadata?.next_cursor;
} while (cursor);
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | `string` | No | Pagination cursor |
| `include_locale` | `boolean` | No | Include locale info |
| `limit` | `number` | No | Max results (default: 100) |
| `team_id` | `string` | No | Team ID (Enterprise Grid) |

## Output

```typescript
{
  ok: boolean;
  members?: SlackUser[];
  response_metadata?: {
    next_cursor?: string;
  };
}
```
