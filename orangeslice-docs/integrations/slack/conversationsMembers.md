# conversationsMembers

List members in a channel.

```typescript
const result = await integrations.slack.conversationsMembers({
  channel: "C1234567890",
  limit: 100
});

for (const userId of result.members || []) {
  console.log(userId);  // "U1234567890"
}

// Paginate through all members
let cursor;
const allMembers: string[] = [];
do {
  const result = await integrations.slack.conversationsMembers({
    channel: "C1234567890",
    cursor,
    limit: 100
  });
  allMembers.push(...(result.members || []));
  cursor = result.response_metadata?.next_cursor;
} while (cursor);
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel ID |
| `cursor` | `string` | No | Pagination cursor |
| `limit` | `number` | No | Max results (default: 100) |

## Output

```typescript
{
  ok: boolean;
  members?: string[];  // Array of user IDs
  response_metadata?: {
    next_cursor?: string;
  };
}
```
