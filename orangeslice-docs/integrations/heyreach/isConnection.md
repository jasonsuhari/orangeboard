# isConnection

Check if a lead is a connection of a LinkedIn account.

```typescript
// Check by profile URL
const result = await integrations.heyreach.isConnection({
  senderAccountId: 67890,
  leadProfileUrl: "https://linkedin.com/in/johndoe"
});

// Check by LinkedIn ID
const result = await integrations.heyreach.isConnection({
  senderAccountId: 67890,
  leadLinkedInId: "ACoAABxxxxxx"
});
```

## Input

```typescript
{
  senderAccountId: number;   // LinkedIn account ID to check from (required)
  leadProfileUrl?: string;   // Lead's LinkedIn profile URL
  leadLinkedInId?: string;   // Lead's LinkedIn member ID
}
```

## Output

```typescript
any  // Connection status data
```

