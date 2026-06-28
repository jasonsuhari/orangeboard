---
description: Spreadsheet management — create spreadsheets, run SQL, add rows
---

# ctx — Spreadsheet Context API

Manage Orange Slice spreadsheets programmatically. Create spreadsheets, add sheets and columns via SQL, query data, insert rows.

## Quick start

```typescript
import { ctx } from "orangeslice";

// Create a spreadsheet
const ss = await ctx.createSpreadsheet({ name: "Leads" });

// Create a sheet with columns
await ctx.sql(ss.id, "CREATE TABLE contacts (name, email, website)");

// Insert data via addRows (not SQL)
const bound = ctx.spreadsheet(ss.id);
await bound.sheet("contacts").addRows([
   { name: "Acme", email: "hi@acme.com" },
   { name: "Globex", email: "hello@globex.com" }
]);

// Query data
const result = await ctx.sql(ss.id, "SELECT * FROM contacts WHERE name = 'Acme'");
console.log(result.rows);
```

## Methods

### Top-level

- **`ctx.createSpreadsheet({ name })`** — Create a new spreadsheet. The scope (personal vs org) is determined by the API key. Returns `{ id, name }`.
- **`ctx.listSpreadsheets()`** — List spreadsheets visible to the API key's scope. Returns `{ spreadsheets: [...] }`.
- **`ctx.deleteSpreadsheet(spreadsheetId)`** — Soft-delete a spreadsheet (must be within the API key's scope).
- **`ctx.sql(spreadsheetId, sql)`** — Execute EAV-SQL against a spreadsheet within the API key's scope (see SQL reference below).

### Bound spreadsheet

Call `ctx.spreadsheet(id)` to get a handle bound to a specific spreadsheet:

```typescript
const ss = ctx.spreadsheet("uuid-here");
await ss.sql("SELECT * FROM contacts");
await ss.sheet("contacts").addRows([
   { name: "Corp", email: "corp@example.com" },
   { name: "Foo", email: "foo@example.com" },
   { name: "Bar", email: "bar@example.com" }
]);
```

- **`ss.sql(sql)`** — Execute EAV-SQL (same as `ctx.sql` but without needing to pass spreadsheetId).
- **`ss.describe()`** — Return the structural snapshot of the spreadsheet: its `id`, `name`, and an array of `sheets`, each with its `columns`. Use this to discover sheet/column names before issuing SQL — especially when attaching to a spreadsheet you didn't create.
- **`ss.sheet(name).addRows(rows)`** — Insert one or more rows into the named sheet. Accepts a single row object or an array. Missing columns are auto-created.

### Attaching to an existing spreadsheet

When the spreadsheet was created elsewhere (e.g. in the UI), use `describe()` to discover what's inside before running SQL:

```typescript
const { spreadsheets } = await ctx.listSpreadsheets();
const target = spreadsheets.find((s) => s.name === "Find more paying customers V1")!;

const ss = ctx.spreadsheet(target.id);
const info = await ss.describe();
// info.sheets: [{ id, name, columns: [{ id, name }] }, ...]

for (const sheet of info.sheets) {
   const cols = sheet.columns.map((c) => c.name).join(", ");
   console.log(`${sheet.name}: ${cols}`);
}

// Now you know the real sheet names; query safely
const result = await ss.sql(`SELECT * FROM "${info.sheets[0].name}" LIMIT 10`);
```

## EAV-SQL Reference

The `sql` method supports a subset of SQL mapped to Orange Slice's EAV storage:

| Statement      | Example                                                    | Description                      |
| -------------- | ---------------------------------------------------------- | -------------------------------- |
| `CREATE TABLE` | `CREATE TABLE leads (name, email, website)`                | Creates a new sheet with columns |
| `SELECT`       | `SELECT name, email FROM leads WHERE email LIKE '%@acme%'` | Query rows                       |
| `INSERT INTO`  | Use `ss.sheet(name).addRows([...])` instead                | Add rows (not via SQL)           |
| `ALTER TABLE`  | `ALTER TABLE leads ADD COLUMN phone`                       | Add/rename/drop columns          |
| `DELETE FROM`  | `DELETE FROM leads WHERE email IS NULL`                    | Delete rows                      |
| `DROP TABLE`   | `DROP TABLE leads`                                         | Delete a sheet                   |

> **Note:** `RUN` commands are not supported via the API.
