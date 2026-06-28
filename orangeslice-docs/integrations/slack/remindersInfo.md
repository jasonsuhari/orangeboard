# remindersInfo

Get information about a reminder.

```typescript
const result = await integrations.slack.remindersInfo({
  reminder: "Rm1234567890"
});

const reminder = result.reminder;
console.log(reminder?.text);
console.log(new Date((reminder?.time || 0) * 1000));
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reminder` | `string` | Yes | Reminder ID |

## Output

```typescript
{
  ok: boolean;
  reminder?: SlackReminder;
}
```
