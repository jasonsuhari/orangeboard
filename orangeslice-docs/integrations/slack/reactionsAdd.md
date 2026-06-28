# reactionsAdd

Add an emoji reaction to a message.

```typescript
const result = await integrations.slack.reactionsAdd({
  channel: "C1234567890",
  name: "thumbsup",           // Emoji name without colons
  timestamp: "1234567890.123456"
});

// Add custom emoji
const result = await integrations.slack.reactionsAdd({
  channel: "C1234567890",
  name: "custom_emoji",
  timestamp: "1234567890.123456"
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel containing the message |
| `name` | `string` | Yes | Emoji name (without colons) |
| `timestamp` | `string` | Yes | Message timestamp |

## Output

```typescript
{
  ok: boolean;
}
```

## Common Emoji Names

- `thumbsup`, `thumbsdown`
- `heart`, `star`, `fire`
- `white_check_mark`, `x`
- `eyes`, `pray`, `raised_hands`
- `rocket`, `tada`, `100`
