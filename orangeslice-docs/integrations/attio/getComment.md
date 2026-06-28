# getComment

Get a comment by ID.

```typescript
const result = await integrations.attio.getComment({
  comment_id: "com_01abc123def456",
});
```

## Input

```typescript
{
  comment_id: string;
}
```

## Output

```typescript
{
  data: {
    id: { comment_id: string };
    thread_id: string;
    content_plaintext: string;
    created_at: string;
    author: { type: string; id: string | null };
  };
}
```
