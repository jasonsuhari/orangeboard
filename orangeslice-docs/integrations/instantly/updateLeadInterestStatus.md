# updateLeadInterestStatus

Update the interest status of a lead

**API:** `POST /api/v2/leads/update-interest-status`

## Input

### Request Body

```typescript
{
  lead_email: string; // The email of the lead to update the interest status of.
  interest_value: number | null; // Set this field to "null" to reset the lead value to "Lead". This is the same as moving the lead to the "Lead" status in the web app. Please check the `lt_interest_status` field for the list of possible values.
  campaign_id?: string; // The ID of the campaign to update the interest status of.
  ai_interest_value?: number; // The AI interest value to set for the lead.
  disable_auto_interest?: boolean; // Whether to disable the auto interest.
  list_id?: string; // The ID of the list to update the interest status of.
}
```

## Output
