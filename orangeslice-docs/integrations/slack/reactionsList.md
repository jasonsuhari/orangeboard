# reactionsList

List items (messages, files) that have reactions.

```typescript
// List items with reactions from authenticated user
const result = await integrations.slack.reactionsList();

// List for a specific user
const result = await integrations.slack.reactionsList({
  user: "U1234567890",
  count: 50
});

for (const item of result.items || []) {
  if (item.message) {
    console.log(`Message: ${item.message.text}`);
  }
}
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user` | `string` | No | Filter by user (default: authenticated user) |
| `cursor` | `string` | No | Pagination cursor |
| `count` | `number` | No | Results per page |
| `page` | `number` | No | Page number |
| `full` | `boolean` | No | Include full user list |

## Output

```typescript
{
  ok: boolean;
  items?: {
    type?: string;
    channel?: string;
    message?: SlackMessage;
    file?: SlackFile;
    comment?: unknown;
  }[];
  paging?: {
    count?: number;
    total?: number;
    page?: number;
    pages?: number;
  };
}
```
