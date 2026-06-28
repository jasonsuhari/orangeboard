# createList

Create a new list.

```typescript
const result = await integrations.attio.createList({
  data: {
    name: "Enterprise Prospects",
    api_slug: "enterprise_prospects",
    parent_object: "companies",
    workspace_access: "full-access",
    workspace_member_access: [
      { workspace_member_id: "wm_01abc123", level: "full-access" },
      { workspace_member_id: "wm_01def456", level: "read-only" },
    ],
  },
});
```

## Input

```typescript
{
  data: {
    name: string;
    api_slug: string;
    parent_object: string;
    workspace_access: string | null;
    workspace_member_access: Array<{
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
