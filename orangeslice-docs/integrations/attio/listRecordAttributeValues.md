# listRecordAttributeValues

Get all values (including historic) for a specific attribute on a record.

```typescript
const result = await integrations.attio.listRecordAttributeValues({
  object: "people",
  record_id: "rec_01abc123def456",
  attribute: "job_title",
  show_historic: true,
  limit: 50,
});
```

## Input

```typescript
{
  object: string;
  record_id: string;
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
