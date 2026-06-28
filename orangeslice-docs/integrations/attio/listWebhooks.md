# listWebhooks

List all webhooks.

```typescript
const result = await integrations.attio.listWebhooks({ limit: 20 });
```

## Input

```typescript
{
  limit?: number;
  offset?: number;
}
```

## Output

```typescript
{
  data: Array<{
    id: { webhook_id: string };
    target_url: string;
    subscriptions: Array<{ event_type: string; filter: Record<string, any> | null }>;
    status: string;
    created_at: string;
  }>;
  next_cursor?: string | null;
}
```
