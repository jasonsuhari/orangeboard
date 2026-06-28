# createNote

Create a note on a record.

```typescript
const result = await integrations.attio.createNote({
  data: {
    parent_object: "companies",
    parent_record_id: "rec_01abc123def456",
    title: "Discovery Call Notes",
    format: "plaintext",
    content: "Discussed pricing tiers and implementation timeline. Decision maker is VP of Engineering. Follow up next Tuesday.",
  },
});
```

## Input

```typescript
{
  data: {
    parent_object: string;
    parent_record_id: string;
    title: string;
    format: "plaintext" | "markdown";
    content: string;
    created_at?: string;
    meeting_id?: string | null;
  };
}
```

## Output

```typescript
{
  data: {
    id: { note_id: string };
    parent_object: string;
    parent_record_id: string;
    title: string;
    content_plaintext: string;
    created_at: string;
    created_by_actor: { type: string; id: string | null };
  };
}
```
