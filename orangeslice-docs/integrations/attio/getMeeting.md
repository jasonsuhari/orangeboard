# getMeeting

Get a meeting by ID.

```typescript
const result = await integrations.attio.getMeeting({
  meeting_id: "mtg_01abc123def456",
});
```

## Input

```typescript
{
  meeting_id: string;
}
```

## Output

```typescript
{
  data: {
    id: { workspace_id: string; meeting_id: string };
    title: string | null;
    description: string | null;
    is_all_day: boolean;
    start: { datetime?: string; date?: string; timezone?: string | null };
    end: { datetime?: string; date?: string; timezone?: string | null };
    participants: Array<{
      status: "accepted" | "tentative" | "declined" | "pending";
      is_organizer: boolean;
      email_address: string | null;
    }>;
    linked_records: Array<{ object_slug: string; object_id: string; record_id: string }>;
    created_at: string;
  };
}
```
