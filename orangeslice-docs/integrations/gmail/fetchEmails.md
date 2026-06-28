# fetchEmails

Fetch inbox messages or Gmail search results from the connected account.

```typescript
// Read the current inbox
const inbox = await integrations.gmail.fetchEmails({
   query: "in:inbox",
   max_results: 10
});

// Search for unread emails from a sender
const unread = await integrations.gmail.fetchEmails({
   query: "in:inbox is:unread from:alice@example.com",
   max_results: 25
});
```

## Input

| Parameter             | Type       | Required | Description                                           |
| --------------------- | ---------- | -------- | ----------------------------------------------------- |
| `query`               | `string`   | No       | Gmail search query such as `in:inbox is:unread`       |
| `verbose`             | `boolean`  | No       | Fetch richer message details                          |
| `ids_only`            | `boolean`  | No       | Only return message/thread identifiers                |
| `label_ids`           | `string[]` | No       | Filter by Gmail label IDs                             |
| `page_token`          | `string`   | No       | Pagination token from a previous call                 |
| `max_results`         | `number`   | No       | Maximum messages to fetch in this page                |
| `include_payload`     | `boolean`  | No       | Include payload/body data when available              |
| `include_spam_trash`  | `boolean`  | No       | Include spam and trash                                |
| `user_id`             | `string`   | No       | Gmail user id (`\"me\"` by default)                   |

## Output

```typescript
{
  successful: boolean;
  data?: {
    messages?: GmailMessage[];
    nextPageToken?: string;
    resultSizeEstimate?: number;
  };
  error?: string;
}
```

## Notes

- Results are not guaranteed to be sorted by recency, so sort client-side if order matters
- For large mailboxes, fetch IDs first and then hydrate specific messages with `fetchMessageByMessageId(...)`
