# usersSetPresence

Set the authenticated user's presence status.

```typescript
// Set to away
await integrations.slack.usersSetPresence("away");

// Set to auto (active based on activity)
await integrations.slack.usersSetPresence("auto");
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `presence` | `"auto" \| "away"` | Yes | Presence status |

## Output

```typescript
{
  ok: boolean;
}
```
