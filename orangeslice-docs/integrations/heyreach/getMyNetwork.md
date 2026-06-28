# getMyNetwork

Get the LinkedIn connections (network) for a sender account.

```typescript
const network = await integrations.heyreach.getMyNetwork({
  senderId: 67890,
  pageNumber: 1,
  pageSize: 100
});
```

## Input

```typescript
{
  senderId: number;     // LinkedIn account ID (required)
  pageNumber?: number;  // Page number for pagination
  pageSize?: number;    // Results per page
}
```

## Output

```typescript
any  // Network/connections data
```

