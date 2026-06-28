# conversationsReplies

Get replies in a message thread.

```typescript
const result = await integrations.slack.conversationsReplies({
  channel: "C1234567890",
  ts: "1234567890.123456"  // Parent message timestamp
});

// First message is the parent, rest are replies
for (const msg of result.messages || []) {
  console.log(`${msg.user}: ${msg.text}`);
}
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel ID |
| `ts` | `string` | Yes | Parent message timestamp |
| `cursor` | `string` | No | Pagination cursor |
| `inclusive` | `boolean` | No | Include messages at oldest/latest |
| `oldest` | `string` | No | Start of time range |
| `latest` | `string` | No | End of time range |
| `limit` | `number` | No | Max messages (default: 10) |

## Output

```typescript
{
  ok: boolean;
  messages?: SlackMessage[];  // First is parent, rest are replies
  has_more?: boolean;
  response_metadata?: {
    next_cursor?: string;
  };
}
```
