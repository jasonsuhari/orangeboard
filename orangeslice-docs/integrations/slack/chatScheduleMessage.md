# chatScheduleMessage

Schedule a message to be sent later.

```typescript
// Schedule for a specific Unix timestamp
const result = await integrations.slack.chatScheduleMessage({
  channel: "C1234567890",
  text: "This message will be sent later!",
  post_at: Math.floor(Date.now() / 1000) + 3600  // 1 hour from now
});

console.log(result.scheduled_message_id);  // Use to cancel later
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel ID |
| `post_at` | `number` | Yes | Unix timestamp for when to send |
| `text` | `string` | No* | Message text |
| `blocks` | `SlackBlock[]` | No | Rich layout blocks |
| `thread_ts` | `string` | No | Thread to post in |

## Output

```typescript
{
  ok: boolean;
  scheduled_message_id?: string;  // ID to cancel the scheduled message
  post_at?: number;               // Confirmed send time
}
```

## Notes

- `post_at` must be in the future (at least 1 second from now)
- Maximum scheduling window is 120 days in the future
