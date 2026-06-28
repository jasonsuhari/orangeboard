# listMeetings

List meetings with filters (linked records, participants, date range).

```typescript
// List upcoming meetings
const result = await integrations.attio.listMeetings({
  sort: "start_asc",
  ends_from: "2025-03-01T00:00:00Z",
  limit: 25,
});

// Filter by linked record
const companyMeetings = await integrations.attio.listMeetings({
  linked_object: "companies",
  linked_record_id: "rec_01abc123def456",
  sort: "start_desc",
});

// Filter by participant
const myMeetings = await integrations.attio.listMeetings({
  participants: "alice@example.com",
});
```

## Input

```typescript
{
  limit?: number;
  cursor?: string;
  linked_object?: string;
  linked_record_id?: string;
  participants?: string;
  sort?: "start_asc" | "start_desc";
  ends_from?: string;
  starts_before?: string;
  timezone?: string;
}
```

## Output

```typescript
{
  data: Array<{
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
  }>;
  next_cursor?: string | null;
}
```
