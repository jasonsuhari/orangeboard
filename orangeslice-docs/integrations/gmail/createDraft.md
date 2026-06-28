# createDraft

Create a Gmail draft without sending it yet.

```typescript
// Create a new draft
const draft = await integrations.gmail.createDraft({
   recipient_email: "jane@example.com",
   subject: "Draft follow-up",
   body: "Sharing a quick follow-up before I send this."
});

// Draft a reply in an existing thread
await integrations.gmail.createDraft({
   thread_id: "19bf77729bcb3a44",
   body: "Thanks for the update. I will review this today."
});
```

## Input

| Parameter          | Type       | Required | Description                                  |
| ------------------ | ---------- | -------- | -------------------------------------------- |
| `recipient_email`  | `string`   | No       | Primary `To` recipient                       |
| `extra_recipients` | `string[]` | No       | Additional `To` recipients                   |
| `cc`               | `string[]` | No       | CC recipients                                |
| `bcc`              | `string[]` | No       | BCC recipients                               |
| `subject`          | `string`   | No       | Draft subject                                |
| `body`             | `string`   | No       | Draft body content                           |
| `message_body`     | `string`   | No       | Alternate body field accepted by some tools  |
| `is_html`          | `boolean`  | No       | Set to `true` when `body` contains HTML      |
| `attachment`       | `object`   | No       | Optional attachment payload                  |
| `thread_id`        | `string`   | No       | Existing thread to draft a reply into        |
| `from_email`       | `string`   | No       | Optional verified send-as alias              |
| `user_id`          | `string`   | No       | Gmail user id (`\"me\"` by default)          |

## Output

```typescript
{
  successful: boolean;
  data?: {
    id?: string;
    draft_id?: string;
    message?: GmailMessage;
  };
  error?: string;
}
```

## Notes

- Creating a draft is a mutating action and should be used intentionally
- If you pass `thread_id`, leave `subject` empty to stay in the existing thread
