# usersConversations

List channels a user is a member of.

```typescript
// List channels for the authenticated user
const result = await integrations.slack.usersConversations({
  types: "public_channel,private_channel"
});

// List channels for a specific user
const result = await integrations.slack.usersConversations({
  user: "U1234567890",
  types: "public_channel"
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | `string` | No | Pagination cursor |
| `exclude_archived` | `boolean` | No | Exclude archived channels |
| `limit` | `number` | No | Max results |
| `types` | `string` | No | Comma-separated: `public_channel`, `private_channel`, `mpim`, `im` |
| `user` | `string` | No | User ID (default: authenticated user) |
| `team_id` | `string` | No | Team ID (Enterprise Grid) |

## Output

```typescript
{
  ok: boolean;
  channels?: SlackChannel[];
  response_metadata?: {
    next_cursor?: string;
  };
}
```
