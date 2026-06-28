# getProfile

Read Gmail profile metadata for the connected account.

```typescript
const profile = await integrations.gmail.getProfile();

console.log(profile.data?.emailAddress);
console.log(profile.data?.messagesTotal);
console.log(profile.data?.threadsTotal);
```

## Input

| Parameter | Type     | Required | Description                         |
| --------- | -------- | -------- | ----------------------------------- |
| `user_id` | `string` | No       | Gmail user id (`\"me\"` by default) |

## Output

```typescript
{
  successful: boolean;
  data?: {
    emailAddress?: string;
    messagesTotal?: number;
    threadsTotal?: number;
    historyId?: string;
  };
  error?: string;
}
```

## Notes

- This is a lightweight way to confirm which mailbox is connected
- Mailbox totals are useful for diagnostics, health checks, and quick account introspection
