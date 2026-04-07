---
id: "node-knowledge-context-window-management"
type: knowledge
created_at: 2026-04-07T12:00:00+08:00
last_accessed: 2026-04-07T12:00:00+08:00
access_frequency: 1
refs:
  - "node-knowledge-transformer-attention"
back_refs: []
tags: ["llm", "context-window", "optimization"]
summary: "Strategies for managing LLM context window usage efficiently."
synthesized_from:
  - "diary-2026-04-01"
  - "diary-2026-04-03"
  - "diary-2026-04-05"
---

# Context Window Management Strategies

Synthesized from 3 debugging sessions (April 1-5, 2026).

## Key Findings

### 1. Progressive Disclosure Saves ~60% Tokens
Loading only summaries first and expanding on demand reduces average context usage from 45K to 18K tokens per task. @attr(source: "experiment-2026-04-03", confidence: 0.88)

### 2. The "Lost in the Middle" Problem
Models perform worse on information placed in the middle of long contexts. Place critical instructions at the **beginning** or **end** of the prompt.

### 3. Recursive Summarization Has Diminishing Returns
After 3 levels of compression, the summary loses actionable detail. Optimal depth: 2 levels for most knowledge nodes.

## Related
- [[node-knowledge-transformer-attention]] : Why attention patterns degrade with length
- ((recent papers on efficient context management))
