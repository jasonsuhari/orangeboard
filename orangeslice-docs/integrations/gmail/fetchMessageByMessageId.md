# fetchMessageByMessageId

Fetch a single Gmail message by its Gmail API message ID.

```typescript
const message = await integrations.gmail.fetchMessageByMessageId({
   message_id: "19b11732c1b578fd",
   format: "full"
});

console.log(message.data?.subject);
console.log(message.data?.threadId);
```

## Input

| Parameter     | Type                                      | Required | Description                            |
| ------------- | ----------------------------------------- | -------- | -------------------------------------- |
| `message_id`  | `string`                                  | Yes      | Gmail API message ID                   |
| `format`      | `\"minimal\" | \"full\" | \"raw\" | \"metadata\"` | No       | Response format                        |
| `user_id`     | `string`                                  | No       | Gmail user id (`\"me\"` by default)    |

## Output

```typescript
{
  successful: boolean;
  data?: GmailMessage;
  error?: string;
}
```

## Notes

- Use real Gmail `message_id` values returned by Gmail list/search actions
- `format: "full"` is best when you need headers, payload parts, or body data
