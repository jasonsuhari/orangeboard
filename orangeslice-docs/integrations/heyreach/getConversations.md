# getConversations

Get conversations from the inbox with optional filtering.

```typescript
// Get all conversations
const conversations = await integrations.heyreach.getConversations();

// Filter by campaign and account
const conversations = await integrations.heyreach.getConversations({
  filters: {
    campaignIds: [12345],
    linkedInAccountIds: [67890],
    seen: false  // Only unread
  },
  limit: 50,
  offset: 0
});

// Search for a specific lead
const conversations = await integrations.heyreach.getConversations({
  filters: {
    leadProfileUrl: "https://linkedin.com/in/johndoe"
  }
});
```

## Input

```typescript
{
  filters?: {
    linkedInAccountIds?: number[];  // Filter by LinkedIn accounts
    campaignIds?: number[];         // Filter by campaigns
    searchString?: string;          // Search in conversations
    leadLinkedInId?: string;        // Filter by lead's LinkedIn ID
    leadProfileUrl?: string;        // Filter by lead's profile URL
    seen?: boolean | null;          // Filter by read/unread status
  };
  offset?: number;                  // Pagination offset
  limit?: number;                   // Max results per page (must be between 1 and 100)
}
```

## Output

```typescript
any  // Conversation data
```

