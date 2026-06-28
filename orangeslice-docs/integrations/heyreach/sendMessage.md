# sendMessage

Send a message in a conversation.

```typescript
await integrations.heyreach.sendMessage({
  conversationId: "conv-123",
  linkedInAccountId: 67890,
  message: "Hi John, thanks for connecting! I wanted to reach out about..."
});

// With subject (for InMail)
await integrations.heyreach.sendMessage({
  conversationId: "conv-123",
  linkedInAccountId: 67890,
  message: "I noticed your work at Acme Inc and thought we should connect.",
  subject: "Quick question about your role"
});
```

## Input

```typescript
{
  message: string;           // Message content to send
  subject?: string;          // Optional subject (for InMail)
  conversationId: string;    // Conversation ID to send in
  linkedInAccountId: number; // LinkedIn account ID to send from
}
```

## Output

```typescript
void  // Returns nothing on success
```

