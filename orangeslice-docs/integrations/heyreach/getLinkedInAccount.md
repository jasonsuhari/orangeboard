# getLinkedInAccount

Get a LinkedIn account by its ID.

```typescript
const account = await integrations.heyreach.getLinkedInAccount("67890");

console.log(`${account.firstName} ${account.lastName}`);
console.log(`Active: ${account.isActive}, Auth Valid: ${account.authIsValid}`);
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | `string` | Yes | LinkedIn account ID |

## Output

```typescript
{
  id?: string;
  emailAddress?: string;
  firstName?: string;
  lastName?: string;
  isActive?: string;
  activeCampaigns?: string;
  authIsValid?: string;
  isValidNavigator?: string;
  isValidRecruiter?: string;
}
```

