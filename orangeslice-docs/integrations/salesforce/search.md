# search

Execute a SOSL (Salesforce Object Search Language) search across multiple objects.

```typescript
// Search for "Acme" across all searchable objects
const result = await integrations.salesforce.search(
  "FIND {Acme} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name, Email)"
);

// Search in specific fields
const result = await integrations.salesforce.search(
  "FIND {john@example.com} IN EMAIL FIELDS RETURNING Contact(Id, Name, Email)"
);

// Wildcard search
const result = await integrations.salesforce.search(
  "FIND {Acme*} IN NAME FIELDS RETURNING Account(Id, Name, Industry)"
);

// Access results
for (const record of result.searchRecords) {
  console.log(`${record.attributes.type}: ${record.Id}`);
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sosl` | `string` | Yes | The SOSL search string |

## Output

```typescript
{
  searchRecords: Array<{
    Id: string;
    attributes: {
      type: string;  // SObject type (e.g., "Account", "Contact")
      url: string;   // API URL for the record
    };
    [key: string]: unknown;  // Fields specified in RETURNING clause
  }>;
}
```

## SOSL Syntax

```
FIND {searchTerm}
  [IN searchGroup]
  [RETURNING objectsAndFields]
  [WITH options]
  [LIMIT n]
```

### Search Groups

| Group | Description |
|-------|-------------|
| `ALL FIELDS` | Search all searchable fields |
| `NAME FIELDS` | Search name fields only |
| `EMAIL FIELDS` | Search email fields only |
| `PHONE FIELDS` | Search phone fields only |
| `SIDEBAR FIELDS` | Search sidebar fields |

## Examples

```sql
-- Search with field filters in RETURNING clause
FIND {Cloud} RETURNING Account(Id, Name WHERE Industry = 'Technology')

-- Limit results per object
FIND {Test} RETURNING Account(Id, Name LIMIT 5), Contact(Id, Name LIMIT 10)

-- Order results
FIND {Smith} RETURNING Contact(Id, Name, Email ORDER BY Name ASC)
```

