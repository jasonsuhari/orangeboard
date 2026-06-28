# conversationsApproveSharedInvite

Approve a pending Slack Connect invitation (admin function).

```typescript
const result = await integrations.slack.conversationsApproveSharedInvite({
  invite_id: "I1234567890"
});

// Approve for specific team (Enterprise Grid)
const result = await integrations.slack.conversationsApproveSharedInvite({
  invite_id: "I1234567890",
  target_team: "T9876543210"
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `invite_id` | `string` | Yes | Invite ID to approve |
| `target_team` | `string` | No | Target team ID (Enterprise Grid) |

## Output

```typescript
{
  ok: boolean;
}
```

## Notes

- Requires admin permissions
- Used when org has Slack Connect invite approvals enabled
