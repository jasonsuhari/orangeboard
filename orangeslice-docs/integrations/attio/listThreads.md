# listThreads

List comment threads, optionally filtered by record or entry.

```typescript
// List threads for a record
const result = await integrations.attio.listThreads({
  object: "companies",
  record_id: "rec_01abc123def456",
  limit: 10,
});

// List threads for a list entry
const entryThreads = await integrations.attio.listThreads({
  list: "sales_pipeline",
  entry_id: "ent_01abc123def456",
});
```

## Input

```typescript
{
  record_id?: string;
  object?: string;
  entry_id?: string;
  list?: string;
  limit?: number;
  offset?: number;
}
```

## Output

```typescript
{
  data: Array<{
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
  }>;
  next_cursor?: string | null;
}
```
