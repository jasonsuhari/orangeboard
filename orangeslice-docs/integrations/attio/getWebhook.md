# getWebhook

Get a webhook by ID.

```typescript
const result = await integrations.attio.getWebhook({
  webhook_id: "wh_01abc234def567",
});
```

## Input

```typescript
{
  webhook_id: string;
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
