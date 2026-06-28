# pinsList

List pinned items in a channel.

```typescript
const result = await integrations.slack.pinsList({
  channel: "C1234567890"
});

for (const item of result.items || []) {
  console.log(`Pinned by: ${item.created_by}`);
  console.log(`Message: ${item.message?.text}`);
}
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel ID |

## Output

```typescript
{
  ok: boolean;
  items?: {
    type?: string;
    channel?: string;
    message?: SlackMessage;
    created?: number;
    created_by?: string;
  }[];
}
```
