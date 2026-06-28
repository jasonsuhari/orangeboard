# deleteLead

Delete lead

**API:** `DELETE /api/v2/leads/{id}`

## Input

### Path Parameters

| Parameter | Type     | Required | Description                  |
| --------- | -------- | -------- | ---------------------------- |
| `id`      | `string` | Yes      | The ID of the item to delete |

### Request Body

```typescript
any;
```

## Output

```typescript
{
  id: string; // Unique identifier for the lead
  timestamp_created: string; // Timestamp when the lead was created
  timestamp_updated: string; // Timestamp when the lead was last updated
  organization: string; // Organization ID associated with the lead
  campaign?: string | null; // Campaign ID associated with the lead
  status: 1 | 2 | 3 | -1 | -2 | -3; // Status of the lead
  email?: string | null; // Email address of the lead
  personalization?: string | null; // Personalization of the lead
  website?: string | null; // Website of the lead
  last_name?: string | null; // Last name of the lead
  first_name?: string | null; // First name of the lead
  company_name?: string | null; // Company name of the lead
  phone?: string | null; // Phone number of the lead
  email_open_count: number; // Number of times the email was opened
  email_reply_count: number; // Number of times the email was replied to
  email_click_count: number; // Number of times the email was clicked
  company_domain: string; // Company domain of the lead
  status_summary: {
    lastStep?: {
      from?: string;
      stepID?: string;
      timestamp_executed?: string;
    };
    domain_complete?: boolean;
  }; // Status summary of the lead
  payload?: object | null; // Lead custom variables. This object can contain any key, but the values have to be of type string, number, boolean, or null. We do NOT allow objects or arrays as values.
  status_summary_subseq?: {
    from?: string;
    stepID?: string;
    timestampExecuted?: string;
  }; // Subsequence status summary of the lead
  last_step_from?: string | null; // Source of the last step
  last_step_id?: string | null; // ID of the last step
  last_step_timestamp_executed?: string | null; // Timestamp when the last step was executed
  email_opened_step?: number | null; // Last email step opened by the lead
  email_opened_variant?: number | null; // Last step variant opened by the lead
  email_replied_step?: number | null; // Last email step the lead has replied to
  email_replied_variant?: number | null; // Last step variant the lead has replied to
  email_clicked_step?: number | null; // Last email step the lead has clicked
  email_clicked_variant?: number | null; // Last step variant the lead has clicked
  lt_interest_status?: 1 | 2 | 3 | 4 | 0 | -1 | -2 | -3; // Lead interest status. It can be either a static value (check below), or a custom status interest value
  subsequence_id?: string | null; // ID of the subsequence
  verification_status?: 1 | -1 | -2 | -3 | -4 | 11 | 12; // Verification status of the lead
  pl_value_lead?: string | null; // Potential value of the lead
  timestamp_added_subsequence?: string | null; // Timestamp when the lead was added to the subsequence
  timestamp_last_contact?: string | null; // Timestamp of the last contact with the lead
  timestamp_last_open?: string | null; // Timestamp of the last email open
  timestamp_last_reply?: string | null; // Timestamp of the last email reply
  timestamp_last_interest_change?: string | null; // Timestamp of the last interest status change
  timestamp_last_click?: string | null; // Timestamp of the last email click
  enrichment_status?: 1 | -1 | 11 | -2; // Enrichment status of the lead
  list_id?: string | null; // List ID associated with the lead
  last_contacted_from?: string | null; // Source of the last contact
  uploaded_by_user?: string | null; // ID of the user who uploaded the lead
  upload_method?: "manual" | "api" | "website-visitor"; // Method used to upload the lead
  assigned_to?: string | null; // ID of the user assigned to the lead
  is_website_visitor?: boolean | null; // Indicates if the lead is a website visitor
  timestamp_last_touch?: string | null; // Timestamp of the last touch with the lead
  esp_code?: 0 | 1 | 2 | 3 | 9 | 10 | 12 | 13 | 999 | 1000; // ESP code associated with the lead
  esg_code?: 0 | 1 | 2 | 3 | 4; // ESG code associated with the lead
}
```
