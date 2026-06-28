# conversationsCreate

Create a new channel in the workspace.

```typescript
// Create a public channel
const result = await integrations.slack.conversationsCreate({
   name: "customer-updates"
});

// Create a private channel
const privateResult = await integrations.slack.conversationsCreate({
   name: "deal-room-acme",
   is_private: true
});

console.log(result.channel?.id, result.channel?.name);
```

## Input

| Parameter    | Type      | Required | Description                            |
| ------------ | --------- | -------- | -------------------------------------- |
| `name`       | `string`  | Yes      | Channel name (lowercase, no spaces)    |
| `is_private` | `boolean` | No       | Set `true` to create a private channel |
| `team_id`    | `string`  | No       | Team ID for Enterprise Grid            |

## Output

```typescript
{
  ok: boolean;
  channel?: SlackChannel;
}
```
