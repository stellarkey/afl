# 现有 AI Agent 记忆系统的设计与实现调研笔记

## 1. 主流 Agent 框架的记忆架构调研

### 1.1 LangChain / LangGraph
LangChain 提供了丰富的记忆组件，但在向多智能体架构（LangGraph）演进后，其重点转向了**状态持久化（Checkpointer）**。
- **ConversationBufferMemory**: 最基础的记忆，将所有历史对话记录在内存中。
- **VectorStoreMemory**: 核心的 RAG 模式。将历史对话或外部知识向量化存储，按需检索。
- **EntityMemory**: 通过模型提取对话中的实体（人、物、地等）并存储其关联信息，建立简单的知识图谱。
- **LangGraph Checkpointer**: 核心概念是 `thread_id`。它通过数据库（如 SQLite, PostgreSQL, Redis）在特定的检查点保存整个图的状态，支持跨 Session 的状态恢复和回溯。

### 1.2 AutoGPT / AgentGPT
这类早期的自主智能体强调"任务目标驱动"。
- **文件系统持久化**: AutoGPT 极度依赖本地文件系统（Workspace）。它会将抓取的数据、中间执行代码、生成的子任务计划以文本/JSON 格式存储。
- **向量数据库**: 使用 Pinecone 或 Weaviate。它通过 "Memory" 模块将最近的操作日志向量化，在每个思考循环（Thinking Loop）中检索最相关的历史操作以避免陷入死循环。

### 1.3 CrewAI
CrewAI 引入了**分层记忆体系**：
- **Short-term Memory**: 基于内存的对话历史。
- **Long-term Memory**: 存储在数据库中，用于在不同的任务或不同的执行周期之间共享信息。
- **Entity Memory**: 专门记录关键实体（Task, Result, Actor）及其元数据。
- **Contextual Memory**: 记录当前 Task 的上下文，确保多个 Agent 协作时对当前进度有共识。

### 1.4 OpenAI Assistants API
OpenAI 提供了一套托管式的记忆方案，开发者无需管理底层存储。
- **Threads**: 代表一个会话流，自动管理 Token 截断。
- **Vector Store**: 专门为 `file_search` 工具设计的。用户上传文件后，OpenAI 自动完成分块、嵌入和存储。
- **持久化**: 记忆完全云端化，通过 `thread_id` 实现无限期的跨 Session 延续。

### 1.5 Claude MCP (Model Context Protocol)
MCP 本身是一个协议，而非单一的记忆存储，但它代表了一种**"去中心化记忆"**的设计理念。
- **理念**: 模型不直接拥有记忆，而是通过 MCP 连接外部的 Data Source（如本地数据库、Notion、GitHub）。
- **工具化记忆**: 将"查询历史"、"读取笔记"视为 Tool Call，通过标准化接口拉取上下文。
- **优势**: 解决了不同 Agent 平台之间数据孤岛的问题，记忆层可插拔。

### 1.6 Letta (前身为 MemGPT)
Letta 提出了**"LLM OS"**架构，模仿操作系统的存储分层：
- **Core Memory (核心记忆)**: 对应 RAM。始终包含在 LLM 的 Context Window 中。包括 `persona`（我是谁）和 `human`（用户是谁）。Agent 可以在运行时显式调用函数（Update Core Memory）来修改。
- **Archival Memory (归档记忆)**: 对应 Disk。海量的非结构化文本，通过 RAG 检索。
- **Recall Memory (回忆存储)**: 对应 Event Logs。记录所有发生过的原始交互（Raw Events），通常存储在 SQLite 中。

### 1.7 Microsoft AutoGen
AutoGen 的记忆方案较为分散，主要通过 `TeachableAgent` 实现。
- **TeachableAgent**: 具有两个子组件：`AddressBook`（存储其他 Agent 地址）和 `Memory`（基于 VectorDB）。
- **教学模式**: 允许用户通过对话明确告诉 Agent "记住这个规则"或"以后遇到这类任务这样做"，Agent 将其持久化。

---

## 2. Accio Work (当前系统) 的记忆设计分析

### 2.1 架构模型：`MEMORY.md` + `diary/`
Accio Work 采用了**"人工可读 + 语义索引"**的双层文件结构。
- **MEMORY.md (核心/长期记忆)**: 相当于 Letta 的 Core Memory 的持久化版本。它记录项目的关键决策、全局变量、重要的人员和偏好。它是高度压缩和结构化的。
- **diary/*.md (交互/短期记忆)**: 相当于 Recall Memory。按日期记录每日的执行细节、报错处理和具体输出。它保持了交互的原始上下文。

### 2.2 Skill 的渐进式披露
在 `SKILL.md` 中，Accio 不一次性加载所有技能详情，而是采用**嵌套引用（Nested References）**。
- **模式**: `SKILL.md` 仅包含技能名称和简短描述，具体实现路径（如 `scripts/`, `docs/skill-A.md`）仅在 Agent 需要使用该技能时，通过 `grep` 或 `read` 按需加载。
- **目的**: 节省上下文窗口（Context Window），防止无关信息干扰。

### 2.3 "语义索引"模式的优劣分析
- **优势 (Pros)**:
  - **透明可控**: 开发者可以直接编辑 Markdown 文件来纠正 Agent 的记忆偏差。
  - **工具兼容性**: 完美适配 `grep`, `glob`, `read` 等标准文件操作工具，Agent 无需学习复杂的 DB 语法。
  - **零成本迁移**: 记忆随项目仓库走，无需配置外部数据库。
- **劣势 (Cons)**:
  - **检索开销**: 随着文件增多，Agent 频繁读取/搜索文件会消耗大量 Token。
  - **并发冲突**: 多个 Agent 同时修改 `MEMORY.md` 容易产生写冲突（需锁机制或由单一中控 Agent 维护）。
  - **索引失效**: 如果文件路径发生大幅变动，硬编码的引用会失效，需要 Agent 具备自我修复能力。

---

## 3. 各系统的共性挑战与趋势

### 3.1 持久化 vs 临时性
- **挑战**: 如何区分哪些信息是"临时任务变量"，哪些是"长期核心认知"？
- **趋势**: 向 Letta 靠拢，采用多层存储策略。

### 3.2 结构化 vs 非结构化
- **挑战**: 非结构化文本（Markdown/Log）方便存储但难以程序化查询；结构化数据（JSON/DB）索引快但难以捕捉模糊语义。
- **现状**: 混合模式。使用 LLM 在后台将非结构化对话定期总结（Summarize）为结构化 JSON/Table。

### 3.3 主动检索 vs 被动加载
- **主动检索 (RAG)**: 节省 Context，但依赖 Query 的准确度。
- **被动加载 (Long Context Window)**: 模型理解更全面，但价格昂贵且存在 "Lost in the Middle" 问题。

### 3.4 遗忘与压缩机制
- **机制**: 
  - **FIFO (First In First Out)**: 简单截断。
  - **递归总结**: 每一轮对话后对前 N 轮进行总结，不断滚动压缩。
  - **重要度加权**: 给每条记忆打分（Recency, Frequency, Importance），低分清除。

### 3.5 跨 Session 连续性
- **关键**: `Thread ID` 或 `Workspace Path` 的绑定。
- **未来**: 实现"数字孪生"记忆，Agent 不仅仅是完成任务，而是随着使用时间的增长，记忆层不断进化，形成独特的协作偏好。
