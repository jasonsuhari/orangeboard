# remindersAdd

Create a reminder.

```typescript
// Reminder for yourself
const result = await integrations.slack.remindersAdd({
  text: "Review the pull request",
  time: "in 2 hours"
});

// Reminder at specific time (Unix timestamp)
const result = await integrations.slack.remindersAdd({
  text: "Join standup meeting",
  time: String(Math.floor(Date.now() / 1000) + 3600)
});

// Reminder for another user
const result = await integrations.slack.remindersAdd({
  text: "Submit expense report",
  time: "tomorrow at 9am",
  user: "U1234567890"
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | `string` | Yes | Reminder text |
| `time` | `string` | Yes | When to remind (Unix timestamp or natural language) |
| `user` | `string` | No | User to remind (default: authenticated user) |

## Output

```typescript
{
  ok: boolean;
  reminder?: SlackReminder;
}

// SlackReminder structure:
{
  id?: string;
  creator?: string;
  user?: string;
  text?: string;
  recurring?: boolean;
  time?: number;
  complete_ts?: number;
}
```

## Time Format Examples

- `"in 2 hours"`
- `"tomorrow at 9am"`
- `"next Monday at 2pm"`
- `"1234567890"` (Unix timestamp as string)
