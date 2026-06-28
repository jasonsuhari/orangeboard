# getList

Get a list by ID.

```typescript
const result = await integrations.attio.getList({
  list_id: "lst_01abc123def456",
});
```

## Input

```typescript
{
  list_id: string;
}
```

## Output

```typescript
{
  data: {
    id: { list_id: string; workspace_id: string };
    api_slug: string;
    name: string;
    parent_object: string[];
    workspace_access: string;
    created_by_actor: { type: string; id: string | null };
    created_at: string;
  };
}
```
