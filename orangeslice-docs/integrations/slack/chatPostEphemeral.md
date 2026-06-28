# chatPostEphemeral

Send an ephemeral message visible only to a specific user.

```typescript
const result = await integrations.slack.chatPostEphemeral({
  channel: "C1234567890",
  user: "U1234567890",  // Only this user will see the message
  text: "This message is only visible to you!"
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel ID |
| `user` | `string` | Yes | User ID who will see the message |
| `text` | `string` | No* | Message text |
| `blocks` | `SlackBlock[]` | No | Rich layout blocks |
| `attachments` | `SlackAttachment[]` | No | Legacy attachments |
| `thread_ts` | `string` | No | Thread to post in |

## Output

```typescript
{
  ok: boolean;
  message_ts?: string;
}
```

## Notes

- Ephemeral messages cannot be updated or deleted
- They disappear when the user reloads Slack
- Useful for confirmations, errors, or private notifications
