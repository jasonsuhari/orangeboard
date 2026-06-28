---
description: Attio CRM - records, lists, notes, tasks, webhooks
---

# Attio Integration

Typed functions for Attio CRM operations. All methods use the Attio REST API v2.

## Records (People, Companies, Deals, Custom Objects)

- `integrations.attio.listRecords(input)` - List/query records with filters and sorting
- `integrations.attio.getRecord(input)` - Get a record by ID
- `integrations.attio.createRecord(input)` - Create a new record
- `integrations.attio.assertRecord(input)` - Create or update by matching attribute (upsert)
- `integrations.attio.updateRecord(input)` - Update a record (append multiselect values)
- `integrations.attio.overwriteRecord(input)` - Update a record (overwrite multiselect values)
- `integrations.attio.deleteRecord(input)` - Delete a record
- `integrations.attio.searchRecords(input)` - Fuzzy search across records
- `integrations.attio.listRecordAttributeValues(input)` - Get all values for an attribute on a record (supports historic)
- `integrations.attio.listRecordEntries(input)` - List all list entries for a record

## Objects

- `integrations.attio.listObjects()` - List all objects in workspace
- `integrations.attio.getObject(input)` - Get object metadata/schema
- `integrations.attio.createObject(input)` - Create a custom object
- `integrations.attio.updateObject(input)` - Update an object

## Lists

- `integrations.attio.listLists()` - List all lists
- `integrations.attio.getList(input)` - Get a list by ID
- `integrations.attio.createList(input)` - Create a new list
- `integrations.attio.updateList(input)` - Update a list

## List Entries

- `integrations.attio.listEntries(input)` - List entries in a list
- `integrations.attio.getEntry(input)` - Get a list entry
- `integrations.attio.createEntry(input)` - Add a record to a list
- `integrations.attio.assertEntry(input)` - Upsert an entry by parent record
- `integrations.attio.updateEntry(input)` - Update a list entry (append multiselect values)
- `integrations.attio.overwriteEntry(input)` - Update a list entry (overwrite multiselect values)
- `integrations.attio.deleteEntry(input)` - Delete a list entry
- `integrations.attio.listEntryAttributeValues(input)` - Get all values for an attribute on an entry (supports historic)

## Notes

- `integrations.attio.listNotes(input?)` - List notes
- `integrations.attio.getNote(input)` - Get a note by ID
- `integrations.attio.createNote(input)` - Create a note on a record
- `integrations.attio.deleteNote(input)` - Delete a note

## Tasks

- `integrations.attio.listTasks(input?)` - List all tasks
- `integrations.attio.getTask(input)` - Get a task by ID
- `integrations.attio.createTask(input)` - Create a task
- `integrations.attio.updateTask(input)` - Update a task
- `integrations.attio.deleteTask(input)` - Delete a task

## Attributes

- `integrations.attio.listAttributes(input)` - List attributes on an object or list
- `integrations.attio.getAttribute(input)` - Get a single attribute
- `integrations.attio.createAttribute(input)` - Create an attribute on an object or list
- `integrations.attio.updateAttribute(input)` - Update an attribute

## Select Options

- `integrations.attio.listSelectOptions(input)` - List select options for an attribute
- `integrations.attio.createSelectOption(input)` - Add a select option to an attribute
- `integrations.attio.updateSelectOption(input)` - Update a select option

## Statuses

- `integrations.attio.listStatuses(input)` - List statuses for a status attribute
- `integrations.attio.createStatus(input)` - Add a status to a status attribute
- `integrations.attio.updateStatus(input)` - Update a status

## Webhooks

- `integrations.attio.listWebhooks(input?)` - List all webhooks
- `integrations.attio.getWebhook(input)` - Get a webhook by ID
- `integrations.attio.createWebhook(input)` - Create a webhook
- `integrations.attio.updateWebhook(input)` - Update a webhook
- `integrations.attio.deleteWebhook(input)` - Delete a webhook

## Workspace Members

- `integrations.attio.listWorkspaceMembers()` - List workspace members
- `integrations.attio.getWorkspaceMember(input)` - Get a workspace member by ID

## Comments & Threads

- `integrations.attio.createComment(input)` - Create a comment
- `integrations.attio.getComment(input)` - Get a comment by ID
- `integrations.attio.deleteComment(input)` - Delete a comment
- `integrations.attio.listThreads(input)` - List comment threads
- `integrations.attio.getThread(input)` - Get a thread with comments

## Meetings

- `integrations.attio.listMeetings(input?)` - List meetings with filters (linked records, participants, date range)
- `integrations.attio.getMeeting(input)` - Get a meeting by ID

## Call Recordings & Transcripts

- `integrations.attio.listCallRecordings(input)` - List call recordings for a meeting
- `integrations.attio.getCallRecording(input)` - Get a call recording by ID
- `integrations.attio.getCallTranscript(input)` - Get the transcript for a call recording

## Files

- `integrations.attio.listFiles(input)` - List files and folders for a record (requires object + record_id)
- `integrations.attio.getFile(input)` - Get a file by ID
- `integrations.attio.createFolder(input)` - Create a folder on a record
- `integrations.attio.deleteFile(input)` - Delete a file or folder

## Meta

- `integrations.attio.getSelf()` - Identify current access token, workspace, and permissions
