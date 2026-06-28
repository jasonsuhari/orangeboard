# conversationsAcceptSharedInvite

Accept an incoming Slack Connect invitation.

```typescript
// Accept with channel name (creates new channel)
const result = await integrations.slack.conversationsAcceptSharedInvite({
  channel_name: "shared-with-partner",
  invite_id: "I1234567890"
});

// Accept into existing channel
const result = await integrations.slack.conversationsAcceptSharedInvite({
  channel_name: "existing-channel",
  channel_id: "C1234567890",
  invite_id: "I1234567890"
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel_name` | `string` | Yes | Name for the shared channel |
| `channel_id` | `string` | No | Existing channel ID to convert |
| `invite_id` | `string` | No* | Invite ID (*one of invite_id or channel_id required) |
| `free_trial_accepted` | `boolean` | No | Accept free trial terms |
| `is_private` | `boolean` | No | Create as private channel |
| `team_id` | `string` | No | Team to accept into (Enterprise Grid) |

## Output

```typescript
{
  ok: boolean;
  implicit_approval?: boolean;
  channel_id?: string;
}
```
