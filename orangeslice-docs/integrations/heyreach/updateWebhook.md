# updateWebhook

Update an existing webhook.

```typescript
// Update webhook URL
await integrations.heyreach.updateWebhook(12345, {
  webhookUrl: "https://newurl.com/webhooks/heyreach"
});

// Disable a webhook
await integrations.heyreach.updateWebhook(12345, {
  isActive: false
});

// Change event type and campaigns
await integrations.heyreach.updateWebhook(12345, {
  eventType: "MESSAGE_REPLY_RECEIVED",
  campaignIds: [111, 222, 333]
});
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `webhookId` | `number` | Yes | The webhook ID |
| `input` | `object` | Yes | Update fields (see below) |

```typescript
// Update input
{
  webhookName?: string;   // New name
  webhookUrl?: string;    // New URL
  eventType?:             // New event type
    | "CONNECTION_REQUEST_SENT"
    | "CONNECTION_REQUEST_ACCEPTED"
    | "MESSAGE_SENT"
    | "MESSAGE_REPLY_RECEIVED"
    | "INMAIL_SENT"
    | "INMAIL_REPLY_RECEIVED"
    | "FOLLOW_SENT"
    | "LIKED_POST"
    | "VIEWED_PROFILE"
    | "CAMPAIGN_COMPLETED"
    | "LEAD_TAG_UPDATED";
  campaignIds?: number[]; // New campaign filter
  isActive?: boolean;     // Enable/disable webhook
}
```

## Output

```typescript
any  // Updated webhook data
```

