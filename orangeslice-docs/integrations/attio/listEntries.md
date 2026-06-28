# listEntries

List entries in a list with filters and sorting.

```typescript
// Filter and sort attribute slugs depend on your list's configuration
const result = await integrations.attio.listEntries({
  list_id: "list_01abc123def456",
  limit: 25,
  offset: 0,
  sorts: [{ attribute: "created_at", direction: "desc" }],
});
```

## Input

```typescript
{
  list_id: string;
  limit?: number;
  offset?: number;
  filter?: Record<string, any>;
  sorts?: Array<{
    attribute: string;
    field?: string;
    direction: "asc" | "desc";
  }>;
}
```

## Output

```typescript
{
  data: Array<{
    id: { workspace_id: string; entry_id: string; list_id: string };
    parent_record_id: string;
    parent_object: string;
    created_at: string;
    entry_values: Record<string, Array<{ active_from?: string; active_until?: string | null; attribute_type?: string; [key: string]: any }>>;
  }>;
  next_cursor?: string | null;
}
```
