# deleteEntry

Delete a list entry.

```typescript
await integrations.attio.deleteEntry({
  list_id: "list_01abc123def456",
  entry_id: "entry_01xyz789ghi012",
});
```

## Input

```typescript
{
  list_id: string;
  entry_id: string;
}
```

## Output

`void` - No return value on success.
