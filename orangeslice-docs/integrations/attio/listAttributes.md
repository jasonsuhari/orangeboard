# listAttributes

List attributes on an object or list. Pass either `object` or `list` to specify the target.

```typescript
const result = await integrations.attio.listAttributes({ object: "companies", limit: 50 });
```

## Input

```typescript
{
  object?: string;
  list?: string;
  limit?: number;
  offset?: number;
  show_archived?: boolean;
}
```

## Output

```typescript
{
  data: Array<{
    id: { attribute_id: string; object_id?: string; list_id?: string };
    title: string;
    api_slug: string;
    type: string;
    is_required: boolean;
    is_unique: boolean;
    is_multiselect: boolean;
    is_writable: boolean;
    created_at: string;
  }>;
  next_cursor?: string | null;
}
```
