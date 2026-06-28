# updateRecord

Update a record. For multiselect attributes, new values are appended (existing values kept).

```typescript
const result = await integrations.attio.updateRecord({
  object: "people",
  record_id: "rec_01abc123def456",
  data: {
    values: {
      job_title: "Senior Engineer",
      tags: ["vip"],
    },
  },
});
```

## Input

```typescript
{
  object: string;
  record_id: string;
  data: {
    values: Record<string, any>;
  };
}
```

## Output

```typescript
{
  data: {
    id: { workspace_id: string; object_id: string; record_id: string };
    created_at: string;
    web_url: string;
    values: Record<string, Array<{ active_from?: string; active_until?: string | null; attribute_type?: string; [key: string]: any }>>;
  };
}
```
