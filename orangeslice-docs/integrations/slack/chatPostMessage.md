# chatPostMessage

Send a message to a Slack channel.

```typescript
// Simple text message
const result = await integrations.slack.chatPostMessage({
   channel: "C1234567890", // Channel ID
   text: "Hello from Orange Slice!"
});

// Message with blocks (rich formatting)
const result = await integrations.slack.chatPostMessage({
   channel: "#general", // Can use channel name with #
   text: "Fallback text",
   blocks: [
      {
         type: "section",
         text: { type: "mrkdwn", text: "*Bold* and _italic_ text" }
      },
      {
         type: "divider"
      },
      {
         type: "section",
         text: { type: "mrkdwn", text: "Click the button:" },
         accessory: {
            type: "button",
            text: { type: "plain_text", text: "Click Me" },
            action_id: "button_click"
         }
      }
   ]
});

// Reply in a thread
const result = await integrations.slack.chatPostMessage({
   channel: "C1234567890",
   text: "This is a thread reply",
   thread_ts: "1234567890.123456" // Parent message timestamp
});
```

## Input

| Parameter         | Type                | Required | Description                                            |
| ----------------- | ------------------- | -------- | ------------------------------------------------------ |
| `channel`         | `string`            | Yes      | Channel ID or name (e.g., `C1234567890` or `#general`) |
| `text`            | `string`            | No\*     | Message text (\*required if no blocks)                 |
| `blocks`          | `SlackBlock[]`      | No       | Rich layout blocks                                     |
| `attachments`     | `SlackAttachment[]` | No       | Legacy attachments                                     |
| `thread_ts`       | `string`            | No       | Thread parent timestamp (for replies)                  |
| `reply_broadcast` | `boolean`           | No       | Also post to channel when replying to thread           |
| `unfurl_links`    | `boolean`           | No       | Enable URL previews                                    |
| `unfurl_media`    | `boolean`           | No       | Enable media previews                                  |
| `mrkdwn`          | `boolean`           | No       | Enable markdown parsing (default: true)                |

## Output

```typescript
{
  ok: boolean;
  channel?: string;    // Channel ID where posted
  ts?: string;         // Message timestamp (use as message ID)
  message?: SlackMessage;
}
```

## Notes

- Use `ts` from the response to update or delete the message later
- Channel names with `#` only work for public channels the bot is in
- For private channels, always use the channel ID
