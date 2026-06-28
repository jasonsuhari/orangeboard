/** Credits: 1 (low) or 10 (medium) */

/**
 * Generate text using AI, optionally with web search.
 * IMPORTANT: Always incorporate the user's guidelines (i.e. no fabrication, writing style, format) into your prompt. See index.md.
 *
 * Intelligence guidance:
 * - Prefer `low` for classification-like prompts, terse transformations, extraction-adjacent formatting, and other constrained text tasks.
 * - Prefer `medium` for higher-quality writing tasks like outreach, hooks, personalized messaging, and nuanced copy generation.
 */
type generateText = (params: {
   /** The prompt to generate the text from */
   prompt: string;
   /** Whether to enable web search */
   enableWebSearch?: boolean;
   /** Optional intelligence level. Defaults to "low" (gpt-5-mini, 1 credit). Prefer `low` for constrained text tasks and `medium` for higher-quality writing like outreach (gemini-3-flash-preview, 10 credits). */
   intelligence?: "low" | "medium";
}) => Promise<{ text: string }>;
