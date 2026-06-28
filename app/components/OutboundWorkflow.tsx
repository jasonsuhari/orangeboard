"use client";

import { useEffect, useMemo, useState } from "react";

export type OutboundWorkflowStatus = "drafted" | "approved" | "sent" | "replied";
type QueueDecision = "pending" | "approved" | "rejected";
type PushProvider = "hubspot" | "salesforce" | "instantly";
type InstantlyTargetType = "campaign" | "list";

export interface OutboundSeedRow {
  id?: string;
  account: string;
  domain?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  fundingSummary?: string;
  contactName?: string | null;
  contactTitle?: string | null;
  email?: string | null;
  hook: string;
  subject?: string | null;
  pitch?: string | null;
  source?: "live" | "staged";
}

interface OutboundQueueItem extends OutboundSeedRow {
  id: string;
  status: OutboundWorkflowStatus;
  decision: QueueDecision;
  subject: string;
  pitch: string;
  pitchEdited: boolean;
  pushedTo: PushProvider[];
  pushedAt?: string;
  externalIds?: Partial<Record<PushProvider, string>>;
  createdAt: string;
  updatedAt: string;
}

interface QueueEnvelope {
  campaignKey: string;
  seedSignature: string;
  updatedAt: string;
  items: OutboundQueueItem[];
}

interface CampaignHistoryEntry {
  campaignKey: string;
  campaignName: string;
  companyName: string;
  opportunityTitle: string;
  boardLocation: string;
  updatedAt: string;
  counts: Record<OutboundWorkflowStatus, number> & { rejected: number };
  accounts: Array<{
    account: string;
    status: OutboundWorkflowStatus;
    decision: QueueDecision;
  }>;
}

interface PushResponse {
  configured?: boolean;
  error?: string;
  provider?: PushProvider;
  pushed?: number;
  results?: Array<{
    id: string;
    success: boolean;
    externalId?: string;
    error?: string;
  }>;
}

const HISTORY_KEY = "orangeboard:campaign-history";
const STATUS_LABELS: OutboundWorkflowStatus[] = ["drafted", "approved", "sent", "replied"];

