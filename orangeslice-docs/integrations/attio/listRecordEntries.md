# listRecordEntries

List all list entries associated with a record.

```typescript
const result = await integrations.attio.listRecordEntries({
  object: "people",
  record_id: "rec_01abc123def456",
  limit: 20,
});
```

## Input

```typescript
{
  object: string;
  record_id: string;
  limit?: number;
  offset?: number;
}
```

## Output

```typescript
{
  data: Array<{
    id: { workspace_id: string; entry_id: string; list_id: string };
    parent_record_id: string;
    parent_object: string;
    created_at: string;
    entry_values: Record<string, AttioAttributeValue[]>;
  }>;
  next_cursor?: string | null;
}
```
