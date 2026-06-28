---
description: HubSpot CRM and workflows
---

# HubSpot Integration

Typed functions for HubSpot CRM operations and workflows.

## Contacts

- `integrations.hubspot.createContact(input)` - Create a new contact
- `integrations.hubspot.getContact(id, options?)` - Get contact by ID or email
- `integrations.hubspot.updateContact(id, input, idProperty?)` - Update a contact
- `integrations.hubspot.deleteContact(id)` - Archive a contact
- `integrations.hubspot.listContacts(options?)` - List contacts with pagination
- `integrations.hubspot.searchContacts(input)` - Search contacts with filters

## Companies

- `integrations.hubspot.createCompany(input)` - Create a new company
- `integrations.hubspot.getCompany(id, options?)` - Get company by ID
- `integrations.hubspot.updateCompany(id, input, idProperty?)` - Update a company
- `integrations.hubspot.deleteCompany(id)` - Archive a company
- `integrations.hubspot.listCompanies(options?)` - List companies with pagination
- `integrations.hubspot.searchCompanies(input)` - Search companies with filters

## Deals

- `integrations.hubspot.createDeal(input)` - Create a new deal
- `integrations.hubspot.getDeal(id, options?)` - Get deal by ID
- `integrations.hubspot.updateDeal(id, input, idProperty?)` - Update a deal
- `integrations.hubspot.deleteDeal(id)` - Archive a deal
- `integrations.hubspot.listDeals(options?)` - List deals with pagination
- `integrations.hubspot.searchDeals(input)` - Search deals with filters

## Workflows (Flows)

- `integrations.hubspot.listFlows(options?)` - List all workflows with pagination
- `integrations.hubspot.getFlow(flowId)` - Get workflow details by ID
- `integrations.hubspot.createFlow(input)` - Create a new workflow
- `integrations.hubspot.updateFlow(flowId, input)` - Update an existing workflow
- `integrations.hubspot.createWebhookFlow(input)` - Create a workflow containing a webhook action using OAuth `automation` scope. For advanced payloads, `createFlow(...)` may be more reliable.
- `integrations.hubspot.updateWebhookFlow(flowId, input)` - Update the webhook action in an existing workflow
- `integrations.hubspot.deleteFlow(flowId)` - Delete a workflow

## Lists

- `integrations.hubspot.getList(listId, options?)` - Get list by ID

## Properties

- `integrations.hubspot.listProperties(objectType, options?)` - List all property definitions for an object type

Use `createWebhookFlow` / `updateWebhookFlow` when a user authorizes your app with HubSpot OAuth and grants the `automation` scope.

In practice, HubSpot's workflows v4 API may require extra top-level fields such as `flowType`, `nextAvailableActionId`, and `crmObjectCreationStatus`, plus a strict `WEBHOOK` action payload. See `createWebhookFlow.md` for the currently working payload shape.

## Owners

- `integrations.hubspot.listOwners(options?)` - List all owners (users) with pagination
- `integrations.hubspot.getOwner(ownerId, options?)` - Get owner by ID or userId
