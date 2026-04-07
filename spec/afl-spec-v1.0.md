# AFL-MD Syntax Specification v1.0

> Agent Filesystem Language — A Markdown Superset for Agent-Native Knowledge Organization

**Status**: v1.0 (Reference Implementation Available)
**Date**: 2026-04-07
**Reference Implementation**: `packages/afl-core`

---

## 1. Design Goals

- **Markdown-native**: Any valid Markdown is valid AFL-MD. The additions are strictly additive.
- **Minimal additions**: Exactly three new syntactic constructs (strong ref, dynamic ref, inline attr).
- **Human-readable**: No binary formats, no custom editors required.
- **Machine-actionable**: YAML frontmatter provides structured metadata for programmatic indexing.
- **Backward-compatible**: AFL-MD files render correctly in any Markdown viewer; the new syntax appears as inline text.

## 2. Node Format

Every AFL node is a single `.md` file with a **required** YAML frontmatter block.

```yaml
---
# === Required ===
id: "<unique-node-id>"             # Convention: node-<type>-<kebab-case-name>
type: <memory | skill | config | knowledge | entity>

# === Auto-maintained by runtime ===
created_at: <ISO-8601>             # Set once on creation
last_accessed: <ISO-8601>          # Updated on each READ
access_frequency: <integer>        # Incremented on each READ
back_refs: [<node-id>, ...]        # Computed from other nodes' refs/strong references

# === Optional ===
refs: [<node-id>, ...]             # Explicit outgoing references
tags: [<string>, ...]              # Freeform tags for filtering
summary: "<one-line summary>"      # Used for DEPTH 0 reads
embedding_hash: "<algo:hash>"      # Content vector fingerprint for semantic search
decay_level: <hot | warm | cold>   # Storage tier (default: hot)
synthesized_from: [<node-id>, ...] # Source nodes if this is a consolidated summary
synthesized_into: "<node-id>"      # Target node if this was consolidated
---

# Node Title

Content in standard Markdown...
```

### 2.1 Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Globally unique identifier. Convention: `node-<type>-<kebab-case-name>` |
| `type` | enum | One of: `memory`, `skill`, `config`, `knowledge`, `entity` |

### 2.2 Auto-maintained Fields

The runtime automatically updates these fields. They may be manually set in the file, but will be overwritten by runtime operations.

| Field | Trigger | Description |
|-------|---------|-------------|
| `last_accessed` | READ | ISO-8601 timestamp of the most recent read |
| `access_frequency` | READ | Monotonically incrementing counter |
| `back_refs` | SCAN | Computed from all other nodes' `refs` and `[[...]]` references |

### 2.3 Extensibility

The frontmatter schema is open. Any additional YAML keys are preserved by the parser and available through the API. This allows domain-specific metadata without breaking the core spec.

```yaml
---
id: "node-config-api-keys"
type: config
security_level: "restricted"       # custom field
owner: "agent-42"                  # custom field
---
```

## 3. Reference Syntax

All references are extracted from the Markdown body. References inside fenced code blocks (`` ``` ``) or inline code (`` ` ``) are **ignored** by the parser.

### 3.1 Strong Reference: `[[node-id]]`

A direct, explicit link to another node.

```markdown
See [[node-skill-git-rebase]] for conflict resolution strategies.
```

**Semantics**:
- Creates a bidirectional link: the source gains a body reference, the target gains a `back_ref`.
- At DEPTH > 1, the referenced node's content is recursively inlined.
- At DEPTH 0-1, rendered as an unexpanded link.
- Whitespace inside brackets is trimmed: `[[ node-x ]]` resolves to `node-x`.

### 3.2 Dynamic Reference: `((query [| key=val]*))`

A semantic search query evaluated at read-time.

```markdown
For related techniques, see ((python async error handling patterns)).
With filters: ((git tips | top=5 | type=skill)).
```

**Semantics**:
- At read-time, the runtime performs a semantic search against all indexed nodes.
- Top-k results are returned as a ranked list (the runtime decides how to present them).
- Results are **not cached** — each read produces fresh results.
- Optional pipe-delimited filters constrain the search (e.g., `top`, `type`, `tags`).
- Dynamic references do NOT create bidirectional links.

### 3.3 Inline Attribute: `@attr(key: val [, key: val]*)`

Paragraph-level structured metadata annotation.

```markdown
The optimal batch size is 32. @attr(confidence: 0.85, source: "experiment-2026-04-01")
This has been verified. @attr(verified: true)
```

**Semantics**:
- Parsed into a key-value map associated with the preceding text block.
- Value types: strings (quoted or unquoted), numbers, booleans (`true`/`false`).
- Queryable via the runtime API for structured knowledge retrieval.
- Does not affect standard Markdown rendering (appears as plain text in viewers).

### 3.4 Syntax Summary

