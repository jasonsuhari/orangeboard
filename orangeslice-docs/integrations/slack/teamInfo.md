# teamInfo

Get information about the workspace.

```typescript
const result = await integrations.slack.teamInfo();

console.log(result.team?.name);
console.log(result.team?.domain);  // workspace-name.slack.com
console.log(result.team?.icon?.image_132);
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `team` | `string` | No | Team ID (for Enterprise Grid) |

## Output

```typescript
{
  ok: boolean;
  team?: SlackTeam;
}

// SlackTeam structure:
{
  id?: string;
  name?: string;
  domain?: string;
  email_domain?: string;
  enterprise_id?: string;
  enterprise_name?: string;
  icon?: {
    image_34?: string;
    image_44?: string;
    image_68?: string;
    image_88?: string;
    image_102?: string;
    image_132?: string;
    image_default?: boolean;
  };
}
```
