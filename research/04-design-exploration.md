# 设计探索：面向Agent的文件系统语言 (Agent-Oriented Filesystem Language, AFL)

本笔记探索一种打破传统层级目录结构、以“语义引用”和“自演化”为核心的文件系统语言设计。其目标是让Agent不再受困于人类预设的文件夹结构，而是建立一套符合大模型认知模式的知识/技能网络。

---

## 1. 核心抽象：Memory Node (记忆节点)

在AFL中，不再有“文件”和“文件夹”的区别，一切皆为**节点 (Node)**。

### 1.1 节点统一格式
基于 Markdown + 声明式元数据 (YAML Frontmatter)。

```markdown
---
id: "node-skill-git-workflow"
type: "skill"                  # memory, skill, config, knowledge, entity
version: "1.0.2"
created_at: 2026-04-07T10:00Z
last_accessed: 2026-04-07T11:30Z
access_frequency: 128          # 用于热度计算
embedding_hash: "sha256:..."   # 内容向量特征摘要

# 显式引用列表 (由系统维护双向关联)
refs:
  - "node-knowledge-git-internals"
  - "path/to/sub-skill.md"      # 支持相对路径兼容
back_refs:
  - "node-master-agent-config"
---

# Git 高级工作流技能

这是核心描述内容。当 Agent 需要执行复杂 Git 操作时，按需展开以下子节点：

- [[node-skill-rebase-conflict-resolver]] : 处理变基冲突的专项技能
- [[node-skill-cherry-pick-mastery]] : 精确同步代码块
```

### 1.2 双向引用属性
- **主动引用 (Refs)**: 当前节点依赖或提及的其他节点。
- **被动引用 (Back-refs)**: 哪些节点正在使用当前节点。这决定了节点的“重要性”和“上下文”。

---

## 2. 语义索引层：从 `ls` 到 `relate`

传统文件系统依赖路径查找，AFL 依赖**关联发现**。

### 2.1 混合检索机制
1.  **向量检索 (Vector Search)**: 基于 `embedding_hash` 寻找语义相近的碎片。
2.  **图拓扑检索 (Graph Traversal)**: 沿着 `refs` 链条追踪上下文。
3.  **关键词触发**: 传统的全文索引，用于精确匹配。

### 2.2 渐进式披露 (Progressive Disclosure) 的形式化
定义 Agent 的阅读深度 `D`：
- `D=0`: 仅读取当前节点元数据和摘要。
- `D=1`: 读取当前节点全文，但不展开引用。
- `D=n`: 递归展开 `n` 层引用。

**Agent 操作示例：**
`READ node-skill-git-workflow WITH DEPTH 1` -> 返回全文，引用保持为链接。
`EXPAND [[node-skill-rebase-conflict-resolver]]` -> 仅在需要时按需注入该节点内容。

---

## 3. 自演化机制：系统的“睡眠与觉醒”

系统不需要人工整理目录，而是通过 Agent 的行为统计进行重组。

### 3.1 频率驱动的聚类 (Clustering)
- **热点合并**: 如果两个节点经常在同一个 Session 中被连续访问，系统会自动在它们之间建立 `strong_link` 元数据，或建议将其合并。
- **孤岛识别**: 长期无 `back_refs` 且访问频率为 0 的节点会被标记为“待归档”。

### 3.2 遗忘与压缩机制
- **短期记忆 (L1)**: 高频访问，全文索引。
- **长期记忆 (L2)**: 低频访问，仅保留摘要和向量索引。
- **归档 (L3)**: 极低频，压缩存储，只有在向量检索高度匹配时才唤醒。

### 3.3 记忆巩固 (Consolidation)
Agent 在空闲时段（类似“睡眠”）执行维护任务：
- **碎片整合**: 将 `diary/` 下的 10 条关于某个项目的琐碎记录合并为一张 `project-summary` 节点。
- **冲突消解**: 发现两条语义相反的知识节点时，标记并提示主 Agent 决策。

---

## 4. 语言设计：为什么需要 AFL？

### 4.1 语法草案：AFL Markdown (AFL-MD)
AFL 在标准 Markdown 基础上增加了一层**语义约束**：

- `[[node_id]]`: 强引用（必需依赖）。
- `((query))`: 动态引用（执行一次语义搜索并实时注入结果）。
- `@attr(key: value)`: 行内元数据。

### 4.2 对比分析

| 特性 | JSON/YAML | 标准 Markdown | AFL-MD |
| :--- | :--- | :--- | :--- |
| **可读性** | 机器友好，人类难读 | 人类友好，Agent 理解不深 | 双重友好 |
| **结构化** | 严格，不易扩展文本 | 无结构，难索引 | 声明式结构 + 自由文本 |
| **关联性** | 树状或平面 | 链接需手动维护 | 自动双向图关联 |
| **演化性** | 静态模式 | 静态内容 | 带有访问度量，支持动态重组 |

**结论**：Agent 需要的是一种能够表达“模糊意图”和“演化状态”的介质。Markdown 是 Agent 的天然思维载体，AFL 则是给这种载体加上了“神经突触”。

---

## 5. 现有系统的兼容与迁移

### 5.1 迁移路径
1.  **MEMORY.md -> Memory Nodes**:
    - 将长文档按标题拆分为独立 Node。
    - 原始文件变为一个“导航节点”，通过 `refs` 引用所有碎片。
2.  **diary/ -> Time-series Nodes**:
    - 日志作为带时间戳的节点，自动获得 `type: memory` 和 `created_at` 属性。
3.  **SKILL.md -> Skill Forest**:
    - 利用“渐进式披露”特性，Agent 只在执行任务时加载具体的技能 Node。

### 5.2 实施步骤
- **Phase 1**: 仅在元数据层增加 `id` 和 `type`。
- **Phase 2**: 引入双向引用追踪工具（Agent 写入文件时自动补全 back_refs）。
- **Phase 3**: 引入后台 Consolidation Agent，定期清理和合并节点。

---

## 6. 示例：一次动态演化的过程

**初始状态 (T0)**:
Agent 记录了 5 条关于“Python 异步报错”的日志在不同日期。

**自演化后 (T1)**:
系统识别到这些节点的高语义相似度，自动创建：
```markdown
---
id: "node-knowledge-python-async-common-pitfalls"
type: "knowledge"
synthesized_from: ["diary-2026-04-01", "diary-2026-04-03", ...]
---
# Python 异步常见坑点总结
根据最近 5 次调试记录，主要问题集中在 `loop.run_until_complete` 的嵌套使用上...
```
原始日志被标记为 `referenced_by: node-knowledge-python-async-common-pitfalls` 并降低访问权重。

---
*End of Design Exploration*
