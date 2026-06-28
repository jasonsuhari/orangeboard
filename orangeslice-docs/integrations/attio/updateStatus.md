# updateStatus

Update a status.

```typescript
const result = await integrations.attio.updateStatus({
  target: "objects",
  target_identifier: "deals",
  attribute: "stage",
  status: "negotiation-status-id",
  data: {
    title: "In Negotiation",
    celebration_enabled: true,
  },
});
```

## Input

```typescript
{
  target: "objects" | "lists";
  target_identifier: string;
  attribute: string;
  status: string;
  data: {
    title?: string;
    is_archived?: boolean;
    celebration_enabled?: boolean;
    target_time_in_status?: string | null;
  };
}
```

## Output

```typescript
{
  data: {
    id: { status_id: string };
    title: string;
    is_archived: boolean;
    celebration_enabled: boolean;
    target_time_in_status: string | null;
  };
}
```
