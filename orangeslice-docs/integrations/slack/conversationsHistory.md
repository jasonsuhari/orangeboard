# conversationsHistory

Get message history from a channel.

```typescript
// Get recent messages
const result = await integrations.slack.conversationsHistory({
  channel: "C1234567890",
  limit: 50
});

for (const msg of result.messages || []) {
  console.log(`${msg.user}: ${msg.text}`);
}

// Get messages in a time range
const result = await integrations.slack.conversationsHistory({
  channel: "C1234567890",
  oldest: "1234567890.000000",  // Start timestamp
  latest: "1234567899.000000",  // End timestamp
  inclusive: true
});

// Paginate through history
let cursor;
do {
  const result = await integrations.slack.conversationsHistory({
    channel: "C1234567890",
    cursor,
    limit: 100
  });
  // Process messages...
  cursor = result.response_metadata?.next_cursor;
} while (cursor);
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel ID |
| `cursor` | `string` | No | Pagination cursor |
| `inclusive` | `boolean` | No | Include messages with oldest/latest timestamps |
| `latest` | `string` | No | End of time range (message timestamp) |
| `oldest` | `string` | No | Start of time range (message timestamp) |
| `limit` | `number` | No | Max messages (default: 100) |

## Output

```typescript
{
  ok: boolean;
  messages?: SlackMessage[];
  has_more?: boolean;
  response_metadata?: {
    next_cursor?: string;
  };
}
```
