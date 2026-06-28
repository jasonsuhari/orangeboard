# listLinkedInAccounts

List all connected LinkedIn accounts.

```typescript
// Get all accounts
const { items, totalCount } = await integrations.heyreach.listLinkedInAccounts();

// Search for specific account
const { items } = await integrations.heyreach.listLinkedInAccounts({
  keyword: "john",
  limit: 10
});

for (const account of items || []) {
  console.log(`${account.firstName} ${account.lastName} - Active: ${account.isActive}`);
}
```

## Input

```typescript
{
  offset?: number;   // Pagination offset
  keyword?: string;  // Search by name or email
  limit?: number;    // Max results per page (must be between 1 and 100)
}
```

## Output

```typescript
{
  totalCount?: string;
  items?: Array<{
    id?: string;
    emailAddress?: string;
    firstName?: string;
    lastName?: string;
    isActive?: string;
    activeCampaigns?: string;
    authIsValid?: string;
    isValidNavigator?: string;
    isValidRecruiter?: string;
  }>;
}
```

