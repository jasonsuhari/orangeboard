# emojiList

List custom emoji in the workspace.

```typescript
const result = await integrations.slack.emojiList();

// result.emoji is an object mapping emoji names to URLs
for (const [name, url] of Object.entries(result.emoji || {})) {
  console.log(`:${name}: -> ${url}`);
}
```

## Output

```typescript
{
  ok: boolean;
  emoji?: Record<string, string>;  // name -> URL mapping
}
```

## Notes

- Only returns custom emoji, not built-in Slack emoji
- URL may be a Slack CDN URL or `alias:other_emoji` for aliases
