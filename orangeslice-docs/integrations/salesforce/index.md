---
description: Salesforce CRM - SOQL queries, records, bulk operations
---

# Salesforce Integration

Typed functions for Salesforce CRM operations using SOQL queries and the REST API.

## Query Operations

- `integrations.salesforce.query(soql, options?)` - Execute a SOQL query
- `integrations.salesforce.queryMore(nextRecordsUrl)` - Fetch next page of query results
- `integrations.salesforce.search(sosl)` - Execute a SOSL search

## Single Record Operations

- `integrations.salesforce.createRecord(sobject, data)` - Create a new record
- `integrations.salesforce.getRecord(sobject, id, options?)` - Get a record by ID
- `integrations.salesforce.updateRecord(sobject, id, data)` - Update a record
- `integrations.salesforce.deleteRecord(sobject, id)` - Delete a record
- `integrations.salesforce.upsertRecord(sobject, externalIdField, externalIdValue, data)` - Upsert using external ID

## Metadata Operations

- `integrations.salesforce.describeGlobal()` - List all available SObjects
- `integrations.salesforce.describeSObject(sobject)` - Get schema for an SObject

## Generic Request Operations

- `integrations.salesforce.request(input)` - Make an authenticated request to any Salesforce endpoint

## Collection/Batch Operations

- `integrations.salesforce.createRecords(input)` - Create up to 200 records
- `integrations.salesforce.retrieveRecords(input)` - Retrieve multiple records by ID
- `integrations.salesforce.updateRecords(input)` - Update up to 200 records
- `integrations.salesforce.deleteRecords(input)` - Delete multiple records
- `integrations.salesforce.upsertRecords(input)` - Upsert up to 200 records

## Email Operations

- `integrations.salesforce.sendEmail(input)` - Send an email via Salesforce
