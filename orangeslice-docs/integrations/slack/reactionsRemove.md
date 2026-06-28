# reactionsRemove

Remove an emoji reaction from a message.

```typescript
const result = await integrations.slack.reactionsRemove({
   channel: "C1234567890",
   name: "thumbsup",
   timestamp: "1234567890.123456"
});
```

## Input

| Parameter   | Type     | Required | Description                    |
| ----------- | -------- | -------- | ------------------------------ |
| `channel`   | `string` | Yes      | Channel containing the message |
| `name`      | `string` | Yes      | Emoji name to remove           |
| `timestamp` | `string` | Yes      | Message timestamp              |

## Output

```typescript
{
   ok: boolean;
}
```
