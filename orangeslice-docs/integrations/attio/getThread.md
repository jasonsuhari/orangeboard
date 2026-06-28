# getThread

Get a thread with all its comments.

```typescript
const result = await integrations.attio.getThread({
  thread_id: "thr_01abc123def456",
});
```

## Input

```typescript
{
  thread_id: string;
}
```

## Output

```typescript
{
  data: {
    id: { thread_id: string };
    record_id?: string;
    entry_id?: string;
    comments: Array<{
      id: { comment_id: string };
      thread_id: string;
      content_plaintext: string;
      created_at: string;
      author: { type: string; id: string | null };
    }>;
  };
}
```
