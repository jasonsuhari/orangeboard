# searchRecords

Fuzzy search across records by text query.

```typescript
const result = await integrations.attio.searchRecords({
  query: "Jane Smith",
  objects: ["people", "companies"],
  request_as: { type: "workspace" },
  limit: 10,
});
```

## Input

```typescript
{
  query: string;
  objects: string[];
  request_as:
    | { type: "workspace" }
    | { type: "workspace-member"; workspace_member_id: string }
    | { type: "workspace-member"; email_address: string };
  limit?: number;
}
```

## Output

```typescript
{
  data: Array<{
    id: { workspace_id: string; object_id: string; record_id: string };
    created_at: string;
    web_url: string;
    values: Record<string, Array<{ active_from?: string; active_until?: string | null; attribute_type?: string; [key: string]: any }>>;
  }>;
  next_cursor?: string | null;
}
```
