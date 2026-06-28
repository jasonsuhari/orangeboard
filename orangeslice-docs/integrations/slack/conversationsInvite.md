# conversationsInvite

Invite internal workspace users to an existing channel.

```typescript
const result = await integrations.slack.conversationsInvite({
   channel: "C1234567890",
   users: "U11111111,U22222222"
});

console.log(result.ok);
```

## Input

| Parameter | Type     | Required | Description                     |
| --------- | -------- | -------- | ------------------------------- |
| `channel` | `string` | Yes      | Channel ID to invite users into |
| `users`   | `string` | Yes      | Comma-separated Slack user IDs  |

## Output

```typescript
{
  ok: boolean;
  error?: string;
}
```
