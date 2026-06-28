# remindersComplete

Mark a reminder as complete.

```typescript
const result = await integrations.slack.remindersComplete({
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
