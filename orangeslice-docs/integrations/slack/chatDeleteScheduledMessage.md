# chatDeleteScheduledMessage

Delete a scheduled message before it's sent.

```typescript
const result = await integrations.slack.chatDeleteScheduledMessage(
  "C1234567890",           // Channel ID
  "Q1234567890ABCDEF"      // Scheduled message ID from chatScheduleMessage
);
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel ID |
| `scheduled_message_id` | `string` | Yes | ID from chatScheduleMessage response |

## Output

```typescript
{
  ok: boolean;
}
```