| Syntax | Kind | Creates back_ref? | Evaluated at |
|--------|------|-------------------|-------------|
| `[[node-id]]` | Strong reference | Yes | Parse time |
| `((query \| filters))` | Dynamic reference | No | Read time |
| `@attr(k: v)` | Inline attribute | No | Parse time |

## 4. Read Protocol

### 4.1 Depth-Controlled Reading

```
read(nodeId, { depth, filterType?, maxExpand? })
```

| Depth | Behavior | Use Case |
|-------|----------|----------|
| 0 | Frontmatter only (`id`, `type`, `summary`, `tags`). Body is empty. | Index browsing, listing |
| 1 | Full node content. `[[refs]]` remain as link syntax. | Default read |
| 2 | Full content + all `[[refs]]` expanded at DEPTH 1 | Context loading |
| n | Recursive expansion up to n levels | Deep exploration |

**Cycle protection**: If node A references node B which references node A, the recursive expansion stops at already-visited nodes. No infinite loops.

**maxExpand**: Limits the number of nodes expanded at each level (default: 50). Prevents explosion in highly-connected graphs.

### 4.2 Expand on Demand

```
expand(nodeId) → AflNode
```

Fetches a single node at DEPTH 1. Shorthand for `read(nodeId, { depth: 1 })`.

### 4.3 Semantic Query (Phase 2+)

```
query(question, { top?, type?, tags? }) → NodeIndexEntry[]
```

Returns ranked node summaries matching a natural language question. Requires an embedding index (not implemented in v1.0 parser — planned for Phase 2).

## 5. Evolution Primitives (Phase 3+)

These operations are specified here for completeness but are **not implemented** in the v1.0 parser. They will be part of the Consolidation Daemon.

### 5.1 Consolidation

```
CONSOLIDATE [nodeId, ...] INTO newNodeId
  STRATEGY: <summarize | merge | abstract>
```

Combines multiple nodes into a higher-level summary. Original nodes gain `synthesized_into`, the new node gains `synthesized_from`.

### 5.2 Decay

```
DECAY nodeId TO <hot | warm | cold>
```

Moves a node between storage tiers:
- **hot** (L1): Full text indexed, in-memory, instant access.
- **warm** (L2): Summary indexed, on-disk, loaded on demand.
- **cold** (L3): Archived, only retrieved on high-confidence semantic match.

### 5.3 Link Strengthening

```
STRENGTHEN nodeA <-> nodeB BY delta
```

Adjusts the association weight between two nodes. Normally driven automatically by co-access telemetry.

## 6. File Layout

### 6.1 Runtime Data Directory

```
project/
├── .afl/                    # AFL runtime data (gitignored)
│   ├── index.json           # Node registry: id → {type, path, summary, refs, back_refs, ...}
│   ├── vectors/             # Embedding cache (Phase 2+)
│   └── access_log.jsonl     # Access telemetry: {node_id, timestamp, ...}
```

### 6.2 Node File Organization

Directories are **optional organizational hints**. The AFL runtime ignores directory structure and navigates purely by `id` and `refs`.

```
project/
├── memory/
│   └── core.md              # type: memory
├── skills/
│   ├── git-workflow.md      # type: skill
│   └── deploy-pipeline.md   # type: skill
├── knowledge/
│   └── python-patterns.md   # type: knowledge
└── diary/
    ├── 2026-04-01.md         # type: memory
    └── 2026-04-07.md
```

This layout is for human convenience. An agent can equally store all nodes flat in a single directory.

## 7. Resolved Design Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Conflict resolution | Last-write-wins for single-agent; CRDTs for multi-agent (future) | Single-agent is the initial target. Multi-agent conflict resolution is deferred. |
| Garbage collection | Cold nodes are archived, never deleted | Data loss is worse than storage cost. Agents can always compress but not recover. |
| Schema evolution | Open schema — unknown fields are preserved | Avoids breaking changes. Runtime validates only required fields. |
| Privacy boundaries | `visibility` frontmatter field (future) | Not in v1.0. Will use `visibility: private | internal | public`. |
| Cross-workspace federation | URI-based refs: `afl://workspace/node-id` (future) | Not in v1.0. Local refs only. |

## 8. Reference Implementation

The `@afl/core` TypeScript package (`packages/afl-core`) implements:

- [x] Frontmatter parser (YAML extraction + validation)
- [x] Reference extractor (strong, dynamic, inline attr)
- [x] Code block masking (skip refs in fenced/inline code)
- [x] NodeStore (filesystem scan, index build, back_ref computation)
- [x] Depth-controlled READ protocol
- [x] Access frequency tracking + telemetry logging
- [x] Index persistence (`.afl/index.json`)

**Not yet implemented** (planned for Phase 2-3):
- [ ] Semantic query via embeddings
- [ ] Consolidation daemon
- [ ] Decay management
- [ ] Link strength computation from co-access patterns

---

*AFL-MD Spec v1.0 — 2026-04-07*
