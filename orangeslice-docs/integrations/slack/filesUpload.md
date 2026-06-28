# filesUpload

Upload a file to Slack.

```typescript
// Upload text content
const result = await integrations.slack.filesUpload({
  channels: "C1234567890",
  content: "Hello, this is the file content!",
  filename: "message.txt",
  title: "My Text File"
});

// Upload to multiple channels
const result = await integrations.slack.filesUpload({
  channels: "C1234567890,C0987654321",
  content: JSON.stringify({ data: "value" }, null, 2),
  filename: "data.json",
  filetype: "json"
});

// Upload as thread reply
const result = await integrations.slack.filesUpload({
  channels: "C1234567890",
  content: "Report content...",
  filename: "report.txt",
  thread_ts: "1234567890.123456",
  initial_comment: "Here's the report you requested"
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channels` | `string` | No | Comma-separated channel IDs to share to |
| `content` | `string` | No | File content (for text files) |
| `filename` | `string` | No | Filename |
| `filetype` | `string` | No | File type identifier |
| `initial_comment` | `string` | No | Message to post with the file |
| `thread_ts` | `string` | No | Thread to upload to |
| `title` | `string` | No | Title of file |

## Output

```typescript
{
  ok: boolean;
  file?: SlackFile;
}
```

## Notes

- For binary files, you'll need to use the file upload URL flow
- `content` is for text-based files
