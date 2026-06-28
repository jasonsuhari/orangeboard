# addLeadsToListV2

Add leads to a list with detailed response about added, updated, and failed leads.

```typescript
const result = await integrations.heyreach.addLeadsToListV2({
  listId: 12345,
  leads: [
    {
      firstName: "John",
      lastName: "Doe",
      profileUrl: "https://linkedin.com/in/johndoe",
      companyName: "Acme Inc",
      position: "CEO"
    },
    {
      firstName: "Jane",
      lastName: "Smith",
      profileUrl: "https://linkedin.com/in/janesmith"
    }
  ]
});

console.log(`Added: ${result.addedLeadsCount}`);
console.log(`Updated: ${result.updatedLeadsCount}`);
console.log(`Failed: ${result.failedLeadsCount}`);
```

## Input

```typescript
{
  listId: number;  // List ID to add leads to
  leads: Array<{
    firstName?: string;
    lastName?: string;
    location?: string;
    summary?: string;
    companyName?: string;
    position?: string;
    about?: string;
    emailAddress?: string;
    customUserFields?: Array<{ name: string; value: string }>;
    profileUrl?: string;  // LinkedIn profile URL
  }>;
}
```

## Output

```typescript
{
  addedLeadsCount?: number;    // Number of new leads added
  updatedLeadsCount?: number;  // Number of existing leads updated
  failedLeadsCount?: number;   // Number of leads that failed
}
```

