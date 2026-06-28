# chatGetPermalink

Get a permanent URL for a message.

```typescript
const result = await integrations.slack.chatGetPermalink(
  "C1234567890",      // Channel ID
  "1234567890.123456" // Message timestamp
);

console.log(result.permalink);
// "https://myworkspace.slack.com/archives/C1234567890/p1234567890123456"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel ID |
| `message_ts` | `string` | Yes | Message timestamp |

## Output

```typescript
{
  ok: boolean;
  permalink?: string;  // Permanent URL to the message
}
```
