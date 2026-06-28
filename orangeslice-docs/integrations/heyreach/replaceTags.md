# replaceTags

Replace all tags on a lead with new tags. This removes existing tags and adds the specified ones.

```typescript
// Replace tags by profile URL
await integrations.heyreach.replaceTags({
  leadProfileUrl: "https://linkedin.com/in/johndoe",
  tags: ["customer", "enterprise"],
  createTagIfNotExisting: true
});

// Replace tags by LinkedIn ID
await integrations.heyreach.replaceTags({
  leadLinkedInId: "ACoAABxxxxxx",
  tags: ["won"],
  createTagIfNotExisting: true
});
```

## Input

```typescript
{
  leadProfileUrl?: string;          // LinkedIn profile URL (use this OR leadLinkedInId)
  leadLinkedInId?: string;          // LinkedIn member ID (use this OR leadProfileUrl)
  tags: string[];                   // Array of tag names (replaces all existing tags)
  createTagIfNotExisting?: boolean; // Create tags if they don't exist (default: false)
}
```

## Output

```typescript
any  // Response data
```

