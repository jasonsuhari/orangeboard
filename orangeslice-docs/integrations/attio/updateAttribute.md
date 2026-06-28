# updateAttribute

Update an attribute.

```typescript
const result = await integrations.attio.updateAttribute({
  target: "objects",
  target_identifier: "companies",
  attribute: "annual_revenue",
  data: {
    title: "Annual Revenue (USD)",
    is_required: true,
  },
});
```

## Input

```typescript
{
  target: "objects" | "lists";
  target_identifier: string;
  attribute: string;
  data: {
    title?: string;
    description?: string | null;
    api_slug?: string;
    is_required?: boolean;
    is_unique?: boolean;
    is_archived?: boolean;
    default_value?: any;
    config?: Record<string, any>;
  };
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
