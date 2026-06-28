# deleteLeadsFromList

Delete leads from a list by their LinkedIn member IDs.

```typescript
await integrations.heyreach.deleteLeadsFromList({
  listId: 12345,
  leadMemberIds: ["ACoAABxxxxxx", "ACoAAByyyyyy"]
});
```

## Input

```typescript
{
  listId: number;           // List ID
  leadMemberIds: string[];  // Array of LinkedIn member IDs to delete
}
```

## Output

```typescript
void  // Returns nothing on success
```

