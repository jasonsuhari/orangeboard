# queryMore

Fetch the next page of results from a paginated SOQL query.

```typescript
// Initial query
const firstPage = await integrations.salesforce.query(
  "SELECT Id, Name FROM Account"
);

console.log(`Got ${firstPage.records.length} of ${firstPage.totalSize} records`);

// Fetch remaining pages
let allRecords = [...firstPage.records];
let nextUrl = firstPage.nextRecordsUrl;

while (nextUrl) {
  const nextPage = await integrations.salesforce.queryMore(nextUrl);
  allRecords = [...allRecords, ...nextPage.records];
  nextUrl = nextPage.nextRecordsUrl;
}

console.log(`Total records fetched: ${allRecords.length}`);
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `nextRecordsUrl` | `string` | Yes | The URL from a previous query's `nextRecordsUrl` field |

## Output

```typescript
{
  totalSize: number;       // Total number of records matching the query
  done: boolean;           // Whether all records have been returned
  records: T[];            // Array of records for this page
  nextRecordsUrl?: string; // URL to fetch next page (if done is false)
}
```

## Notes

- The default batch size is 2000 records per page
- The `nextRecordsUrl` is typically a path like `/services/data/v59.0/query/01gxx...`
- Query cursors expire after 15 minutes of inactivity

