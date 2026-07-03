import type { NextRequest } from "next/server";

/** Parse a JSON request body, returning `null` when the body is missing or
 *  malformed. The value is wrapped so callers can tell a literal JSON `null`
 *  body (`{ body: null }`) apart from a parse failure (`null`) and keep their
 *  own error responses. */
export async function parseJsonBody<T>(req: NextRequest): Promise<{ body: T } | null> {
  try {
    return { body: (await req.json()) as T };
  } catch {
    return null;
  }
}
