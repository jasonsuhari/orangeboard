# sendEmail

Send an email from the connected Gmail account.

> Rate limit note for AI: `integrations.gmail.sendEmail(...)` is heavily rate-limited to **40 calls/day** per connected Gmail account. Use sparingly and batch/aggregate where possible.

```typescript
// Basic email
const result = await integrations.gmail.sendEmail({
   recipient_email: "jane@example.com",
   subject: "Hello from Orange Slice",
   body: "Hi Jane, this is a test email."
});

// HTML email with additional recipients
await integrations.gmail.sendEmail({
   recipient_email: "primary@example.com",
   extra_recipients: ["secondary@example.com"],
   cc: ["manager@example.com"],
   subject: "Weekly digest",
   body: "<h3>Weekly Digest</h3><p>Everything looks good.</p>",
   is_html: true
});
```

## Input

| Parameter          | Type       | Required | Description                       |
| ------------------ | ---------- | -------- | --------------------------------- |
| `recipient_email`  | `string`   | No\*     | Primary `To` recipient            |
| `extra_recipients` | `string[]` | No       | Additional `To` recipients        |
| `cc`               | `string[]` | No       | CC recipients                     |
| `bcc`              | `string[]` | No       | BCC recipients                    |
| `subject`          | `string`   | No\*     | Email subject                     |
| `body`             | `string`   | No\*     | Email body (plain text or HTML)   |
| `is_html`          | `boolean`  | No       | Set to `true` when body is HTML   |
| `from_email`       | `string`   | No       | Optional verified send-as alias   |
| `attachment`       | `object`   | No       | Optional attachment payload       |
| `user_id`          | `string`   | No       | Gmail user id (`"me"` by default) |

\*Gmail requires at least one recipient (`recipient_email`, `cc`, or `bcc`) and at least one of `subject` or `body`.

## Output

```typescript
{
  successful: boolean;
  data?: unknown;
  error?: string;
}
```
