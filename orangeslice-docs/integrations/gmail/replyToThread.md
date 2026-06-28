# replyToThread

Reply inside an existing Gmail thread.

```typescript
await integrations.gmail.replyToThread({
   thread_id: "19bf77729bcb3a44",
   body: "Thanks for the note. I will get back to you tomorrow."
});

await integrations.gmail.replyToThread({
   thread_id: "19bf77729bcb3a44",
   body: "<p>Reviewed and approved.</p>",
   is_html: true
});
```

## Input

| Parameter          | Type       | Required | Description                                  |
| ------------------ | ---------- | -------- | -------------------------------------------- |
| `thread_id`        | `string`   | Yes      | Gmail thread to reply within                 |
| `body`             | `string`   | No       | Reply body                                   |
| `message_body`     | `string`   | No       | Alternate body field accepted by some tools  |
| `subject`          | `string`   | No       | Optional subject override                    |
| `cc`               | `string[]` | No       | CC recipients                                |
| `bcc`              | `string[]` | No       | BCC recipients                               |
| `attachment`       | `object`   | No       | Optional attachment payload                  |
| `is_html`          | `boolean`  | No       | Set to `true` when `body` contains HTML      |
| `from_email`       | `string`   | No       | Optional verified send-as alias              |
| `user_id`          | `string`   | No       | Gmail user id (`\"me\"` by default)          |

## Output

```typescript
{
  successful: boolean;
  data?: {
    id?: string;
    messageId?: string;
    threadId?: string;
    labelIds?: string[];
  };
  error?: string;
}
```

## Notes

- This is a mutating action and should be used intentionally
- Use a real `thread_id` from `fetchEmails(...)` or `fetchMessageByThreadId(...)`
