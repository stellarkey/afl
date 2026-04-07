# AFL — Agent Filesystem Language

> **一切皆记忆，记忆自演化。**

AFL 是一个面向 AI Agent 的文件系统语言与架构设计项目。它的核心洞察是：

1. **当前 Agent 的"渐进式披露"本质上是一种语义索引** — 文件内容里嵌套引用其他文件路径，Agent 按需展开
2. **能否把这个模式泛化成一套面向 Agent 的文件系统？** — 不再区分"记忆"、"技能"、"配置"、"知识"，一切都是可演化的记忆节点
3. **系统应该能自组织、涌现结构** — 不需要人类预先设计 schema，结构从 Agent 的使用行为中自然生长

[English README](README.md)

## 为什么需要这个？

传统文件系统是为**人类**设计的：层级目录、桌面隐喻、空间记忆。但 Agent 不是人——

- Agent 不需要"把文件放进文件夹"，它需要**语义关联**
- Agent 不需要"记住路径"，它需要**按需发现**
- Agent 不需要"手动整理"，它需要**自动演化**

现有的 Agent 记忆方案（向量数据库、JSON 配置、Markdown 文档）都是在旧范式上的补丁。AFL 要从根本上重新思考：**如果文件系统是为 Agent 从零设计的，它应该长什么样？**

## 核心概念

### Memory Node — 统一的原子单元

```markdown
---
id: "node-skill-git-workflow"
type: skill
refs: ["node-knowledge-git-internals"]
access_frequency: 128
---

# Git 高级工作流

当需要处理复杂 Git 操作时，展开以下子节点：

- [[node-skill-rebase-resolver]] : 变基冲突处理
- ((关于 cherry-pick 的最佳实践)) : 动态语义查询
```

### 三种引用

| 语法 | 含义 | 行为 |
|------|------|------|
| `[[node_id]]` | 强引用 | 系统维护双向链接 |
| `((query))` | 动态引用 | 运行时语义搜索并注入 |
| `@attr(key: val)` | 行内元数据 | 为段落级内容添加结构 |

### 渐进式披露 — 深度控制

```
READ node-skill-git-workflow DEPTH 0  → 仅元数据和摘要
READ node-skill-git-workflow DEPTH 1  → 全文，引用保持链接
READ node-skill-git-workflow DEPTH 2  → 全文 + 一级引用展开
```

### 自演化 — 系统的"睡眠与觉醒"

- **热点聚类**: 经常一起访问的节点自动建立强关联
- **记忆巩固**: 空闲时将碎片日志合并为结构化摘要
- **遗忘修剪**: 长期未访问的节点降级压缩
- **冲突消解**: 发现语义矛盾时标记待决

## 项目结构

```
afl/
├── README.md                          # 英文 README
├── README_zh.md                       # 本文件
├── research/                          # 调研报告
│   ├── 00-综合调研报告.md              # 完整综合分析
│   ├── 01-existing-memory-systems.md  # 现有 Agent 记忆系统
│   ├── 02-fs-theory-and-knowledge-org.md  # 文件系统理论
│   ├── 03-agent-fs-related-projects.md    # 相关项目和论文
│   ├── 04-design-exploration.md       # 概念设计探索
│   └── 05-meta-harness-and-harness-engineering.md  # Meta-Harness 深度调研
├── spec/                              # 语言规范 (WIP)
│   └── afl-spec-draft.md
├── examples/                          # 示例节点
│   ├── skill-node.md
│   ├── memory-node.md
│   └── knowledge-node.md
└── prototype/                         # 原型实现 (planned)
```

## 设计原则

1. **Markdown 原生** — Agent 的天然思维载体，人类也能直接读写
2. **图优先，树兼容** — 底层是语义图，但兼容传统目录结构的渐进迁移
3. **使用即组织** — 结构不是预先设计的，而是从访问模式中涌现的
4. **最小约束** — 只添加必要的结构（frontmatter + 引用语法），不限制内容自由度
5. **生物启发** — 模拟海马体-皮层的记忆巩固机制

## 关键调研发现

| 发现 | 来源 |
|------|------|
| Harness 对性能影响可达 **6 倍** | [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT) |
| Filesystem-as-memory 被多家头部公司独立收敛采用 | Manus, OpenAI, Anthropic |
| 记忆**架构本身**可以自动演化，不需要人类预设 | [MemEvolve](https://arxiv.org/abs/2512.18746) (OPPO/NUS) |
| 简单 harness + 少工具 > 复杂编排 | Manus 四次重构的教训 |
| 每个 harness 组件都有"过期时间" | Anthropic |

## 相关工作

| 项目 | 关系 |
|------|------|
| [Letta/MemGPT](https://github.com/letta-ai/letta) | OS 式分层记忆，最接近的先驱 |
| [Cognee](https://github.com/topoteretes/cognee) | 知识图谱驱动的 Agent 记忆 |
| [Mem0](https://github.com/mem0ai/mem0) | 个性化记忆层 |
| [Obsidian](https://obsidian.md/) | 双向链接 + 本地 Markdown 的个人知识管理 |
| [AIOS](https://github.com/agiresearch/AIOS) | Agent 操作系统概念 |
| [HippoRAG](https://arxiv.org/abs/2405.14831) | 海马体启发的长期记忆 |
| [MemEvolve](https://github.com/bingreeky/MemEvolve) | 记忆架构的元演化 |
| [Meta-Harness](https://yoonholee.com/meta-harness/) | 通过文件系统实现自动化 harness 工程 |

## 路线图

- [x] Phase 0: 调研与概念验证
- [ ] Phase 1: AFL-MD 语法规范定稿
- [ ] Phase 2: 解析器原型 (TypeScript)
- [ ] Phase 3: 自演化引擎 (consolidation daemon)
- [ ] Phase 4: 与现有 Agent 框架集成

## 状态

**调研阶段** — 目前处于调研和概念设计阶段。欢迎讨论和贡献。

## License

MIT
