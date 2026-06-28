# retrieveRecords

Retrieve multiple records by their IDs in a single API call.

```typescript
// Retrieve multiple Contacts
const contacts = await integrations.salesforce.retrieveRecords({
  sobject: "Contact",
  ids: [
    "003xx000004TmiQAAS",
    "003xx000004TmiRAAS",
    "003xx000004TmiSAAS"
  ],
  fields: ["Id", "Name", "Email", "Phone"]
});

for (const contact of contacts) {
  console.log(`${contact.Name}: ${contact.Email}`);
}

// With type parameter
interface MyAccount {
  Id: string;
  Name: string;
  Industry: string;
  Website: string;
}
const accounts = await integrations.salesforce.retrieveRecords<MyAccount>({
  sobject: "Account",
  ids: ["001xx000003DGbYAAW", "001xx000003DGbZAAW"],
  fields: ["Id", "Name", "Industry", "Website"]
});
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | `CollectionRetrieveInput` | Yes | The retrieval parameters |

### CollectionRetrieveInput

```typescript
{
  sobject: string;    // The SObject API name
  ids: string[];      // Record IDs to retrieve
  fields: string[];   // Fields to return
}
```

## Output

```typescript
Array<{
  Id: string;
  attributes?: {
    type: string;
    url: string;
  };
  [fieldName: string]: unknown;
}>
```

## Notes

- All IDs must be for the same SObject type
- Maximum 2000 IDs per request
- Non-existent IDs return null in the array (position preserved)
- More efficient than multiple `getRecord` calls
- The `fields` parameter is required - specify exactly which fields to return

