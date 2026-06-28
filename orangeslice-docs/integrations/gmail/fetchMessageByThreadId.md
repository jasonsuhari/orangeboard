# fetchMessageByThreadId

Fetch all messages belonging to a Gmail thread.

```typescript
const thread = await integrations.gmail.fetchMessageByThreadId({
   thread_id: "19bf77729bcb3a44"
});

for (const message of thread.data?.messages || []) {
   console.log(message.subject);
}
```

## Input

| Parameter    | Type     | Required | Description                         |
| ------------ | -------- | -------- | ----------------------------------- |
| `thread_id`  | `string` | Yes      | Gmail API thread ID                 |
| `user_id`    | `string` | No       | Gmail user id (`\"me\"` by default) |

## Output

```typescript
{
  successful: boolean;
  data?: {
    messages?: GmailMessage[];
  };
  error?: string;
}
```

## Notes

- Message order is not guaranteed, so sort by `internalDate` if you need oldest/newest order
- Read threads first before calling `replyToThread(...)` so you have the correct `thread_id`
