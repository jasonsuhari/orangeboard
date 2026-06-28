# getCampaignAnalytics

Get campaign(s) analytics

**API:** `GET /api/v2/campaigns/analytics`

## Input

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | No | A campaign ID to get the analytics for. Leave this field empty to get the analytics for all campaigns |
| `ids` | `array` | No |  |
| `start_date` | `string` | No | Start date |
| `end_date` | `string` | No | End date |
| `exclude_total_leads_count` | `boolean` | No | Exclude the total leads from the result. Setting this to true will considerably decrease the response time |

## Output

```typescript
Array<{
  campaign_name: string; // The name of the campaign
  campaign_id: string; // The ID of the campaign
  campaign_status: number; // The campaign status
  campaign_is_evergreen: boolean; // Whether the campaign is evergreen
  leads_count: number; // The total number of leads
  contacted_count: number; // Number of leads for whom the sequence has started
  open_count: number; // The number of leads that opened at least one email
  reply_count: number; // The number of leads that replied to at least one email
  link_click_count: number; // The number of links that got clicked
  bounced_count: number; // The number of bounced leads
  unsubscribed_count: number; // The number of unsubscribed leads
  completed_count: number; // The number of leads that the campaign was completed for
  emails_sent_count: number; // The total number of sent emails
  new_leads_contacted_count: number; // The total number of new leads contacted
  total_opportunities: number; // The total number of unique opportunities created
  total_opportunity_value: number; // The total value of opportunities created
}>
```
