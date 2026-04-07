# AFL Demo: Traditional Filesystem vs AFL Node System

This demo compares how an AI agent searches for information across two different file organization strategies, using the **same 12 files** with identical content.

## Scenario

A developer has been building an API Gateway service over two weeks. Their notes are organized as:

- **5 diary entries** — daily work logs (2026-03-28 to 2026-04-05)
- **3 knowledge articles** — Docker, PostgreSQL, Kubernetes best practices
- **2 config docs** — staging and production environment settings
- **2 debug logs** — a deployment failure postmortem and a timezone bug fix

**The question an agent must answer:**

> "What caused the last deployment failure and how was it fixed?"

The answer is scattered across **3 files**: a diary entry, a debug log, and a knowledge article about PostgreSQL connection pooling. The agent must find and synthesize all three.

## Two Approaches

### `demo-traditional/` — Standard Hierarchical Filesystem

```
demo-traditional/
├── diary/           (5 files, sorted by date)
├── knowledge/       (3 files, by topic)
├── config/          (2 files, by environment)
└── debug-logs/      (2 files, by date + type)
```

The agent sees only filenames and directory structure. To find relevant files, it must:
1. List the directory tree
2. Read each file to check if it's relevant (no summaries, no metadata)
3. Follow contextual clues across directories (diary → config → knowledge)

### `demo-afl/` — AFL Node System

```
demo-afl/
├── diary-2026-03-28.md     (flat namespace, each file is a "memory node")
├── diary-2026-04-01.md     (contains refs: [debug-deploy-failure, know-pg-tuning])
├── debug-deploy-failure.md (contains refs: [know-pg-tuning, know-k8s, config-staging])
├── know-pg-tuning.md       (back_refs auto-computed from referencing nodes)
├── config-staging.md
└── ... (12 files total)
```

Each file has YAML frontmatter with:
- `id` — unique node identifier
- `type` — memory, knowledge, or config
- `summary` — one-line description of contents
- `tags` — semantic labels
- `refs` — explicit links to related nodes

The agent can:
1. Read **all summaries at once** (DEPTH 0) — just metadata, no body content
2. Identify relevant nodes by matching summaries/tags
3. Read only the best-matching node (DEPTH 1) — full body with reference links
4. Selectively follow references to get supporting context

## Running the Comparison

```bash
npx tsx examples/demo-compare.ts
```

## Results

```
                     Traditional    AFL        Savings
  Files read:           11              2          9 fewer
  Tokens consumed:    1881           1294      31% less
  Irrelevant reads:      7              0
  Search steps:          5              3
```

### Traditional FS: The Blind Search

| Step | Action | Tokens | Relevant? |
|------|--------|--------|-----------|
| 1 | List directory tree | 0 | — |
| 2 | Read 5 diary files | 570 | 1 of 5 ✓ |
| 3 | Read 2 debug logs | 466 | 1 of 2 ✓ |
| 4 | Read staging config | 157 | ✓ |
| 5 | Read 3 knowledge files | 688 | 1 of 3 ✓ |
| **Total** | **11 files read** | **1881** | **4 relevant, 7 wasted** |

The agent has no way to know which files are relevant without reading them. It guesses by directory name and reads everything.

### AFL: The Guided Search

| Step | Action | Tokens | Relevant? |
|------|--------|--------|-----------|
| 1 | Scan 12 node summaries (DEPTH 0) | 626 | Identified 3 candidates |
| 2 | Read `debug-deploy-failure` (DEPTH 1) | 363 | ✓ Root cause + fix |
| 3 | Follow `[[know-pg-tuning]]` ref | 305 | ✓ Pool formula details |
| **Total** | **2 full reads + 12 summaries** | **1294** | **All relevant** |

The agent reads summaries to locate the answer, follows the semantic link trail, and never reads an irrelevant file body.

## Key Insight

```
Traditional FS agent search path:

  list dirs → read diary/* → read debug-logs/* → read config/* → read knowledge/*
              ⬆ blind scan    ⬆ blind scan       ⬆ contextual     ⬆ blind scan
              (4 wasted)      (1 wasted)          guess            (2 wasted)


AFL agent search path:

  scan summaries → read debug-deploy-failure → follow [[know-pg-tuning]]
  ⬆ 626 tokens     ⬆ precise hit              ⬆ explicit semantic link
  (metadata only)   (contains full postmortem)  (connection pool formula)
```

AFL's advantage isn't just fewer tokens — it's **deterministic navigation**. The agent never guesses which file to read next. References in the node body (`[[know-pg-tuning]]`, `[[config-staging]]`) explicitly declare relationships, turning a blind search into a graph traversal.

## AFL Features Demonstrated

| Feature | How It Helps |
|---------|-------------|
| **Frontmatter `summary`** | Agent scans all nodes at near-zero cost without reading bodies |
| **`refs` (declared references)** | Node declares its dependencies upfront |
| **`[[strong reference]]`** | In-body links create navigable semantic graph |
| **`((dynamic reference))`** | Semantic queries for future embedding-based expansion |
| **`@attr()` inline metadata** | Machine-readable attributes (severity, performance data) |
| **`tags`** | Categorical filtering (find all "failure" or "deployment" nodes) |
| **Depth-controlled READ** | Agent controls how much context to load (0=summary, 1=body, 2+=expand refs) |

## File Mapping

| Traditional Path | AFL Node ID | Key Difference |
|-----------------|-------------|----------------|
| `diary/2026-04-01.md` | `diary-2026-04-01` | AFL version has refs to `debug-deploy-failure`, `know-pg-tuning` |
| `debug-logs/2026-04-01-deployment-failure.md` | `debug-deploy-failure` | AFL version has refs to `know-pg-tuning`, `know-k8s`, `config-staging` |
| `knowledge/postgresql-tuning.md` | `know-pg-tuning` | AFL version has `@attr(importance: "critical")` and back_refs |
| `config/staging-env.md` | `config-staging` | AFL version has `@attr(constraint: "critical")` |
