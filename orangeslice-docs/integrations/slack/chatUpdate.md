# chatUpdate

Update an existing message.

```typescript
const result = await integrations.slack.chatUpdate({
  channel: "C1234567890",
  ts: "1234567890.123456",  // Message timestamp from chatPostMessage
  text: "Updated message text"
});

// Update with blocks
const result = await integrations.slack.chatUpdate({
  channel: "C1234567890",
  ts: "1234567890.123456",
  text: "Fallback text",
  blocks: [
    {
      type: "section",
      text: { type: "mrkdwn", text: "*Updated* content" }
    }
  ]
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel containing the message |
| `ts` | `string` | Yes | Timestamp of message to update |
| `text` | `string` | No* | New message text |
| `blocks` | `SlackBlock[]` | No | New block content |
| `attachments` | `SlackAttachment[]` | No | New attachments |

## Output

```typescript
{
  ok: boolean;
  channel?: string;
  ts?: string;
  text?: string;
  message?: SlackMessage;
}
```
