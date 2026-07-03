/* Shared OpenAI chat-completions scaffolding for server code that asks for a
   JSON object response (company brief, vision simulate, pedestrian agent). */

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export type OpenAIChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

export interface OpenAIChatMessage {
  role: "system" | "user" | "assistant";
  content: string | OpenAIChatContentPart[];
}

/** POST a chat-completions request with `response_format: json_object` and
 *  return the first choice's message content (`"{}"` when missing). Throws
 *  `Error("<errorLabel>: <status> <body>")` on a non-2xx response. */
export async function callOpenAIChatJSON({
  apiKey,
  model,
  messages,
  temperature,
  timeoutMs,
  errorLabel,
}: {
  apiKey: string;
  model: string;
  messages: OpenAIChatMessage[];
  temperature: number;
  timeoutMs: number;
  errorLabel: string;
}): Promise<string> {
  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${errorLabel}: ${res.status} ${await res.text()}`);

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "{}";
}
