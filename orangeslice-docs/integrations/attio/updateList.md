# updateList

Update a list.

```typescript
const result = await integrations.attio.updateList({
  list_id: "lst_01abc123def456",
  data: {
    name: "Enterprise Targets",
    workspace_access: "read-and-write",
    workspace_member_access: [
      { workspace_member_id: "wm_01abc123", level: "full-access" },
    ],
  },
});
```

## Input

```typescript
{
  list_id: string;
  data: {
    name?: string;
    api_slug?: string;
    workspace_access?: string | null;
    workspace_member_access?: Array<{
      workspace_member_id: string;
      level: "full-access" | "read-and-write" | "read-only";
    }>;
  };
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
