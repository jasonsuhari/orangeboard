# listRecords

List/query records with filters and sorting. Works for people, companies, deals, and custom objects.

```typescript
// Simple list
const result = await integrations.attio.listRecords({
  object: "people",
  limit: 20,
  offset: 0,
  sorts: [{ attribute: "created_at", direction: "desc" }],
});

// With filter
const filtered = await integrations.attio.listRecords({
  object: "companies",
  limit: 10,
  filter: {
    name: { "$contains": "Acme" },
  },
  sorts: [{ attribute: "name", direction: "asc" }],
});
```

## Input

```typescript
{
  object: string;
  limit?: number;
  offset?: number;
  sorts?: Array<{
    attribute: string;
    field?: string;
    direction: "asc" | "desc";
  }>;
  filter?: Record<string, any>;
}
```

`object` is extracted as a path parameter. The remaining fields are sent as the POST query body.

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
