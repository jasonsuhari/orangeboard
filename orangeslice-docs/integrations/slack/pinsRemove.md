# pinsRemove

Unpin a message from a channel.

```typescript
const result = await integrations.slack.pinsRemove({
  channel: "C1234567890",
  timestamp: "1234567890.123456"
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel ID |
| `timestamp` | `string` | Yes | Message timestamp to unpin |

## Output

```typescript
{
  ok: boolean;
}
```
