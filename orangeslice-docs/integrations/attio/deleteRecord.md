# deleteRecord

Delete a record.

```typescript
await integrations.attio.deleteRecord({
  object: "people",
  record_id: "rec_01abc123def456",
});
```

## Input

```typescript
{
  object: string;
  record_id: string;
}
```

## Output

`void` - No return value on success.
