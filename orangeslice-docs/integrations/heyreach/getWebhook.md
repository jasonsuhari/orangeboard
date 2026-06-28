# getWebhook

Get a webhook by its ID.

```typescript
const webhook = await integrations.heyreach.getWebhook(12345);

console.log(webhook.webhookName, webhook.eventType);
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `webhookId` | `number` | Yes | The webhook ID |

## Output

```typescript
any  // Webhook data
```

