# query

Execute a SOQL (Salesforce Object Query Language) query to retrieve records.

```typescript
// Simple query
const result = await integrations.salesforce.query(
  "SELECT Id, Name, Email FROM Contact WHERE AccountId = '001xx000003DGbYAAW'"
);

// With type parameter for typed results
interface MyContact {
  Id: string;
  Name: string;
  Email: string;
}
const result = await integrations.salesforce.query<MyContact>(
  "SELECT Id, Name, Email FROM Contact LIMIT 10"
);

// Include deleted/archived records
const result = await integrations.salesforce.query(
  "SELECT Id, Name FROM Account WHERE IsDeleted = true",
  { includeDeleted: true }
);

// Handle pagination
const result = await integrations.salesforce.query("SELECT Id, Name FROM Lead");
if (!result.done && result.nextRecordsUrl) {
  const nextPage = await integrations.salesforce.queryMore(result.nextRecordsUrl);
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `soql` | `string` | Yes | The SOQL query string |
| `options` | `QueryOptions` | No | Query options |

### QueryOptions

```typescript
{
  includeDeleted?: boolean;  // Use queryAll to include deleted/archived records
}
```

## Output

```typescript
{
  totalSize: number;       // Total number of records matching the query
  done: boolean;           // Whether all records have been returned
  records: T[];            // Array of records
  nextRecordsUrl?: string; // URL to fetch next page (if done is false)
}
```

## Common SOQL Examples

```sql
-- Get all accounts
SELECT Id, Name, Industry FROM Account

-- Filter by field value
SELECT Id, Name FROM Contact WHERE Email LIKE '%@gmail.com'

-- Relationship queries
SELECT Id, Name, Account.Name FROM Contact WHERE Account.Industry = 'Technology'

-- Aggregate functions
SELECT COUNT(Id), Industry FROM Account GROUP BY Industry

-- Order and limit
SELECT Id, Name FROM Lead ORDER BY CreatedDate DESC LIMIT 100
```

