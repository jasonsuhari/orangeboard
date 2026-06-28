# getAttribute

Get a single attribute by ID or slug.

```typescript
const result = await integrations.attio.getAttribute({
  target: "objects",
  target_identifier: "companies",
  attribute: "industry",
});
```

## Input

```typescript
{
  target: "objects" | "lists";
  target_identifier: string;
  attribute: string;
}
```

## Output

```typescript
{
  data: {
    id: { attribute_id: string; object_id?: string; list_id?: string };
    title: string;
    api_slug: string;
    type: string;
    is_required: boolean;
    is_unique: boolean;
    is_multiselect: boolean;
    is_writable: boolean;
    created_at: string;
  };
}
```
