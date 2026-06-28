# createWebhook

Create a new webhook to receive events.

```typescript
const webhook = await integrations.heyreach.createWebhook({
  webhookName: "Connection Accepted",
  webhookUrl: "https://myapp.com/webhooks/heyreach",
  eventType: "CONNECTION_REQUEST_ACCEPTED",
  campaignIds: [12345, 67890]  // Optional: filter to specific campaigns
});
```

## Input

```typescript
{
  webhookName: string;    // Name for the webhook
  webhookUrl: string;     // URL to receive webhook events
  eventType:              // Event type to listen for
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
  campaignIds?: number[]; // Optional: filter to specific campaigns
}
```

## Output

```typescript
any  // Created webhook data
```

