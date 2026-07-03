import { NextRequest, NextResponse } from "next/server";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

/* Landing-page waitlist capture. Emails are appended to a gitignored JSONL file
   in dev; swap the persistence for Convex / an ESP when wiring it up for real. */

const schema = z.object({
  email: z.string().trim().email(),
  source: z.string().max(64).optional(),
});

const FILE = join(process.cwd(), ".waitlist.local.jsonl");

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 422 });
  }

  const entry = {
    email: parsed.data.email.toLowerCase(),
    source: parsed.data.source ?? "landing",
    ts: new Date().toISOString(),
  };

  try {
    await appendFile(FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    console.error("[waitlist] persist failed", err);
  }
  console.log("[waitlist] joined:", entry.email);

  return NextResponse.json({ ok: true });
}
