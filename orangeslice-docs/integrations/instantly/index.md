---
description: Instantly cold email - campaigns, leads, analytics
---

# Instantly Integration

Typed functions for Instantly cold email outreach operations.

## Leads

- `integrations.instantly.createLead(input)` - Add a lead to a campaign or list
- `integrations.instantly.getLead(id)` - Get a specific lead by ID
- `integrations.instantly.updateLead(id, input)` - Update a lead
- `integrations.instantly.deleteLead(id)` - Delete a lead
- `integrations.instantly.listLeads(input)` - List leads with filters
- `integrations.instantly.bulkAddLeads(input)` - Add multiple leads at once
- `integrations.instantly.updateLeadInterestStatus(input)` - Update lead interest/reply status

## Campaigns

- `integrations.instantly.createCampaign(input)` - Create a new campaign
- `integrations.instantly.getCampaign(id)` - Get a specific campaign
- `integrations.instantly.listCampaigns(options?)` - List all campaigns
- `integrations.instantly.activateCampaign(id)` - Launch/activate a campaign
- `integrations.instantly.pauseCampaign(id)` - Pause a campaign
- `integrations.instantly.getCampaignAnalytics(id, options?)` - Get campaign analytics

## Email Accounts

- `integrations.instantly.listAccounts(options?)` - List email sending accounts
- `integrations.instantly.getAccount(email)` - Get a specific email account
