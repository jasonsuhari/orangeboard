# addLeadsToList

Add leads to a list. Returns the number of leads added.

```typescript
const addedCount = await integrations.heyreach.addLeadsToList({
  listId: 12345,
  leads: [
    {
      firstName: "John",
      lastName: "Doe",
      profileUrl: "https://linkedin.com/in/johndoe",
      companyName: "Acme Inc",
      position: "CEO",
      emailAddress: "john@acme.com"
    },
    {
      firstName: "Jane",
      lastName: "Smith",
      profileUrl: "https://linkedin.com/in/janesmith",
      companyName: "Tech Corp"
    }
  ]
});

console.log(`Added ${addedCount} leads to list`);
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
number  // Number of leads successfully added
```

