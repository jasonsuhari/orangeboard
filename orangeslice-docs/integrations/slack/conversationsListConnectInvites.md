# conversationsListConnectInvites

List pending Slack Connect invitations.

```typescript
const result = await integrations.slack.conversationsListConnectInvites({
  count: 100
});

for (const invite of result.invites || []) {
  console.log(`${invite.direction}: ${invite.invite_id}`);
  console.log(`Channel: ${invite.channel?.name}`);
  console.log(`Status: ${invite.status}`);
}

// Paginate
let cursor;
do {
  const result = await integrations.slack.conversationsListConnectInvites({
    cursor,
    count: 100
  });
  // Process invites...
  cursor = result.response_metadata?.next_cursor;
} while (cursor);
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `count` | `number` | No | Max results to return |
| `cursor` | `string` | No | Pagination cursor |
| `team_id` | `string` | No | Team ID (Enterprise Grid) |

## Output

```typescript
{
  ok: boolean;
  invites?: SlackConnectInvite[];
  response_metadata?: {
    next_cursor?: string;
  };
}

// SlackConnectInvite structure:
{
  direction?: string;      // "inbound" or "outbound"
  status?: string;         // "pending", "accepted", "expired"
  date_created?: number;
  date_invalid?: number;
  invite_type?: string;
  invite_id?: string;
  link?: string;
  channel?: {
    id?: string;
    name?: string;
    is_private?: boolean;
  };
  acceptances?: {
    user_id?: string;
    team_id?: string;
    team_name?: string;
    approval_status?: string;
    date_accepted?: number;
  }[];
}
```
