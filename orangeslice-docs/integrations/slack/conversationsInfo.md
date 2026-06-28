# conversationsInfo

Get detailed information about a channel.

```typescript
const result = await integrations.slack.conversationsInfo({
  channel: "C1234567890"
});

console.log(result.channel?.name);
console.log(result.channel?.purpose?.value);
console.log(result.channel?.num_members);
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel ID |
| `include_locale` | `boolean` | No | Include locale info |
| `include_num_members` | `boolean` | No | Include member count |

## Output

```typescript
{
  ok: boolean;
  channel?: SlackChannel;
}
```
