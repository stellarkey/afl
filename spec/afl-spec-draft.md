# AFL-MD Syntax Specification (Draft v0.1)

> Agent Filesystem Language — Markdown Superset

## 1. Design Goals

- **Markdown-native**: Any valid Markdown is valid AFL-MD.
- **Minimal additions**: Only three new syntactic constructs.
- **Human-readable**: No binary formats, no custom editors needed.
- **Machine-actionable**: Frontmatter provides structured metadata for indexing.

## 2. Node Format

Every AFL node is a single file (`.md` extension) with an optional YAML frontmatter block.

```
---
id: "<unique-node-id>"
type: <memory | skill | config | knowledge | entity>
created_at: <ISO-8601>
last_accessed: <ISO-8601>
access_frequency: <integer>
refs: [<node-id>, ...]
back_refs: [<node-id>, ...]    # auto-maintained by runtime
tags: [<string>, ...]
embedding_hash: "<algo:hash>"  # optional, for vector index
summary: "<one-line summary>"  # optional, for DEPTH 0 reads
---

# Node Title

Content in standard Markdown...
```

### 2.1 Required Fields
- `id`: Globally unique identifier. Convention: `node-<type>-<kebab-case-name>`.
- `type`: One of the defined node types.

### 2.2 Auto-maintained Fields
The runtime automatically updates:
- `last_accessed`: Timestamp of last READ operation.
- `access_frequency`: Incremented on each READ.
- `back_refs`: Populated when another node adds this node to its `refs`.

## 3. Reference Syntax

### 3.1 Strong Reference: `[[node-id]]`
A direct, explicit link to another node. The runtime maintains bidirectional integrity.

```markdown
See [[node-skill-git-rebase]] for conflict resolution strategies.
```

**Behavior**:
- At DEPTH n, if n > current depth, the referenced node's content is inlined.
- At DEPTH 0, rendered as a clickable link with the node's `summary`.
- Runtime adds current node to the target's `back_refs`.

### 3.2 Dynamic Reference: `((query))`
A semantic search query evaluated at read-time.

```markdown
For related debugging techniques, see ((python async error handling patterns)).
```

**Behavior**:
- At read-time, the runtime performs a semantic search against all nodes.
- Top-k results are injected as a ranked list of `[[node-id]]` links.
- Results are NOT cached by default (fresh on each read).
- Optional: `((query | top=3 | type=knowledge))` for filtered search.

### 3.3 Inline Attribute: `@attr(key: value)`
Adds structured metadata to a specific paragraph or section.

```markdown
This approach works best for repositories under 10GB. @attr(confidence: 0.85)
The optimal batch size is 32. @attr(source: "experiment-2026-04-01", verified: true)
```

**Behavior**:
- Parsed into a key-value map associated with the preceding text block.
- Queryable via the runtime API.
- Does not affect Markdown rendering (treated as invisible annotation).

## 4. Read Protocol

### 4.1 Depth-controlled Reading

```
READ <node-id> [DEPTH <n>] [FILTER <type>]
```

| Depth | Returns |
|-------|---------|
| 0 | Frontmatter (`id`, `type`, `summary`, `tags`) only |
| 1 | Full node content; `[[refs]]` remain as links |
| 2 | Full content + inline expansion of all `[[refs]]` at their DEPTH 1 |
| n | Recursive expansion up to n levels |

### 4.2 Expand on Demand

```
EXPAND [[node-id]]
```
Fetches and inlines a single referenced node without re-reading the parent.

### 4.3 Semantic Query

```
QUERY "natural language question" [TOP <k>] [TYPE <filter>]
```
Returns ranked list of node summaries matching the query.

## 5. Evolution Primitives

### 5.1 Consolidation

```
CONSOLIDATE [<node-id>, ...] INTO <new-node-id>
  STRATEGY: <summarize | merge | abstract>
```
Combines multiple nodes into a higher-level summary node. Original nodes gain a `synthesized_into` field.

### 5.2 Decay

```
DECAY <node-id> TO <level>
```
Levels: `hot` (L1, full index) → `warm` (L2, summary only) → `cold` (L3, archived).

### 5.3 Link Strengthening

```
STRENGTHEN [[node-a]] <-> [[node-b]] BY <delta>
```
Manually boost the association weight between two nodes. Normally handled automatically by co-access patterns.

## 6. File Layout Compatibility

AFL nodes can coexist with traditional directory structures:

```
project/
├── .afl/                    # AFL runtime data
│   ├── index.json           # Node registry & graph edges
│   ├── vectors/             # Embedding cache
│   └── access_log.jsonl     # Access telemetry
├── memory/
│   └── core.md              # type: memory
├── skills/
│   ├── git-workflow.md      # type: skill
│   └── deploy-pipeline.md   # type: skill
├── knowledge/
│   └── python-patterns.md   # type: knowledge
└── diary/
    ├── 2026-04-01.md         # type: memory (auto-tagged)
    └── 2026-04-07.md
```

Directories are optional organizational hints. The AFL runtime ignores directory structure and relies solely on `id` and `refs` for navigation.

## 7. Open Questions

1. **Conflict resolution**: When two agents simultaneously modify the same node's `refs`, which wins?
2. **Garbage collection**: Should cold nodes ever be permanently deleted, or only archived?
3. **Schema evolution**: How does the frontmatter schema itself evolve without breaking existing nodes?
4. **Privacy boundaries**: Can certain nodes be marked as non-traversable by specific agents?
5. **Cross-workspace federation**: Can AFL nodes reference nodes in other workspaces/repos?

---

*Draft v0.1 — Comments and RFCs welcome.*
