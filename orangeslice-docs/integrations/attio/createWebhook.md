# createWebhook

Create a new webhook subscription.

```typescript
const result = await integrations.attio.createWebhook({
  data: {
    target_url: "https://example.com/webhooks/attio",
    subscriptions: [
      { event_type: "record.created", filter: { object: "companies" } },
      { event_type: "record.updated", filter: null },
    ],
  },
});
```

## Input

```typescript
{
  data: {
    target_url: string;
    subscriptions: Array<{
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
