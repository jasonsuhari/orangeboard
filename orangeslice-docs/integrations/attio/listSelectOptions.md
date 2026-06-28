# listSelectOptions

List select options for an attribute.

```typescript
const result = await integrations.attio.listSelectOptions({
  target: "objects",
  target_identifier: "companies",
  attribute: "industry",
});
```

## Input

```typescript
{
  target: "objects" | "lists";
  target_identifier: string;
  attribute: string;
  show_archived?: boolean;
}
```

## Output

```typescript
{
  data: Array<{
    id: { option_id: string };
    title: string;
    is_archived: boolean;
  }>;
  next_cursor?: string | null;
}
```
