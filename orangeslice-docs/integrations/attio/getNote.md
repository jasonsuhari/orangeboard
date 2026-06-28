# getNote

Get a note by ID.

```typescript
const result = await integrations.attio.getNote({
  note_id: "note_01abc123def456",
});
```

## Input

```typescript
{
  note_id: string;
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
