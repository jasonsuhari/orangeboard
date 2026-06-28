# activateCampaign

Activate(start), or resume a campaign

**API:** `POST /api/v2/campaigns/{id}/activate`

## Input

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | Campaign ID |

## Output

```typescript
{
  id: string; // Unique identifier for the campaign
  name: string; // Name of the campaign
  pl_value?: number | null; // Value of every positive lead
  status: -99 | -1 | -2 | 0 | 1 | 2 | 3 | 4; // Campaign Status
  is_evergreen?: boolean | null; // Whether the campaign is evergreen
  campaign_schedule: {
    start_date?: string; // Start date in YYYY-MM-DD format. Uses the campaign's timezone.
    end_date?: string; // End date in YYYY-MM-DD format. Uses the campaign's timezone.
    schedules: Array<{
      name: string;
      timing: {
        from: string;
        to: string;
      };
      days: {
        0?: boolean;
        1?: boolean;
        2?: boolean;
        3?: boolean;
        4?: boolean;
        5?: boolean;
        6?: boolean;
      };
      timezone: "Etc/GMT+12" | "Etc/GMT+11" | "Etc/GMT+10" | "America/Anchorage" | "America/Dawson" | "America/Creston" | "America/Chihuahua" | "America/Boise" | "America/Belize" | "America/Chicago" | "America/Bahia_Banderas" | "America/Regina" | "America/Bogota" | "America/Detroit" | "America/Indiana/Marengo" | "America/Caracas" | "America/Asuncion" | "America/Glace_Bay" | "America/Campo_Grande" | "America/Anguilla" | "America/Santiago" | "America/St_Johns" | "America/Sao_Paulo" | "America/Argentina/La_Rioja" | "America/Araguaina" | "America/Godthab" | "America/Montevideo" | "America/Bahia" | "America/Noronha" | "America/Scoresbysund" | "Atlantic/Cape_Verde" | "Africa/Casablanca" | "America/Danmarkshavn" | "Europe/Isle_of_Man" | "Atlantic/Canary" | "Africa/Abidjan" | "Arctic/Longyearbyen" | "Europe/Belgrade" | "Africa/Ceuta" | "Europe/Sarajevo" | "Africa/Algiers" | "Africa/Windhoek" | "Asia/Nicosia" | "Asia/Beirut" | "Africa/Cairo" | "Asia/Damascus" | "Europe/Bucharest" | "Africa/Blantyre" | "Europe/Helsinki" | "Europe/Istanbul" | "Asia/Jerusalem" | "Africa/Tripoli" | "Asia/Amman" | "Asia/Baghdad" | "Europe/Kaliningrad" | "Asia/Aden" | "Africa/Addis_Ababa" | "Europe/Kirov" | "Europe/Astrakhan" | "Asia/Tehran" | "Asia/Dubai" | "Asia/Baku" | "Indian/Mahe" | "Asia/Tbilisi" | "Asia/Yerevan" | "Asia/Kabul" | "Antarctica/Mawson" | "Asia/Yekaterinburg" | "Asia/Karachi" | "Asia/Kolkata" | "Asia/Colombo" | "Asia/Kathmandu" | "Antarctica/Vostok" | "Asia/Dhaka" | "Asia/Rangoon" | "Antarctica/Davis" | "Asia/Novokuznetsk" | "Asia/Hong_Kong" | "Asia/Krasnoyarsk" | "Asia/Brunei" | "Australia/Perth" | "Asia/Taipei" | "Asia/Choibalsan" | "Asia/Irkutsk" | "Asia/Dili" | "Asia/Pyongyang" | "Australia/Adelaide" | "Australia/Darwin" | "Australia/Brisbane" | "Australia/Melbourne" | "Antarctica/DumontDUrville" | "Australia/Currie" | "Asia/Chita" | "Antarctica/Macquarie" | "Asia/Sakhalin" | "Pacific/Auckland" | "Etc/GMT-12" | "Pacific/Fiji" | "Asia/Anadyr" | "Asia/Kamchatka" | "Etc/GMT-13" | "Pacific/Apia";
    }>;
  }; // Campaign schedule
  sequences?: Array<{
    steps: Array<{
      type: "email"; // Type of step. This has to be 'email' always - it's the only supported type for now
      delay: number; // The number of days to wait before sending the NEXT email
      variants: Array<{
        subject: string;
        body: string;
        v_disabled?: boolean; // Whether this variant is disabled. By default, all the variants are enabled. Please set this to true if you want to disable this variant
      }>;
    }>;
  }>; // List of sequences (the actual email copy). Even though this field is an array, only the first element is used, so please provide only one array item, and add the steps to that array
  timestamp_created: string; // Timestamp when the campaign was created
  timestamp_updated: string; // Timestamp when the campaign was last updated
  email_gap?: number | null; // The gap between emails in minutes
  random_wait_max?: number | null; // The maximum random wait time in minutes
  text_only?: boolean | null; // Whether the campaign is text only
  first_email_text_only?: boolean | null; // Whether the campaign is send the first email as a text only
  email_list?: string[]; // List of accounts to use for sending emails
  daily_limit?: number | null; // The daily limit for sending emails
  stop_on_reply?: boolean | null; // Whether to stop the campaign on reply
  email_tag_list?: string[]; // List of tags to use for sending emails
  link_tracking?: boolean | null; // Whether to track links in emails
  open_tracking?: boolean | null; // Whether to track opens in emails
  stop_on_auto_reply?: boolean | null; // Whether to stop the campaign on auto reply
  daily_max_leads?: number | null; // The daily maximum new leads to contact
  prioritize_new_leads?: boolean | null; // Whether to prioritize new leads
  auto_variant_select?: object | null; // Auto variant select settings
  match_lead_esp?: boolean | null; // Whether to match leads by ESP
  stop_for_company?: boolean | null; // Whether to stop the campaign for the entire company(domain) when a lead replies
  insert_unsubscribe_header?: boolean | null; // Whether to insert an unsubscribe header in emails
  allow_risky_contacts?: boolean | null; // Whether to allow risky contacts
  disable_bounce_protect?: boolean | null; // Whether to disable bounce protection
  limit_emails_per_company_override?: object | null; // Overrides the workspace-wide limit emails per company setting for this campaign.
  cc_list?: string[]; // List of accounts to CC on emails
  bcc_list?: string[]; // List of accounts to BCC on emails
  organization?: string | null; // Organization ID
  owned_by?: string | null; // Owner ID
  provider_routing_rules?: Array<{
    action?: "send" | "do_not_send";
    recipient_esp?: "all" | "google" | "outlook" | "other"[];
    sender_esp?: "all" | "google" | "outlook" | "other"[];
  }>; // Auto variant select settings
}
```
