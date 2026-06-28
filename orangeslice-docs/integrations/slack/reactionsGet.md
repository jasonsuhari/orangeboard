# reactionsGet

Get reactions for a message.

```typescript
const result = await integrations.slack.reactionsGet({
  channel: "C1234567890",
  timestamp: "1234567890.123456"
});

const message = result.message;
for (const reaction of message?.reactions || []) {
  console.log(`${reaction.name}: ${reaction.count} reactions`);
}
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel containing the message |
| `timestamp` | `string` | Yes | Message timestamp |
| `full` | `boolean` | No | Include full user list for each reaction |

## Output

```typescript
{
  ok: boolean;
  type?: string;
  channel?: string;
  message?: SlackMessage;
  file?: SlackFile;
}
```
