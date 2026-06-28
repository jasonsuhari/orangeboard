# listWebhooks

List all webhooks.

```typescript
// Get all webhooks
const webhooks = await integrations.heyreach.listWebhooks();

// With pagination
const webhooks = await integrations.heyreach.listWebhooks({
  limit: 50,
  offset: 0
});
```

## Input

```typescript
{
  offset?: number;  // Pagination offset
  limit?: number;   // Max results per page (must be between 1 and 100)
}
```

## Output

```typescript
any  // Array of webhook data
```

