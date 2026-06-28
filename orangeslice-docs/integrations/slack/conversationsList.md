# conversationsList

List channels in the workspace.

```typescript
// List public channels
const result = await integrations.slack.conversationsList();

// List with filters
const result = await integrations.slack.conversationsList({
  types: "public_channel,private_channel",
  exclude_archived: true,
  limit: 100
});

// Paginate through all channels
let cursor;
do {
  const result = await integrations.slack.conversationsList({ cursor, limit: 100 });
  for (const channel of result.channels || []) {
    console.log(channel.name, channel.id);
  }
  cursor = result.response_metadata?.next_cursor;
} while (cursor);
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | `string` | No | Pagination cursor |
| `exclude_archived` | `boolean` | No | Exclude archived channels |
| `limit` | `number` | No | Max results (default: 100, max: 1000) |
| `types` | `string` | No | Comma-separated: `public_channel`, `private_channel`, `mpim`, `im` |
| `team_id` | `string` | No | Team ID for Enterprise Grid |

## Output

```typescript
{
  ok: boolean;
  channels?: SlackChannel[];
  response_metadata?: {
    next_cursor?: string;
  };
}
```
