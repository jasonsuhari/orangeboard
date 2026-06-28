# chatDelete

Delete a message.

```typescript
const result = await integrations.slack.chatDelete({
  channel: "C1234567890",
  ts: "1234567890.123456"  // Message timestamp
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel containing the message |
| `ts` | `string` | Yes | Timestamp of message to delete |

## Output

```typescript
{
  ok: boolean;
  channel?: string;
  ts?: string;
}
```

## Notes

- You can only delete messages posted by your app/bot
- Workspace admins may have additional deletion permissions
