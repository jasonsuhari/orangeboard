# createStatus

Add a status to a status attribute.

```typescript
const result = await integrations.attio.createStatus({
  target: "objects",
  target_identifier: "deals",
  attribute: "stage",
  data: {
    title: "Negotiation",
    celebration_enabled: false,
    target_time_in_status: "P0Y0M7DT0H0M0S",
  },
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
    celebration_enabled?: boolean;
    target_time_in_status?: string | null; // ISO-8601 duration, e.g. "P0Y0M1DT0H0M0S"
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
