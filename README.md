# AFL — Agent Filesystem Language

> **Everything is memory. Memory self-evolves.**

AFL is a filesystem architecture and language designed from the ground up for AI agents. Its core insight:

1. **"Progressive disclosure" in today's agent skills is essentially a semantic index** — file contents embed references to other file paths, and the agent expands them on demand.
2. **Can we generalize this pattern into a full agent-native filesystem?** — No more artificial boundaries between "memory", "skills", "config", and "knowledge". Everything is an evolvable memory node.
3. **Structure should emerge, not be prescribed** — No human-designed schema required. Organization grows naturally from the agent's usage patterns.

[中文版 README](README_zh.md)

## Why?

Traditional filesystems were designed for **humans**: hierarchical directories, the desktop metaphor, spatial memory. But agents are not humans —

- Agents don't need to "put files in folders" — they need **semantic associations**
- Agents don't need to "remember paths" — they need **on-demand discovery**
- Agents don't need to "manually organize" — they need **automatic evolution**

Current agent memory solutions (vector databases, JSON configs, Markdown documents) are patches on the old paradigm. AFL asks a fundamental question: **If a filesystem were designed from scratch for agents, what would it look like?**

## Core Concepts

### Memory Node — The Universal Atom

```markdown
---
id: "node-skill-git-workflow"
type: skill
refs: ["node-knowledge-git-internals"]
access_frequency: 128
---

# Advanced Git Workflow

When handling complex Git operations, expand the following sub-nodes:

- [[node-skill-rebase-resolver]] : Rebase conflict resolution
- ((best practices for cherry-pick)) : Dynamic semantic query
```

### Three Types of References

| Syntax | Meaning | Behavior |
|--------|---------|----------|
| `[[node_id]]` | Strong reference | System maintains bidirectional links |
| `((query))` | Dynamic reference | Runtime semantic search and injection |
| `@attr(key: val)` | Inline metadata | Adds structure to paragraph-level content |

### Progressive Disclosure — Depth Control

```
READ node-skill-git-workflow DEPTH 0  → Metadata and summary only
READ node-skill-git-workflow DEPTH 1  → Full text, references remain as links
READ node-skill-git-workflow DEPTH 2  → Full text + first-level references expanded
```

### Self-Evolution — "Sleep and Wake"

- **Hotspot clustering**: Nodes frequently accessed together automatically form strong associations
- **Memory consolidation**: During idle time, fragmented logs merge into structured summaries
- **Forgetting/pruning**: Long-unused nodes are demoted and compressed
- **Conflict resolution**: Semantic contradictions are flagged for decision

## Project Structure

```
afl/
├── README.md                          # This file
├── README_zh.md                       # Chinese README
├── research/                          # Research reports
│   ├── 00-综合调研报告.md              # Comprehensive synthesis (zh)
│   ├── 01-existing-memory-systems.md  # Existing agent memory systems
│   ├── 02-fs-theory-and-knowledge-org.md  # FS theory & knowledge organization
│   ├── 03-agent-fs-related-projects.md    # Related projects & papers
│   ├── 04-design-exploration.md       # Concept design exploration
│   └── 05-meta-harness-and-harness-engineering.md  # Meta-Harness deep dive
├── spec/                              # Language specification (WIP)
│   └── afl-spec-draft.md
├── examples/                          # Example nodes
│   ├── skill-node.md
│   ├── memory-node.md
│   └── knowledge-node.md
└── prototype/                         # Prototype implementation (planned)
```

## Design Principles

1. **Markdown-native** — The natural medium for agent cognition, directly readable by humans too
2. **Graph-first, tree-compatible** — Semantic graph underneath, but backward-compatible with traditional directory structures
3. **Use is organization** — Structure is not pre-designed; it emerges from access patterns
4. **Minimal constraints** — Only essential structure (frontmatter + reference syntax), no limits on content freedom
5. **Bio-inspired** — Models the hippocampus-cortex memory consolidation mechanism

## Key Research Findings

| Finding | Source |
|---------|--------|
| Harness can cause up to **6x** performance gap on the same model | [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT) |
| Filesystem-as-memory independently adopted by multiple leading teams | Manus, OpenAI, Anthropic |
| Memory **architecture itself** can auto-evolve without human preset | [MemEvolve](https://arxiv.org/abs/2512.18746) (OPPO/NUS) |
| Simple harness + fewer tools > complex orchestration | Manus (4 rewrites) |
| Every harness component has an "expiry date" | Anthropic |

## Related Work

| Project | Relation |
|---------|----------|
| [Letta/MemGPT](https://github.com/letta-ai/letta) | OS-style layered memory, closest predecessor |
| [Cognee](https://github.com/topoteretes/cognee) | Knowledge-graph-driven agent memory |
| [Mem0](https://github.com/mem0ai/mem0) | Personalized memory layer |
| [Obsidian](https://obsidian.md/) | Bidirectional links + local Markdown PKM |
| [AIOS](https://github.com/agiresearch/AIOS) | Agent operating system concept |
| [HippoRAG](https://arxiv.org/abs/2405.14831) | Hippocampus-inspired long-term memory |
| [MemEvolve](https://github.com/bingreeky/MemEvolve) | Meta-evolution of memory architectures |
| [Meta-Harness](https://yoonholee.com/meta-harness/) | Automated harness engineering via filesystem |

## Roadmap

- [x] Phase 0: Research & concept validation
- [ ] Phase 1: AFL-MD syntax specification finalized
- [ ] Phase 2: Parser prototype (TypeScript)
- [ ] Phase 3: Self-evolution engine (consolidation daemon)
- [ ] Phase 4: Integration with existing agent frameworks

## Status

**Research Phase** — Currently in research and concept design. Discussions and contributions welcome.

## License

MIT
