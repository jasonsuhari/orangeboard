# listAccounts

List account

**API:** `GET /api/v2/accounts`

## Input

### Query Parameters

| Parameter        | Type      | Required | Description                                                                                                                                                  |
| ---------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `limit`          | `integer` | No       | The number of items to return                                                                                                                                |
| `starting_after` | `string`  | No       |                                                                                                                                                              |
| `search`         | `string`  | No       |                                                                                                                                                              |
| `status`         | `number`  | No       |                                                                                                                                                              |
| `provider_code`  | `number`  | No       |                                                                                                                                                              |
| `tag_ids`        | `string`  | No       | Filter accounts by tag ids. Returns accounts that have any of the specified tags assigned. You can specify multiple tag ids by separating them with a comma. |

## Output

```typescript
{
  items: Array<{
    email: string; // Email address of the account
    timestamp_created: string; // Timestamp when the account was created
    timestamp_updated: string; // Timestamp when the account was last updated
    first_name: string; // First name associated with the account
    last_name: string; // Last name associated with the account
    warmup?: {
      limit?: number; // Email sending limit for the account
      advanced?: {
        warm_ctd?: boolean; // Whether the account is in warm CTD mode
        open_rate?: number; // Email open rate for the account
        important_rate?: number; // Important email rate for the account
        read_emulation?: boolean; // Whether read emulation is enabled
        spam_save_rate?: number; // Spam save rate for the account
        weekday_only?: boolean; // Whether to send emails only on weekdays
      }; // Advanced settings for the account
      warmup_custom_ftag?: string; // Custom tag for the account
      increment?: "disabled" | "0" | "1" | "2" | "3" | "4"; // Daily increment for email sending limits
      reply_rate?: number; // Reply rate for the account
    }; // Warmup configuration for the account
    added_by?: string | null; // User ID who added the account
    daily_limit?: number | null; // Daily email sending limit
    modified_by?: string | null; // User ID who last modified the account
    tracking_domain_name?: string | null; // Tracking domain
    tracking_domain_status?: string | null; // Tracking domain status
    status?: 1 | 2 | -1 | -2 | -3; // Current status of the account
    enable_slow_ramp?: boolean | null; // Whether to enable slow ramp up for sending limits
    inbox_placement_test_limit?: number | null; // The limit for inbox placement tests
    organization: string; // Organization ID that owns this account
    timestamp_last_used?: string | null; // Timestamp when the account was last used
    warmup_status: 0 | 1 | -1 | -2 | -3; // Current warmup status of the account
    status_message?: {
      code?: string;
      command?: string;
      response?: string;
      e_message?: string;
      responseCode?: number;
    }; // Status message for the account
    timestamp_warmup_start?: string | null; // Timestamp when warmup was started
    provider_code: 1 | 2 | 3 | 4; // Provider code for the account. Please make sure to specify the right provider code, otherwise your account will not work.
    setup_pending: boolean; // Whether account setup is pending
    warmup_pool_id?: string | null; // ID of the warmup pool this account belongs to
    is_managed_account: boolean; // Whether this is a managed account
    dfy_password_changed?: boolean | null; // Whether DFY password has been changed
    stat_warmup_score?: number | null; // Warmup score for the account
    sending_gap?: number; // The gap between emails sent from this account in minutes (minimum wait time when used with multiple campaigns)
  }>; // The list of Account
  next_starting_after?: string; // The filter for getting the next items after this one, this could either be a UUID, a timestamp, on an email depending on the specific API
}
```
