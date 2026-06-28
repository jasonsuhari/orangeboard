# addTags

Add tags to a lead. Identify the lead by profile URL or LinkedIn ID.

```typescript
// Add tags by profile URL
await integrations.heyreach.addTags({
  leadProfileUrl: "https://linkedin.com/in/johndoe",
  tags: ["hot-lead", "enterprise"],
  createTagIfNotExisting: true
});

// Add tags by LinkedIn ID
await integrations.heyreach.addTags({
  leadLinkedInId: "ACoAABxxxxxx",
  tags: ["contacted", "interested"]
});
```

## Input

```typescript
{
  leadProfileUrl?: string;          // LinkedIn profile URL (use this OR leadLinkedInId)
  leadLinkedInId?: string;          // LinkedIn member ID (use this OR leadProfileUrl)
  tags: string[];                   // Array of tag names to add
  createTagIfNotExisting?: boolean; // Create tags if they don't exist (default: false)
}
```

## Output

```typescript
any  // Response data
```

