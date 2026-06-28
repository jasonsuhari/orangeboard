# listLists

List all lists in the workspace.

```typescript
const result = await integrations.attio.listLists();
```

## Input

No input parameters.

## Output

```typescript
{
  data: Array<{
    id: { list_id: string; workspace_id: string };
    api_slug: string;
    name: string;
    parent_object: string[];
    workspace_access: string;
    created_by_actor: { type: string; id: string | null };
    created_at: string;
  }>;
  next_cursor?: string | null;
}
```
