---
description: AI text generation, structured output, and deep research
---

# AI Services

**Credits: 1 per call (standard). `generateResearch` with GPT-5 costs 2.**

## Methods

- **generateObject** - Generate structured data - preferred for precise outputs
- **generateText** - Freeform output - preferred when you need the AI to have lightweight web research ability
- **generateResearch** - For heavy deep research tasks requiring browsing multiple websites / sources

## Follow user guidelines for prompt creation

When the user provides specific instructions for AI-generated content, you MUST explicitly include those constraints in your prompts. Common user guidelines include:

- **No fabrication**: If the user says "don't make up information" or "only use verified data", your prompt must explicitly instruct the AI to return null/empty for fields it cannot verify
- **Writing style**: If the user specifies "no em dashes", "no exclamation points", "formal tone", etc., include these exact constraints in the prompt
- **Format requirements**: If the user wants bullet points, paragraphs, or specific structures, specify this explicitly
