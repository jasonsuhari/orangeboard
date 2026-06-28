---
description: HeyReach LinkedIn automation - campaigns, leads, messaging
---

# HeyReach Integration

Typed functions for HeyReach LinkedIn automation operations.

## Authentication

- `integrations.heyreach.checkApiKey()` - Validate API key

## Campaigns

- `integrations.heyreach.listCampaigns(input?)` - List all campaigns
- `integrations.heyreach.getCampaign(campaignId)` - Get campaign by ID
- `integrations.heyreach.resumeCampaign(campaignId)` - Resume a paused campaign
- `integrations.heyreach.pauseCampaign(campaignId)` - Pause a campaign
- `integrations.heyreach.addLeadsToCampaign(input)` - Add leads to a campaign
- `integrations.heyreach.addLeadsToCampaignV2(input)` - Add leads with detailed response
- `integrations.heyreach.stopLeadInCampaign(input)` - Stop a lead in a campaign
- `integrations.heyreach.getLeadsFromCampaign(input)` - Get leads from a campaign
- `integrations.heyreach.getCampaignsForLead(input)` - Get campaigns for a lead

## Inbox

- `integrations.heyreach.getConversations(input?)` - Get conversations
- `integrations.heyreach.getChatroom(accountId, conversationId)` - Get chatroom details
- `integrations.heyreach.sendMessage(input)` - Send a message

## LinkedIn Accounts

- `integrations.heyreach.listLinkedInAccounts(input?)` - List LinkedIn accounts
- `integrations.heyreach.getLinkedInAccount(accountId)` - Get LinkedIn account by ID

## Lists

- `integrations.heyreach.getList(listId)` - Get list by ID
- `integrations.heyreach.listLists(input?)` - List all lists
- `integrations.heyreach.getLeadsFromList(input)` - Get leads from a list
- `integrations.heyreach.deleteLeadsFromList(input)` - Delete leads from a list
- `integrations.heyreach.deleteLeadsFromListByProfileUrl(input)` - Delete leads by profile URL
- `integrations.heyreach.getCompaniesFromList(input)` - Get companies from a list
- `integrations.heyreach.addLeadsToList(input)` - Add leads to a list
- `integrations.heyreach.addLeadsToListV2(input)` - Add leads with detailed response
- `integrations.heyreach.getListsForLead(input)` - Get lists for a lead
- `integrations.heyreach.createEmptyList(input)` - Create an empty list

## Stats

- `integrations.heyreach.getOverallStats(input)` - Get overall statistics

## Lead

- `integrations.heyreach.getLead(input)` - Get lead by profile URL
- `integrations.heyreach.addTags(input)` - Add tags to a lead
- `integrations.heyreach.getTags(input)` - Get tags for a lead
- `integrations.heyreach.replaceTags(input)` - Replace tags for a lead

## Webhooks

- `integrations.heyreach.createWebhook(input)` - Create a webhook
- `integrations.heyreach.getWebhook(webhookId)` - Get webhook by ID
- `integrations.heyreach.listWebhooks(input?)` - List all webhooks
- `integrations.heyreach.updateWebhook(webhookId, input)` - Update a webhook
- `integrations.heyreach.deleteWebhook(webhookId)` - Delete a webhook

## My Network

- `integrations.heyreach.getMyNetwork(input)` - Get connections for a sender
- `integrations.heyreach.isConnection(input)` - Check if a lead is a connection
