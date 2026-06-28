# conversationsInviteShared

Invite external users to a channel via Slack Connect.

```typescript
// Invite by email
const result = await integrations.slack.conversationsInviteShared({
  channel: "C1234567890",
  emails: ["partner@externalcompany.com", "vendor@othercompany.com"]
});

console.log(result.invite_id);   // "I1234567890"
console.log(result.conf_code);   // Confirmation code

// Invite by Slack user ID (if already connected)
const result = await integrations.slack.conversationsInviteShared({
  channel: "C1234567890",
  user_ids: ["U9876543210"]
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Channel ID to share |
| `emails` | `string[]` | No* | External email addresses (*one of emails or user_ids required) |
| `user_ids` | `string[]` | No* | Slack user IDs to invite |
| `external_limited` | `boolean` | No | Invite as external limited member (default: true) |

## Output

```typescript
{
  ok: boolean;
  invite_id?: string;
  conf_code?: string;
  is_legacy_shared_channel?: boolean;
}
```

## Notes

- Requires `conversations.connect:write` scope
- The recipient must accept the invite to complete the connection
- Channel must be one your app has access to
