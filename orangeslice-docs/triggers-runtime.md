---
name: triggers-runtime
description: Trigger mental model + runtime API + webhook shape access. Read before creating/updating/running trigger automations, User asks to build/edit/debug trigger code, User asks about webhook-triggered automations, Agent needs webhook payload shape examples from past events
---

# Triggers Runtime (Agent)

## Core Rule: Triggers Push Data, Columns Do Work

**Triggers are thin data ingesters, NOT processing engines.** Push bare minimum data into rows; all enrichment, AI, scoring, and transformation belongs in code columns.

The spreadsheet is a live workspace, not a log. Columns make work visible, debuggable, retryable per-row, and composable across data sources. Processing inside triggers hides failures in run logs.

**Trigger code should only:**

- Parse/extract fields from `ctx.trigger.payload`
- Light dedup (`SELECT` to check if row exists)
- `addRows()` with raw data + `{ run: true }` to kick off columns
- Paginate via self-invocation for large ingestion
- Route to the right sheet based on payload type

**Never put in trigger code:** `services.*` enrichment, AI calls, scoring, or per-row transformation loops — the sheet IS the loop.

## Webhook Data Model (from DB schema)

Incoming webhook events are stored in `trigger_webhook_events`:

- `id`
- `trigger_id`
- `received_at`
- `status`
- `headers` (JSON)
- `payload` (JSON)
- `error`

Trigger executions are stored in `trigger_runs`:

- `id`
- `trigger_id`
- `webhook_event_id` (nullable)
- `source` (`manual | cron | webhook`)
- `status`
- `source_context` (JSON)
- `output`
- `error`
- `started_at`, `completed_at`

## Runtime Usage Notes

- Current trigger run metadata is on `ctx.trigger`.
- For webhook-triggered runs, inspect `ctx.trigger.payload` and `ctx.trigger.request`.
- To learn payload shape from past traffic, read recent webhook events via `ctx.triggers.byName(...).webhooks.list(...)`.
- All operations are async unless explicitly documented otherwise.

## TS Spec (Lean Contract)

```ts
type TriggerSource = "manual" | "cron" | "webhook";
type TriggerRunStatus = "pending" | "running" | "complete" | "failure" | string;
type WebhookEventStatus = "received" | "queued" | "failed" | string;

interface TriggerRequestMetadata {
   method: string;
   url: string;
   headers: Record<string, string>;
   query: Record<string, string>;
}

// Present when code is running in trigger context
interface TriggerExecutionContext {
   id: string;
   source: TriggerSource;
   runId: string;
   timestamp: string;
   payload: unknown | null;
   request: TriggerRequestMetadata | null;
}

interface TriggerRecord {
   id: string;
   name: string;
   code: string;
   cronExpression: string | null;
   timezone: string;
   enabled: boolean;
   nextRunAt: string | null;
   lastRunAt: string | null;
}

interface TriggerWebhookEventRecord {
   id: string;
   triggerId: string;
   receivedAt: string;
   status: WebhookEventStatus;
   headers: Record<string, string>;
   payload: unknown;
   error: string | null;
}

interface TriggerRunRecord {
   id: string;
   triggerId: string;
   source: TriggerSource | string;
   status: TriggerRunStatus;
   startedAt: string;
   completedAt: string | null;
   error: string | null;
   output: unknown | null;
   sourceContext: Record<string, unknown> | null;
}

interface TriggerCreateInput {
   name: string;
   code?: string; // default ""
   cronExpression?: string | null; // default null
   timezone?: string; // default "UTC"
   enabled?: boolean; // default true
}

interface TriggerUpdatePatch {
   name?: string;
   code?: string;
   cronExpression?: string | null;
   timezone?: string;
   enabled?: boolean;
}

interface TriggerRunNowOptions {
   sourceContext?: Record<string, unknown>;
}

interface TriggerRunNowResult {
   queued: true;
   triggerId: string;
   source: "manual";
}

interface TriggerRunListOptions {
   limit?: number; // default 20
   status?: TriggerRunStatus;
}

interface TriggerWebhookListOptions {
   limit?: number; // default 20
   status?: WebhookEventStatus;
}

interface TriggerHandle {
   readonly id: string;
   readonly name: string;

   update(patch: TriggerUpdatePatch): Promise<TriggerRecord>;
   delete(): Promise<{ success: true; id: string }>;

   enable(): Promise<TriggerRecord>;
   disable(): Promise<TriggerRecord>;

   run(options?: TriggerRunNowOptions): Promise<TriggerRunNowResult>;
   webhookUrl(): string;

   runs: {
      list(options?: TriggerRunListOptions): Promise<TriggerRunRecord[]>;
      latest(): Promise<TriggerRunRecord | null>;
   };

   webhooks: {
      list(options?: TriggerWebhookListOptions): Promise<TriggerWebhookEventRecord[]>;
      latest(): Promise<TriggerWebhookEventRecord | null>;
   };
}

interface TriggerCrudApi {
   list(options?: { limit?: number; enabled?: boolean }): Promise<TriggerRecord[]>;
   create(input: TriggerCreateInput): Promise<TriggerHandle>;
   byName(name: string): Promise<TriggerHandle>; // throws if not found
   delete(name: string): Promise<{ success: true; id: string }>;
}

interface Ctx {
   trigger?: TriggerExecutionContext;
   triggers: TriggerCrudApi;
}
```

## Minimal Example

```ts
// Inspect recent webhook payloads to understand shape
const t = await ctx.triggers.byName("Inbound Lead Webhook");
const recent = await t.webhooks.list({ limit: 10 });
const samplePayload = recent[0]?.payload;

// Trigger code: push minimal data, let columns do the work
await t.update({
   code: `
const leads = Array.isArray(ctx.trigger.payload) ? ctx.trigger.payload : [ctx.trigger.payload];
const sheet = await ctx.sheet("Inbound Leads");
await sheet.addRows(
  leads.map(l => ({ "Name": l.name, "Email": l.email, "Source": "webhook" })),
  { run: true }
);
return { pushed: leads.length };
`
});
// Then create enrichment columns on "Inbound Leads" to do the actual work
```
