# listLeads

List leads

**API:** `POST /api/v2/leads/list`

## Input

### Request Body

```typescript
{
  search?: string; // A search string to search the leads against - can be First Name, Last Name, or Email
  filter?: string; // Filter criteria for leads. For custom lead labels, use the `interest_status` field.
  campaign?: string; // Campaign ID to filter leads
  list_id?: string; // List ID to filter leads
  in_campaign?: boolean; // Whether the lead is in a campaign
  in_list?: boolean; // Whether the lead is in a list
  ids?: string[]; // Array of lead IDs to include
  queries?: Array<{
    actionType: "reply" | "email-open" | "last-contacted" | "link-click" | "lead-status" | "lead-status-change";
    values: {
      occurrence-days?: number;
      occurrence-count?: {
        condition?: "more" | "less" | "equal";
        count?: number;
      };
      lead-status?: {
        status?: number;
        condition?: "is" | "is-not";
      };
    };
  }>;
  excluded_ids?: string[]; // Array of lead IDs to exclude
  contacts?: string[]; // Array of emails the leads needs to have
  limit?: number; // The number of items to return
  starting_after?: string; // Forward pagination cursor. When distinct_contacts is false, provide the `id` value from the last lead of the previous page; when true, provide the lead's email.
  organization_user_ids?: string[]; // Array of organization user IDs to filter leads
  smart_view_id?: string; // Smart view ID to filter leads
  is_website_visitor?: boolean; // Whether the lead is a website visitor
  distinct_contacts?: boolean; // Whether to return distinct contacts
  enrichment_status?: 1 | -1 | 11 | -2; // Enrichment status to filter leads
  esg_code?: "0" | "1" | "2" | "3" | "4" | "all" | "none"; // ESG code to filter leads
}
```

## Output

```typescript
{
  items: Array<{
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
  }>; // The list of Lead
  next_starting_after?: string; // The filter for getting the next items after this one, this could either be a UUID, a timestamp, on an email depending on the specific API
}
```
