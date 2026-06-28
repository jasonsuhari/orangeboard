# listEntryAttributeValues

Get all values (including historic) for a specific attribute on a list entry.

```typescript
// The attribute slug depends on your list's configuration
const result = await integrations.attio.listEntryAttributeValues({
  list_id: "list_01abc123def456",
  entry_id: "entry_01xyz789ghi012",
  attribute: "stage", // use your list's attribute api_slug
  show_historic: true,
  limit: 50,
});
```

## Input

```typescript
{
  list_id: string;
  entry_id: string;
  attribute: string;
  show_historic?: boolean;
  limit?: number;
  offset?: number;
}
```

## Output

```typescript
{
  data: Array<any>;
  next_cursor?: string | null;
}
```
