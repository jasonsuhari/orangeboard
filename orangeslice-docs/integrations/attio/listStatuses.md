# listStatuses

List statuses for a status attribute.

```typescript
const result = await integrations.attio.listStatuses({
  target: "objects",
  target_identifier: "deals",
  attribute: "stage",
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
    id: { status_id: string };
    title: string;
    is_archived: boolean;
    celebration_enabled: boolean;
    target_time_in_status: string | null;
  }>;
  next_cursor?: string | null;
}
```
