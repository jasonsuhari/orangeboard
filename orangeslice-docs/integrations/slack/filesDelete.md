# filesDelete

Delete a file.

```typescript
const result = await integrations.slack.filesDelete("F1234567890");
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | `string` | Yes | File ID to delete |

## Output

```typescript
{
  ok: boolean;
}
```

## Notes

- You can only delete files uploaded by your app
- Workspace admins may have additional deletion permissions
