# overwriteRecord

Overwrite a record. For multiselect attributes, all values are replaced with the supplied values.

```typescript
const result = await integrations.attio.overwriteRecord({
  object: "companies",
  record_id: "rec_01xyz789ghi012",
  data: {
    values: {
      categories: ["saas", "enterprise"],
      description: "Cloud infrastructure provider",
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
