# listWorkspaceMembers

List all workspace members.

```typescript
const result = await integrations.attio.listWorkspaceMembers();
```

## Input

No input parameters.

## Output

```typescript
{
  data: Array<{
    id: { workspace_member_id: string };
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    email_address: string;
    created_at: string;
  }>;
  next_cursor?: string | null;
}
```
