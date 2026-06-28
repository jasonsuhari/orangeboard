---
description: Gmail inbox, drafts, threads, labels, profile, and email sending via Google integration
---

# Gmail Integration

Typed functions for Gmail actions powered by Orange Slice Google integrations.

## Write Actions

- `integrations.gmail.sendEmail(input)` - Send an email through the connected Gmail account
- `integrations.gmail.createDraft(input)` - Create a Gmail draft without sending it
- `integrations.gmail.replyToThread(input)` - Reply inside an existing Gmail thread
- Heavy rate limit: `sendEmail` is capped at **40 calls/day** per connected Gmail account
- Mutating Gmail actions should be used intentionally because they require approval

## Read Actions

- `integrations.gmail.fetchEmails(input)` - Read inbox messages or Gmail search results
- `integrations.gmail.fetchMessageByMessageId(input)` - Fetch one message by Gmail message ID
- `integrations.gmail.fetchMessageByThreadId(input)` - Fetch all messages in a Gmail thread
- `integrations.gmail.listLabels(input)` - List Gmail system and custom labels
- `integrations.gmail.getProfile(input)` - Read Gmail profile metadata such as mailbox counts

## Notes

- Prefer `fetchEmails({ query: "in:inbox", max_results: 10 })` to read the current inbox
- For large inbox scans, start with smaller `max_results` values or `ids_only: true`
- Use real `messageId` and `threadId` values returned by Gmail read methods before drilling into a message or thread
