# getEntry

Get a list entry by ID.

```typescript
const result = await integrations.attio.getEntry({
  list_id: "list_01abc123def456",
  entry_id: "entry_01xyz789ghi012",
});
```

## Input

```typescript
{
  list_id: string;
  entry_id: string;
}
```

## Output

```typescript
{
  data: {
    id: { workspace_id: string; entry_id: string; list_id: string };
    parent_record_id: string;
    parent_object: string;
    created_at: string;
    entry_values: Record<string, Array<{ active_from?: string; active_until?: string | null; attribute_type?: string; [key: string]: any }>>;
  };
}
```
