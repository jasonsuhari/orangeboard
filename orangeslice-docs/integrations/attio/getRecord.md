# getRecord

Get a single record by ID.

```typescript
const result = await integrations.attio.getRecord({
  object: "people",
  record_id: "rec_01abc123def456",
});
```

## Input

```typescript
{
  object: string;
  record_id: string;
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
