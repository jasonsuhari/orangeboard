# filesList

List files in the workspace.

```typescript
// List recent files
const result = await integrations.slack.filesList({
  count: 50
});

// Filter by channel
const result = await integrations.slack.filesList({
  channel: "C1234567890"
});

// Filter by user
const result = await integrations.slack.filesList({
  user: "U1234567890"
});

// Filter by type
const result = await integrations.slack.filesList({
  types: "images,pdfs"
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | `string` | No | Pagination cursor |
| `channel` | `string` | No | Filter by channel |
| `user` | `string` | No | Filter by user who uploaded |
| `types` | `string` | No | Filter by file type: `all`, `spaces`, `snippets`, `images`, `gdocs`, `zips`, `pdfs` |
| `ts_from` | `string` | No | Filter from timestamp |
| `ts_to` | `string` | No | Filter to timestamp |
| `count` | `number` | No | Results per page |
| `page` | `number` | No | Page number |

## Output

```typescript
{
  ok: boolean;
  files?: SlackFile[];
  paging?: {
    count?: number;
    total?: number;
    page?: number;
    pages?: number;
  };
}
```
