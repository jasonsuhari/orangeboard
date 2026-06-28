# createSelectOption

Add a select option to an attribute.

```typescript
const result = await integrations.attio.createSelectOption({
  target: "objects",
  target_identifier: "companies",
  attribute: "industry",
  data: { title: "Financial Services" },
});
```

## Input

```typescript
{
  target: "objects" | "lists";
  target_identifier: string;
  attribute: string;
  data: {
    title: string;
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
