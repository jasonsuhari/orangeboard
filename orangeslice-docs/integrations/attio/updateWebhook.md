# updateWebhook

Update a webhook.

```typescript
const result = await integrations.attio.updateWebhook({
  webhook_id: "wh_01abc234def567",
  data: {
    target_url: "https://example.com/webhooks/attio/v2",
  },
});
```

## Input

```typescript
{
  webhook_id: string;
  data: {
    target_url?: string;
    subscriptions?: Array<{
      event_type: string;
      filter: Record<string, any> | null;
    }>;
  };
}
```

## Output

```typescript
{
  data: {
    id: { webhook_id: string };
    target_url: string;
    subscriptions: Array<{ event_type: string; filter: Record<string, any> | null }>;
    status: string;
    created_at: string;
  };
}
```
