---
description: Create and manage knowledge skills — reusable knowledge snippets that guide AI agents
---

# skills — Knowledge Skills

Create, read, update, and delete knowledge skills. Skills are reusable knowledge snippets (company context, ICP descriptions, email templates, product info) that agents reference during research and outreach.

## Quick start

```typescript
import { skills } from "orangeslice";

// Create a skill
const skill = await skills.create({
   title: "ICP description",
   description: "Ideal customer profile for outbound targeting",
   content: "We sell to B2B SaaS companies, 50-500 employees, Series A-C..."
});

// List all skills
const { skills: all } = await skills.list();
console.log(all.map((s) => `${s.title}: ${s.content.slice(0, 50)}...`));

// Update a skill
await skills.update(skill.id, { content: "Updated ICP: ..." });

// Delete a skill
await skills.delete(skill.id);
```

## Methods

### `skills.list(opts?)`

List knowledge skills for the current account.

**Parameters:**

- `opts.spreadsheetId` — Filter to a specific spreadsheet's skills

**Returns:** `{ skills: Skill[] }`

### `skills.get(id)`

Get a single skill by ID.

**Returns:** `Skill`

### `skills.create(opts)`

Create a new knowledge skill.

**Parameters:**

- `opts.title` — Skill title (e.g. "ICP description", "Email template")
- `opts.description` — Short description of what the skill provides
- `opts.content` — The knowledge content
- `opts.autoInject` — Optional boolean, auto-inject into agent context (default `false`)
- `opts.spreadsheetId` — Optional, scope to a specific spreadsheet

**Returns:** `Skill`

### `skills.update(id, fields)`

Update an existing skill.

**Parameters:**

- `fields.title` — New title
- `fields.description` — New description
- `fields.content` — New content
- `fields.autoInject` — Update auto-inject setting

**Returns:** `Skill`

### `skills.delete(id)`

Delete a skill by ID.

**Returns:** `{ success: boolean }`

## Skill object

```typescript
{
   id: string;
   title: string;
   description: string;
   content: string;
   autoInject: boolean;
   createdAt: string;
   updatedAt: string;
   scope: "account" | "spreadsheet";
   spreadsheetId: string | null;
}
```
