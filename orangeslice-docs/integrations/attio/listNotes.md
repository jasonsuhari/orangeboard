# listNotes

List notes, optionally filtered by parent record.

```typescript
const result = await integrations.attio.listNotes({
  parent_object: "companies",
  parent_record_id: "rec_01abc123def456",
  limit: 20,
});
```

## Input

```typescript
{
  parent_object?: string;
  parent_record_id?: string;
  limit?: number;
  offset?: number;
}
```

## Output

```typescript
{
  data: Array<{
    id: { note_id: string };
    parent_object: string;
    parent_record_id: string;
    title: string;
    content_plaintext: string;
    created_at: string;
    created_by_actor: { type: string; id: string | null };
  }>;
  next_cursor?: string | null;
}
```
