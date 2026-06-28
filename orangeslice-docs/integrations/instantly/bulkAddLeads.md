# bulkAddLeads

Add leads in bulk to a campaign or list

**API:** `POST /api/v2/leads/add`

## Input

### Request Body

```typescript
{
  campaign_id?: string; // The unique identifier for the campaign to add leads to. Use this field OR `list_id`, but not both.
  list_id?: string; // The unique identifier for the list to add leads to. Use this field OR `campaign_id`, but not both.
  leads: Array<{
    email?: string | null; // Email address of the lead
    personalization?: string | null; // Personalization of the lead
    website?: string | null; // Website of the lead
    last_name?: string | null; // Last name of the lead
    first_name?: string | null; // First name of the lead
    company_name?: string | null; // Company name of the lead
    phone?: string | null; // Phone number of the lead
    lt_interest_status?: 1 | 2 | 3 | 4 | 0 | -1 | -2 | -3; // Lead interest status. It can be either a static value (check below), or a custom status interest value
    pl_value_lead?: string | null; // Potential value of the lead
    assigned_to?: string | null; // ID of the user assigned to the lead
    custom_variables?: Record<string, string | number | boolean | null>; // Custom variables can include any metadata about the lead that is relevant to the campaign, the campaign will be updated to allow all the other leads in the campaign to have the same custom variables. The custom variables will be added to the lead payload field
  }>; // An array of lead objects to create. When using `campaign_id`: Each lead object must contain an `email`. When using `list_id` Each lead object must contain at least one of the following: `email`, `first_name`, or `last_name`.
  blocklist_id?: string | null; // Optional blocklist ID to check leads against. If omitted, the workspace default blocklist is used.
  assigned_to?: string; // Optional user ID to assign all imported leads to. If omitted, leads are assigned to the campaign owner when `campaign_id` is defined, or the user making the request.
  verify_leads_on_import?: boolean; // If true, a background job will be created to verify the email addresses of the imported leads.
  skip_if_in_workspace?: boolean; // If true, any lead that already exists anywhere in your workspace (in any campaign or list) will be skipped. This option overrides the other "skip_if" flags.
  skip_if_in_campaign?: boolean; // If true, any lead that already exists in ANY campaign in your workspace will be skipped.
  skip_if_in_list?: boolean; // If true, any lead that already exists in ANY list in your workspace will be skipped.
}
```

## Output

```typescript
{
   status: string; // Indicates the request was processed.
   total_sent: number; // The total number of leads included in the request payload.
   leads_uploaded: number; // The number of leads that were successfully created.
   in_blocklist: number; // The number of leads that were skipped because their email was found on the blocklist.
   blocklist_used: string | null; // The ID of the blocklist that was used for the check.
   duplicated_leads: number; // The number of leads that were already in this specific campaign or list and were not re-added.
   skipped_count: number; // The number of leads skipped due to the `skip_if_in_...` flags being enabled.
   invalid_email_count: number; // The number of leads skipped due to an invalid email format or a missing email address.
   incomplete_count: number; // The number of leads skipped due to missing email and names. Only calculated for lists.
   duplicate_email_count: number; // The number of leads skipped because their email was duplicated within the request payload itself.
   remaining_in_plan: number | null; // The remaining lead uploads in the current billing plan. This value is only present in the response when a `campaign_id` is provided.
}
```
