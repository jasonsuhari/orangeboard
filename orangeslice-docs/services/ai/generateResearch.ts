/** Credits: 1-2 (custom). GPT-5 costs 2 credits; other models cost 1. 0 if invalid. */

/**
 * Do deep research with web access using AI.
 * IMPORTANT: Always incorporate the user's guidelines (i.e. no fabrication, writing style, format) into your query. See index.md.
 */
type generateResearch = (params: {
   /** The query to generate the research report from */
   query: string;
}) => Promise<{ content: string }>;
