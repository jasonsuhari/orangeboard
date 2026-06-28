# createAttribute

Create an attribute on an object or list.

```typescript
const result = await integrations.attio.createAttribute({
  target: "objects",
  target_identifier: "companies",
  data: {
    title: "Annual Revenue",
    description: "Company annual revenue in USD",
    api_slug: "annual_revenue",
    type: "number",
    is_required: false,
    is_unique: false,
    is_multiselect: false,
    config: { currency: "USD" },
  },
});
```

## Input

```typescript
{
  target: "objects" | "lists";
  target_identifier: string;
  data: {
    title: string;
    description: string | null;
    api_slug: string;
    type: string;
    is_required: boolean;
    is_unique: boolean;
    is_multiselect: boolean;
    config: Record<string, any>;
    default_value?: any;
    relationship?: Record<string, any>;
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
