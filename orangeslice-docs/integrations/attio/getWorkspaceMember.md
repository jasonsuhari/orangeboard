# getWorkspaceMember

Get a workspace member by ID.

```typescript
const result = await integrations.attio.getWorkspaceMember({
  workspace_member_id: "wsm_01abc234def567",
});
```

## Input

```typescript
{
  workspace_member_id: string;
}
```

## Output

```typescript
{
  data: {
    id: { workspace_member_id: string };
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    email_address: string;
    created_at: string;
  };
}
```
