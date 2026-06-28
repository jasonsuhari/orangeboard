# updateEntry

Update a list entry. For multiselect attributes, new values are appended.

```typescript
// Attribute slugs in entry_values depend on your list's configuration
const result = await integrations.attio.updateEntry({
  list_id: "list_01abc123def456",
  entry_id: "entry_01xyz789ghi012",
  data: {
    entry_values: {
      // Use your list's attribute api_slugs (e.g. "stage", "tags", etc.)
    },
  },
});
```

## Input

```typescript
{
  list_id: string;
  entry_id: string;
  data: {
    entry_values: Record<string, any>;
  };
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
