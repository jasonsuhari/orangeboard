# createComment

Create a comment on a record, entry, or as a reply to a thread. Requires an author (workspace member).

```typescript
// Reply to a thread
const reply = await integrations.attio.createComment({
  data: {
    format: "plaintext",
    content: "Good point — let's circle back after the demo.",
    author: { type: "workspace-member", id: "wm_01abc123def456" },
    thread_id: "thr_01xyz789ghi012",
  },
});

// Comment on a record
const recordComment = await integrations.attio.createComment({
  data: {
    format: "plaintext",
    content: "Reached out via email, waiting on response.",
    author: { type: "workspace-member", id: "wm_01abc123def456" },
    record: { object: "companies", record_id: "rec_01abc123def456" },
  },
});

// Comment on a list entry
const entryComment = await integrations.attio.createComment({
  data: {
    format: "plaintext",
    content: "Moved to negotiation stage after last call.",
    author: { type: "workspace-member", id: "wm_01abc123def456" },
    entry: { list: "sales_pipeline", entry_id: "ent_01abc123def456" },
  },
});
```

## Input

```typescript
{
  data:
    | { format: "plaintext"; content: string; author: { type: "workspace-member"; id: string }; created_at?: string; thread_id: string }
    | { format: "plaintext"; content: string; author: { type: "workspace-member"; id: string }; created_at?: string; record: { object: string; record_id: string } }
    | { format: "plaintext"; content: string; author: { type: "workspace-member"; id: string }; created_at?: string; entry: { list: string; entry_id: string } }
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
