# describeSObject

Get detailed schema information for a specific SObject, including all fields and relationships.

```typescript
// Get Account schema
const accountDescribe = await integrations.salesforce.describeSObject("Account");

// List all fields
for (const field of accountDescribe.fields) {
   console.log(`${field.name} (${field.type}): ${field.label}`);
}

// Find required fields
const requiredFields = accountDescribe.fields.filter((f) => !f.nillable && f.createable && !f.defaultValue);

// Find picklist fields and their values
const picklists = accountDescribe.fields.filter((f) => f.type === "picklist");
for (const picklist of picklists) {
   console.log(`${picklist.name} options:`);
   for (const option of picklist.picklistValues || []) {
      if (option.active) {
         console.log(`  - ${option.value}: ${option.label}`);
      }
   }
}

// Find lookup/reference fields
const lookups = accountDescribe.fields.filter((f) => f.type === "reference");
for (const lookup of lookups) {
   console.log(`${lookup.name} -> ${lookup.referenceTo?.join(", ")}`);
}

// Get child relationships (e.g., Contacts related to Account)
for (const rel of accountDescribe.childRelationships) {
   console.log(`${rel.childSObject}.${rel.field} (${rel.relationshipName})`);
}
```

## Parameters

| Parameter | Type     | Required | Description          |
| --------- | -------- | -------- | -------------------- |
| `sobject` | `string` | Yes      | The SObject API name |

## Output

```typescript
{
  name: string;
  label: string;
  labelPlural: string;
  keyPrefix: string;
  custom: boolean;
  createable: boolean;
  updateable: boolean;
  deletable: boolean;
  queryable: boolean;
  searchable: boolean;
  fields: Array<{
    name: string;           // API name
    label: string;          // Display label
    type: string;           // Field type (string, picklist, reference, etc.)
    length?: number;        // Max length for text fields
    precision?: number;     // For number fields
    scale?: number;         // Decimal places
    nillable: boolean;      // Whether field can be null
    createable: boolean;    // Can be set on create
    updateable: boolean;    // Can be updated
    defaultValue?: unknown; // Default value
    picklistValues?: Array<{
      active: boolean;
      label: string;
      value: string;
      defaultValue: boolean;
    }>;
    referenceTo?: string[];     // Related object types
    relationshipName?: string;  // Relationship name for queries
    externalId?: boolean;       // Whether it's an external ID
    unique?: boolean;           // Whether values must be unique
    calculated?: boolean;       // Whether it's a formula field
    custom?: boolean;           // Whether it's a custom field
  }>;
  childRelationships: Array<{
    cascadeDelete: boolean;
    childSObject: string;      // Child object type
    field: string;             // Field on child that references this object
    relationshipName?: string; // Name for subqueries
    restrictedDelete?: boolean;
  }>;
  recordTypeInfos?: Array<{
    name: string;
    recordTypeId: string;
    active: boolean;
    available: boolean;
    defaultRecordTypeMapping: boolean;
  }>;
}
```

## Field Types

| Type            | Description            |
| --------------- | ---------------------- |
| `id`            | Salesforce ID          |
| `string`        | Text field             |
| `textarea`      | Long text              |
| `boolean`       | Checkbox               |
| `int`           | Integer                |
| `double`        | Decimal number         |
| `currency`      | Currency               |
| `percent`       | Percentage             |
| `date`          | Date only              |
| `datetime`      | Date and time          |
| `time`          | Time only              |
| `picklist`      | Single-select picklist |
| `multipicklist` | Multi-select picklist  |
| `reference`     | Lookup/Master-detail   |
| `email`         | Email address          |
| `phone`         | Phone number           |
| `url`           | URL                    |
