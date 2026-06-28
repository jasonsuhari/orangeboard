# usersGetPresence

Get a user's current presence status.

```typescript
const result = await integrations.slack.usersGetPresence("U1234567890");

console.log(result.presence);    // "active" or "away"
console.log(result.online);      // true/false
console.log(result.auto_away);   // true if automatically set to away
console.log(result.manual_away); // true if manually set to away
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user` | `string` | Yes | User ID |

## Output

```typescript
{
  ok: boolean;
  presence?: string;      // "active" or "away"
  online?: boolean;
  auto_away?: boolean;
  manual_away?: boolean;
}
```
