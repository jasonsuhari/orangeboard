# remindersDelete

Delete a reminder.

```typescript
const result = await integrations.slack.remindersDelete({
  reminder: "Rm1234567890"
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reminder` | `string` | Yes | Reminder ID |

## Output

```typescript
{
  ok: boolean;
}
```
