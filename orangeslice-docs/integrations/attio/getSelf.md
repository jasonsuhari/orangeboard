# getSelf

Identify the current access token, workspace, and permissions.

```typescript
const result = await integrations.attio.getSelf();
```

## Input

No input required.

## Output

```typescript
{
  active: boolean;
  scope?: string;
  client_id?: string;
  token_type?: string;
  workspace_id?: string;
  workspace_name?: string;
  workspace_slug?: string;
  workspace_logo_url?: string | null;
  authorized_by_workspace_member_id?: string;
}
```
