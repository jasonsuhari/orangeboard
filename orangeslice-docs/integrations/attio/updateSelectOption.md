# updateSelectOption

Update a select option.

```typescript
const result = await integrations.attio.updateSelectOption({
  target: "objects",
  target_identifier: "companies",
  attribute: "industry",
  option: "fin-services-opt-id",
  data: { title: "Finance & Banking" },
});
```

## Input

```typescript
{
  target: "objects" | "lists";
  target_identifier: string;
  attribute: string;
  option: string;
  data: {
    title?: string;
    is_archived?: boolean;
  };
}
```

## Output

```typescript
{
  data: {
    id: { option_id: string };
    title: string;
    is_archived: boolean;
  };
}
```
