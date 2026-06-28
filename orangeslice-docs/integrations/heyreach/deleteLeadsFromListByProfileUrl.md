# deleteLeadsFromListByProfileUrl

Delete leads from a list by their LinkedIn profile URLs.

```typescript
const result = await integrations.heyreach.deleteLeadsFromListByProfileUrl({
  listId: 12345,
  profileUrls: [
    "https://linkedin.com/in/johndoe",
    "https://linkedin.com/in/janesmith"
  ]
});
```

## Input

```typescript
{
  listId: number;         // List ID
  profileUrls: string[];  // Array of LinkedIn profile URLs to delete
}
```

## Output

```typescript
any  // Response data about deleted leads
```