export default function OutboundWorkflow({
  campaignKey,
  campaignName,
  companyName,
  opportunityTitle,
  opportunityArea,
  boardLocation,
  boardAddress,
  seedRows,
  loading,
  error,
  unconfigured,
  onGenerate,
}: {
  campaignKey: string;
  campaignName: string;
  companyName: string;
  opportunityTitle: string;
  opportunityArea: string;
  boardLocation: string;
  boardAddress: string;
  seedRows: OutboundSeedRow[];
  loading: boolean;
  error: string | null;
  unconfigured: boolean;
  onGenerate: () => void;
}) {
  const storageKey = useMemo(() => `orangeboard:outbound-workflow:${campaignKey}`, [campaignKey]);
  const seedSignature = useMemo(() => signatureFor(seedRows), [seedRows]);
  const [items, setItems] = useState<OutboundQueueItem[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [history, setHistory] = useState<CampaignHistoryEntry[]>([]);
  const [provider, setProvider] = useState<PushProvider>("hubspot");
  const [instantlyTargetType, setInstantlyTargetType] = useState<InstantlyTargetType>("campaign");
  const [instantlyTargetId, setInstantlyTargetId] = useState("");
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  useEffect(() => {
    const seeded = seedRows.map((row, index) =>
      makeQueueItem(row, index, {
        boardLocation,
        opportunityArea,
      }),
    );
    const saved = readQueue(storageKey);
    const nextItems = saved ? mergeSavedItems(seeded, saved.items) : seeded;
    setItems(nextItems);
    setLoadedKey(campaignKey);
    setPushMessage(null);
  }, [boardLocation, campaignKey, opportunityArea, seedRows, seedSignature, storageKey]);

  useEffect(() => {
    if (loadedKey !== campaignKey) return;
    const envelope: QueueEnvelope = {
      campaignKey,
      seedSignature,
      updatedAt: new Date().toISOString(),
      items,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(envelope));
    } catch {
      /* storage may be unavailable */
    }
  }, [campaignKey, items, loadedKey, seedSignature, storageKey]);

  const counts = useMemo(() => countStatuses(items), [items]);
  const pushableItems = useMemo(
    () => items.filter((item) => item.decision === "approved" && item.status === "approved"),
    [items],
  );
  const pushedProviders = useMemo(
    () => [...new Set(items.flatMap((item) => item.pushedTo))],
    [items],
  );
  const pushDisabled =
    pushLoading ||
    pushableItems.length === 0 ||
    (provider === "instantly" && !instantlyTargetId.trim());

  function updateItem(id: string, patch: Partial<OutboundQueueItem>) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  }

  function setStatus(id: string, status: OutboundWorkflowStatus) {
    updateItem(id, {
      status,
      decision: status === "drafted" ? "pending" : "approved",
    });
  }

  function approveItem(id: string) {
    updateItem(id, { decision: "approved", status: "approved" });
  }

  function rejectItem(id: string) {
    updateItem(id, { decision: "rejected", status: "drafted" });
  }

  function restoreItem(id: string) {
    updateItem(id, { decision: "pending", status: "drafted" });
  }

  function updatePitch(id: string, field: "subject" | "pitch", value: string) {
    updateItem(id, { [field]: value, pitchEdited: true } as Partial<OutboundQueueItem>);
  }

  function approveAllDrafts() {
    setItems((current) =>
      current.map((item) =>
        item.decision === "rejected"
          ? item
          : {
              ...item,
              decision: "approved",
              status: item.status === "drafted" ? "approved" : item.status,
              updatedAt: new Date().toISOString(),
            },
      ),
    );
  }

  function exportCsv() {
    const csv = toCsv(items, {
      campaignName,
      companyName,
      opportunityTitle,
      boardLocation,
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(campaignName)}-outbound-queue.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function saveHistory(nextItems = items, message = "Campaign history saved.") {
    const entry = makeHistoryEntry(nextItems, {
      campaignKey,
      campaignName,
      companyName,
      opportunityTitle,
      boardLocation,
    });
    const nextHistory = upsertHistory(entry);
    setHistory(nextHistory);
    setPushMessage(message);
  }

  async function pushApproved() {
    if (pushDisabled) return;
    setPushLoading(true);
    setPushMessage(null);

    try {
      const response = await fetch("/api/outbound/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          campaign: {
            key: campaignKey,
            name: campaignName,
            companyName,
            opportunityTitle,
            opportunityArea,
            boardLocation,
            boardAddress,
          },
          instantly: {
            targetType: instantlyTargetType,
            targetId: instantlyTargetId.trim(),
          },
          items: pushableItems,
        }),
      });

      const payload = (await response.json()) as PushResponse;
      if (!payload.configured) {
        throw new Error(payload.error ?? "ORANGESLICE_API_KEY is required before pushing integrations.");
      }
      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? `Push failed (${response.status})`);
      }

      const successful = new Set(
        (payload.results ?? [])
          .filter((result) => result.success)
          .map((result) => result.id),
      );
      const externalIds = new Map(
        (payload.results ?? [])
          .filter((result) => result.success && result.externalId)
          .map((result) => [result.id, result.externalId as string]),
      );
      const fallbackAllSucceeded = successful.size === 0 && (payload.pushed ?? 0) > 0;
      const pushedAt = new Date().toISOString();

      setItems((current) => {
        const next = current.map((item) => {
          if (!pushableItems.some((pushable) => pushable.id === item.id)) return item;
          if (!fallbackAllSucceeded && !successful.has(item.id)) return item;
          return {
            ...item,
            status: "sent" as const,
            decision: "approved" as const,
            pushedAt,
            pushedTo: [...new Set([...item.pushedTo, provider])],
            externalIds: {
              ...item.externalIds,
              ...(externalIds.get(item.id) ? { [provider]: externalIds.get(item.id) } : {}),
            },
            updatedAt: pushedAt,
          };
        });
        saveHistory(next, `Pushed ${payload.pushed ?? pushableItems.length} account${(payload.pushed ?? pushableItems.length) === 1 ? "" : "s"} to ${providerLabel(provider)}.`);
        return next;
      });
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : "Push failed.");
    } finally {
      setPushLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5">
        {STATUS_LABELS.map((status) => (
          <div key={status} className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-center">
            <p className="text-sm font-bold text-ink">{counts[status]}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase text-neutral-400">{status}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ink px-3 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshIcon />
          {loading ? "Matching..." : "Generate"}
        </button>
        <button
          type="button"
          onClick={approveAllDrafts}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-xs font-semibold text-ink transition hover:bg-neutral-50"
        >
          <CheckIcon />
          Approve all
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-xs font-semibold text-ink transition hover:bg-neutral-50"
        >
          <DownloadIcon />
          CSV
        </button>
        <button
          type="button"
          onClick={() => saveHistory()}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-xs font-semibold text-ink transition hover:bg-neutral-50"
        >
          <ArchiveIcon />
          Save
        </button>
      </div>

      {unconfigured && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
          Set <code className="font-mono">ORANGESLICE_API_KEY</code> and{" "}
          <code className="font-mono">FIBER_API_KEY</code> for live matching. The saved workflow below still works with staged accounts.
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-relaxed text-red-700">
          {error}
        </p>
      )}

      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2">
        <div className="grid gap-2">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                Push target
              </span>
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value as PushProvider)}
                className="h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-xs font-semibold text-ink outline-none focus:border-orange-500"
              >
                <option value="hubspot">HubSpot</option>
                <option value="salesforce">Salesforce</option>
                <option value="instantly">Instantly</option>
              </select>
            </label>
            <button
              type="button"
              onClick={pushApproved}
              disabled={pushDisabled}
              className="mt-5 inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600"
            >
              <UploadIcon />
              {pushLoading ? "Pushing..." : `Push ${pushableItems.length}`}
            </button>
          </div>

          {provider === "instantly" && (
            <div className="grid grid-cols-[92px_1fr] gap-2">
              <select
                value={instantlyTargetType}
                onChange={(event) => setInstantlyTargetType(event.target.value as InstantlyTargetType)}
                className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs font-semibold text-ink outline-none focus:border-orange-500"
              >
                <option value="campaign">Campaign</option>
                <option value="list">List</option>
              </select>
              <input
                value={instantlyTargetId}
                onChange={(event) => setInstantlyTargetId(event.target.value)}
                placeholder={instantlyTargetType === "campaign" ? "Instantly campaign ID" : "Instantly list ID"}
                className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs text-ink outline-none placeholder:text-neutral-400 focus:border-orange-500"
              />
            </div>
          )}
        </div>
        <p className="mt-2 text-[11px] text-neutral-500">
          Push uses approved rows only. Sent and replied rows stay in history.
        </p>
      </div>

      {pushMessage && (
        <p className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-neutral-700">
          {pushMessage}
        </p>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <article
            key={item.id}
            className={
              "rounded-md border bg-white p-3 transition " +
              (item.decision === "rejected" ? "border-neutral-200 opacity-55" : "border-neutral-200")
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.account}</p>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {item.contactName ?? "Contact pending"}
                  {item.contactTitle ? ` | ${item.contactTitle}` : ""}
                </p>
              </div>
              <select
                value={item.status}
                onChange={(event) => setStatus(item.id, event.target.value as OutboundWorkflowStatus)}
                disabled={item.decision === "rejected"}
                className="h-7 shrink-0 rounded-md border border-neutral-200 bg-neutral-50 px-2 text-[11px] font-semibold text-neutral-700 outline-none focus:border-orange-500 disabled:opacity-50"
              >
                {STATUS_LABELS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {(item.industry || item.fundingSummary || item.email) && (
              <p className="mt-1 truncate text-[11px] text-neutral-400">
                {[item.industry, item.fundingSummary, item.email].filter(Boolean).join(" | ")}
              </p>
            )}

            <p className="mt-2 text-xs leading-relaxed text-neutral-600">{item.hook}</p>

            <label className="mt-2 block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                Subject
              </span>
              <input
                value={item.subject}
                onChange={(event) => updatePitch(item.id, "subject", event.target.value)}
                disabled={item.decision === "rejected"}
                className="h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-xs text-ink outline-none focus:border-orange-500 disabled:bg-neutral-100"
              />
            </label>

            <label className="mt-2 block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                Pitch
              </span>
              <textarea
                value={item.pitch}
                onChange={(event) => updatePitch(item.id, "pitch", event.target.value)}
                rows={4}
                disabled={item.decision === "rejected"}
                className="w-full resize-none rounded-md border border-neutral-200 bg-white px-2 py-2 text-xs leading-relaxed text-neutral-700 outline-none focus:border-orange-500 disabled:bg-neutral-100"
              />
            </label>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {item.decision === "rejected" ? (
                  <button
                    type="button"
                    onClick={() => restoreItem(item.id)}
                    className="h-7 rounded-md border border-neutral-200 bg-white px-2 text-[11px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Restore
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => approveItem(item.id)}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-green-600 px-2 text-[11px] font-semibold text-white transition hover:bg-green-700"
                    >
                      <CheckIcon />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectItem(item.id)}
                      className="h-7 rounded-md border border-neutral-200 bg-white px-2 text-[11px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-neutral-400">
                <span>{item.source === "live" ? "live" : "staged"}</span>
                {item.pushedTo.length > 0 && <span>pushed: {item.pushedTo.map(providerLabel).join(", ")}</span>}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-ink">Campaign history</p>
          <span className="text-[10px] font-semibold uppercase text-neutral-400">
            {history.length} saved
          </span>
        </div>
        {history.length === 0 ? (
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
            Saved campaigns will appear here after review or push.
          </p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {history.slice(0, 3).map((entry) => (
              <div key={entry.campaignKey} className="rounded-md border border-neutral-200 bg-white px-2 py-2">
                <p className="truncate text-xs font-semibold text-ink">{entry.campaignName}</p>
                <p className="mt-0.5 text-[10px] text-neutral-500">
                  {entry.counts.approved} approved | {entry.counts.sent} sent | {entry.counts.replied} replied | {formatDate(entry.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
        {pushedProviders.length > 0 && (
          <p className="mt-2 text-[11px] text-neutral-500">
            Last pushed to {pushedProviders.map(providerLabel).join(", ")}.
          </p>
        )}
      </div>
    </div>
  );
}

function makeQueueItem(
  row: OutboundSeedRow,
  index: number,
  context: { boardLocation: string; opportunityArea: string },
): OutboundQueueItem {
  const now = new Date().toISOString();
  const id = row.id ?? stableRowId(row, index);
  const subject = row.subject?.trim() || `Quick idea for ${row.account} near ${context.opportunityArea}`;
  const pitch =
    row.pitch?.trim() ||
    [
      "Hi {{first_name}},",
      "",
      row.hook,
      "",
      `We selected ${context.boardLocation} because the local account context lines up with teams like yours.`,
      "",
      "Worth a quick look at the board mockup and visibility read?",
    ].join("\n");

  return {
    ...row,
    id,
    subject,
    pitch,
    status: "drafted",
    decision: "pending",
    pitchEdited: false,
    pushedTo: [],
    createdAt: now,
    updatedAt: now,
  };
}

function mergeSavedItems(seeded: OutboundQueueItem[], saved: OutboundQueueItem[]): OutboundQueueItem[] {
  const byId = new Map(saved.map((item) => [item.id, item]));
  const seededIds = new Set(seeded.map((item) => item.id));
  const merged = seeded.map((fresh) => {
    const existing = byId.get(fresh.id);
    if (!existing) return fresh;
    return {
      ...fresh,
      decision: existing.decision,
      status: existing.status,
      subject: existing.pitchEdited ? existing.subject : fresh.subject,
      pitch: existing.pitchEdited ? existing.pitch : fresh.pitch,
      pitchEdited: existing.pitchEdited,
      pushedTo: existing.pushedTo ?? [],
      pushedAt: existing.pushedAt,
      externalIds: existing.externalIds,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    };
  });
  const preserved = saved.filter((item) => !seededIds.has(item.id));
  return [...merged, ...preserved];
}

function countStatuses(items: OutboundQueueItem[]): Record<OutboundWorkflowStatus, number> & { rejected: number } {
  const counts = {
    drafted: 0,
    approved: 0,
    sent: 0,
    replied: 0,
    rejected: 0,
  };
  for (const item of items) {
    if (item.decision === "rejected") {
      counts.rejected += 1;
    } else {
      counts[item.status] += 1;
    }
  }
  return counts;
}

function readQueue(key: string): QueueEnvelope | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as QueueEnvelope) : null;
  } catch {
    return null;
  }
}

function readHistory(): CampaignHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as CampaignHistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function upsertHistory(entry: CampaignHistoryEntry): CampaignHistoryEntry[] {
  const current = readHistory().filter((item) => item.campaignKey !== entry.campaignKey);
  const next = [entry, ...current].slice(0, 12);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* storage may be unavailable */
  }
  return next;
}

function makeHistoryEntry(
  items: OutboundQueueItem[],
  meta: {
    campaignKey: string;
    campaignName: string;
    companyName: string;
    opportunityTitle: string;
    boardLocation: string;
  },
): CampaignHistoryEntry {
  return {
    campaignKey: meta.campaignKey,
    campaignName: meta.campaignName,
    companyName: meta.companyName,
    opportunityTitle: meta.opportunityTitle,
    boardLocation: meta.boardLocation,
    updatedAt: new Date().toISOString(),
    counts: countStatuses(items),
    accounts: items.map((item) => ({
      account: item.account,
      status: item.status,
      decision: item.decision,
    })),
  };
}

function toCsv(
  items: OutboundQueueItem[],
  meta: {
    campaignName: string;
    companyName: string;
    opportunityTitle: string;
    boardLocation: string;
  },
): string {
  const rows = [
    [
      "campaign",
      "advertiser",
      "opportunity",
      "board",
      "account",
      "domain",
      "decision",
      "status",
      "contact_name",
      "contact_title",
      "email",
      "subject",
      "pitch",
      "hook",
      "pushed_to",
    ],
    ...items.map((item) => [
      meta.campaignName,
      meta.companyName,
      meta.opportunityTitle,
      meta.boardLocation,
      item.account,
      item.domain ?? "",
      item.decision,
      item.status,
      item.contactName ?? "",
      item.contactTitle ?? "",
      item.email ?? "",
      item.subject,
      item.pitch,
      item.hook,
      item.pushedTo.map(providerLabel).join("; "),
    ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function signatureFor(rows: OutboundSeedRow[]): string {
  return rows
    .map((row, index) => `${stableRowId(row, index)}:${row.subject ?? ""}:${row.pitch ?? ""}`)
    .join("|");
}

function stableRowId(row: OutboundSeedRow, index: number): string {
  return [
    slugify(row.account),
    slugify(row.domain ?? row.email ?? row.contactName ?? String(index)),
  ]
    .filter(Boolean)
    .join(":");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "campaign";
}

function providerLabel(provider: PushProvider): string {
  if (provider === "hubspot") return "HubSpot";
  if (provider === "salesforce") return "Salesforce";
  return "Instantly";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function RefreshIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 12a9 9 0 0 1-15.4 6.4M3 12A9 9 0 0 1 18.4 5.6M18 3v5h-5M6 21v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21V9M7 14l5-5 5 5M5 5h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M6 7v13h12V7M9 11h6M8 4h8l1 3H7l1-3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
