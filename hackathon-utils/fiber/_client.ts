const BASE = "https://api.fiber.ai";

function apiKey() {
  const key = process.env.FIBER_API_KEY;
  if (!key) throw new Error("FIBER_API_KEY not set in environment");
  return key;
}

export async function fiberPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: apiKey(), ...body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fiber API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fiberGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ apiKey: apiKey(), ...params }).toString();
  const res = await fetch(`${BASE}${path}?${qs}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fiber API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface FiberCompanyResult {
  linkedin_primary_slug: string | null;
  domains: string[];
  employee_count_consensus: number | null;
  li_category: string | null;
  latest_funding_consensus: {
    total_usd: number | null;
    stage: string | null;
    last_round_date: string | null;
  } | null;
}

export interface FiberPersonResult {
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  headline: string | null;
  current_job: {
    title: string | null;
    company_name: string | null;
    company_domain: string | null;
  } | null;
  linkedin_url: string | null;
}
