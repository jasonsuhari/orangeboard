# remindersList

List all reminders for the authenticated user.

```typescript
const result = await integrations.slack.remindersList();

for (const reminder of result.reminders || []) {
  console.log(`${reminder.text} - Due: ${new Date((reminder.time || 0) * 1000)}`);
}
```

## Output

```typescript
{
  ok: boolean;
  reminders?: SlackReminder[];
}
```
