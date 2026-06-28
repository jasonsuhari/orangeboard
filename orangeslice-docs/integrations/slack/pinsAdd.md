# pinsAdd

Pin a message to a channel.

```typescript
const result = await integrations.slack.pinsAdd({
  channel: "C1234567890",
  timestamp: "1234567890.123456"
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel ID |
| `timestamp` | `string` | Yes | Message timestamp to pin |

## Output

```typescript
{
  ok: boolean;
}
```
