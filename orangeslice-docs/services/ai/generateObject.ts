/** Credits: 1 (low) or 10 (medium) */

/**
 * Generate an object using AI.
 * Does NOT have internet access.
 * IMPORTANT: Always incorporate the user's guidelines (i.e. no fabrication, writing style, format) into your prompt. See index.md.
 * Use a regular JSON schema object for `schema`.
 *
 * ⚠️ IMPORTANT: ONE CALL PER ITEM ⚠️
 * NEVER batch multiple items together and ask the AI to return an array of results.
 * This is an anti-pattern that leads to lower quality outputs and harder error handling.
 *
 * ❌ BAD: Sending 10 companies in one prompt → expecting array of 10 analyses
 * ✅ GOOD: Calling generateObject once per company → 10 separate calls
 *
 * If you need to process multiple items, loop over them and call generateObject
 * for each one individually. The runtime handles parallelization for you.
 *
 * The field will be present in the output but can have a null value when the AI has no data.
 *
 * Intelligence guidance:
 * - Prefer `low` for classification, tagging, extraction, normalization, and other constrained schema-filling tasks.
 * - Prefer `medium` for more nuanced generation quality, like writing outreach hooks, personalized messaging, or other higher-judgment copy that still returns structured fields.
 */
type generateObject = (params: {
   /** The prompt to generate the object from */
   prompt: string;
   /** A JSON schema object describing the output shape */
   schema: any;
   /** Optional intelligence level. Defaults to "low" (gpt-5-mini, 1 credit). Prefer `low` for classification/extraction and `medium` for higher-quality writing tasks like outreach (gemini-3-flash-preview, 10 credits). */
   intelligence?: "low" | "medium";
}) => Promise<{ object: Record<string, any> }>;
