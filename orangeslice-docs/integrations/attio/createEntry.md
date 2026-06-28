# createEntry

Add a record to a list as a new entry.

```typescript
// Attribute slugs in entry_values depend on your list's configuration
const result = await integrations.attio.createEntry({
  list_id: "list_01abc123def456",
  data: {
    parent_record_id: "rec_01abc123def456",
    parent_object: "companies",
    entry_values: {
      // Use your list's attribute api_slugs (e.g. "stage", "notes", etc.)
    },
  },
});
```

## Input

```typescript
{
  list_id: string;
  data: {
    parent_record_id: string;
    parent_object: string;
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
