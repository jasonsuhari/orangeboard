# conversationsDeclineSharedInvite

Decline a pending Slack Connect invitation.

```typescript
const result = await integrations.slack.conversationsDeclineSharedInvite({
  invite_id: "I1234567890"
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `invite_id` | `string` | Yes | Invite ID to decline |
| `target_team` | `string` | No | Target team ID (Enterprise Grid) |

## Output

```typescript
{
  ok: boolean;
}
```
