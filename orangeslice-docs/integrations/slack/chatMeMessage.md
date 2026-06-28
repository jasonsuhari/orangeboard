# chatMeMessage

Send a /me message (appears as "_user does something_").

```typescript
const result = await integrations.slack.chatMeMessage(
  "C1234567890",
  "is thinking..."  // Appears as: "_bot is thinking..._"
);
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel ID |
| `text` | `string` | Yes | Action text |

## Output

```typescript
{
  ok: boolean;
  channel?: string;
  ts?: string;
}
```
