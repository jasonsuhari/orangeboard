# filesInfo

Get information about a file.

```typescript
const result = await integrations.slack.filesInfo({
  file: "F1234567890"
});

const file = result.file;
console.log(file?.name);
console.log(file?.mimetype);
console.log(file?.url_private);
console.log(file?.size);
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | `string` | Yes | File ID |
| `count` | `number` | No | Number of comments to return |
| `page` | `number` | No | Page of comments |
| `cursor` | `string` | No | Pagination cursor |
| `limit` | `number` | No | Max results |

## Output

```typescript
{
  ok: boolean;
  file?: SlackFile;
  comments?: unknown[];
}

// SlackFile structure:
{
  id?: string;
  name?: string;
  title?: string;
  mimetype?: string;
  filetype?: string;
  size?: number;
  url_private?: string;
  url_private_download?: string;
  permalink?: string;
  created?: number;
  user?: string;
  // ... more fields
}
```
