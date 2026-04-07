# Meta-Harness 与 Harness Engineering 专题调研

**调研时间**: 2026-04-07

---

## 1. 核心论文: Meta-Harness (Stanford/MIT, 2026.03.30)

### 1.1 论文信息
- **标题**: Meta-Harness: End-to-End Optimization of Model Harnesses
- **作者**: Yoonho Lee, Roshen Nair, Qizheng Zhang, Kangwook Lee, Omar Khattab, Chelsea Finn
- **机构**: Stanford, MIT, KRAFTON
- **链接**: [arXiv:2603.28052](https://arxiv.org/abs/2603.28052) | [项目页](https://yoonholee.com/meta-harness/) | [代码](https://github.com/stanford-iris-lab/meta-harness-tbench2-artifact)

### 1.2 核心洞察

> "改变固定LLM周围的harness，能在同一benchmark上产生 **6倍** 的性能差距。"

论文的关键发现是：**harness（决定存储什么、检索什么、展示什么给模型的代码）往往和模型本身一样重要。**

### 1.3 什么是 Harness?

Harness = 围绕基础模型的基础设施层，控制五件事：

| 维度 | 定义 |
|------|------|
| **Context Management** | 什么进入context window、以什么顺序、什么被淘汰 |
| **Tool Selection** | 模型可以调用哪些能力，接口如何设计 |
| **Error Recovery** | 如何处理失败的tool call、推理死胡同、重试逻辑 |
| **State Management** | 如何跨turn、跨session持久化进度 |
| **External Memory** | 如何在context window之外存储和检索信息 |

### 1.4 Filesystem 作为反馈通道

**这是与我们AFL项目最相关的点。**

Meta-Harness 的核心技术创新是：**proposer agent 通过 filesystem 访问所有先前候选方案的源码、分数和执行轨迹**。

对比现有方法的局限：
- **OpenEvolve**: 将历史压缩为固定的prompt格式 → 丢失执行轨迹
- **TTT-Discover (PUCT)**: 只基于标量分数做选择 → 无法做目标诊断
- **Meta-Harness**: 给proposer提供 **完整的文件系统访问** → 可以检查源码、读取日志、跟踪错误链

> 关键引用: "Both OpenEvolve and PUCT compress history into a fixed prompt format, discarding the execution traces that Meta-Harness uses for targeted diagnosis."

**结果**: Meta-Harness 以 **10倍更少的评估次数** 匹配了这些方法的最终准确率。

### 1.5 实验结果

#### 在线文本分类
| 方法 | 平均准确率 | 上下文tokens |
|------|-----------|-------------|
| Zero-shot | 27.4 | 0 |
| Few-shot (all) | 40.8 | 49.3K |
| ACE (SOTA hand-designed) | 40.9 | 203K |
| **Meta-Harness** | **48.6** | **45.5K** |

Meta-Harness 以 4倍更少的context tokens 超越手工设计的SOTA 7.7个点。

#### 数学推理 (IMO级别)
在200道IMO级别数学题上，单个发现的harness跨5个未见过的模型平均提升4.7个点。**关键：这个harness对模型是通用的。**

#### TerminalBench-2 (Agent编程)
在Claude Haiku 4.5上，Meta-Harness (37.6%) 超越了所有已报告的手工baseline，包括Claude Code (27.5%)和Terminus-KIRA (33.7%)。

---

## 2. Filesystem-as-Memory: 行业趋同现象

### 2.1 多方独立收敛

一个值得注意的现象：**多个独立团队在2025-2026年同时收敛到了"filesystem as memory"这个架构**。

| 团队/项目 | 做法 |
|-----------|------|
| **Manus** (被Meta收购) | 使用文件系统作为外部记忆，平均每任务约50次tool call |
| **Claude Code / Codex** | 通过 PLAN.md, IMPLEMENT.md 等文件持久化任务状态 |
| **Meta REA** | hibernate-and-wake检查点，多天任务跨文件持久化 |
| **Accio Work** | MEMORY.md + diary/ + SKILL.md 的渐进式披露 |

### 2.2 为什么是Filesystem而不是Database?

1. **Agent天然会读写文件** — 不需要额外的API/SDK
2. **人类可审计** — Markdown/JSON直接可读
3. **版本控制免费** — Git提供完整的变更历史
4. **零配置** — 不需要启动数据库进程
5. **上下文效率** — 按需 `read` 比 `SELECT *` 更节省tokens

### 2.3 Manus 的四次架构重构

Manus 团队重构了四次agent框架，最关键的发现：

- 移除80%的工具（15→2），**准确率从80%提升到100%**
- Token消耗下降37%
- 速度提升3.5倍

**核心教训**: 简单harness + 更好的模型 > 复杂编排

---

## 3. Harness Engineering 作为学科的兴起

### 3.1 标志性事件

| 时间 | 事件 |
|------|------|
| 2026.02 | Anthropic发布 "Building Effective Agents" + "Harness Design for Long-Running Apps" |
| 2026.02 | OpenAI发布 "Harness Engineering" 博文 |
| 2026.03 | Martin Fowler发表 "Harness Engineering" 综合分析 |
| 2026.03 | LangChain发布 "The Anatomy of an Agent Harness" |
| 2026.03 | Meta-Harness论文发布，将harness工程自动化 |
| 2026.04 | [awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering) 已收录87+资源 |

### 3.2 Harness的五个设计原语 (LangChain定义)

1. **Filesystem** — 持久化状态 + agent协作界面
2. **Code Execution** — 自主问题解决，无需预设方案
3. **Sandbox** — 隔离 + 验证
4. **Memory** — 跨session持久化
5. **Context Management** — 对抗"context rot"的压缩

### 3.3 关键观点: Harness组件的"过期时间"

Anthropic提出了一个深刻的洞察:

> "Every harness component assumes the model can't do something; those assumptions expire."

即：每一个harness组件都基于"模型做不到X"的假设，随着模型能力提升，这些假设会逐一失效。这意味着：
- 好的harness设计应该是**可退化的** — 组件可以在不再需要时被移除
- AFL的设计也应该考虑这一点 — 系统的复杂度应该随模型能力提升而下降，而非上升

---

## 4. MemEvolve: 记忆系统的元演化 (OPPO/NUS, 2025.12)

### 4.1 论文信息
- **标题**: MemEvolve: Meta-Evolution of Agent Memory Systems
- **作者**: Guibin Zhang, Haotian Ren et al. (OPPO AI / NUS)
- **链接**: [arXiv:2512.18746](https://arxiv.org/abs/2512.18746) | [GitHub](https://github.com/bingreeky/MemEvolve)

### 4.2 核心思想

传统的自改进记忆系统在**固定的记忆架构**下运作——记忆接口 Ω 是预定义的、静态的。MemEvolve提出了**双重演化过程**：

1. **内容演化**: 记忆库中的数据随经验更新（传统做法）
2. **架构演化**: 记忆系统本身的接口和结构也在演化（创新点）

### 4.3 实现机制

MemEvolve采用**锦标赛式元演化**:

1. **分析**: 检查当前记忆系统的执行日志，识别瓶颈
2. **生成**: 基于分析产生N个候选记忆系统
3. **竞赛**: N+1个系统（N新 + 1旧）在相同任务上比赛
4. **淘汰**: 排名靠前的系统进入决赛，胜者成为下一轮基线

### 4.4 收录的11个基线记忆系统

| 系统 | 来源 |
|------|------|
| Agent-KB | OPPO自研 |
| SkillWeaver | OSU NLP Group |
| Mobile-Agent-E | X-Plug |
| ExpeL | LeapLab THU |
| Voyager | THU FIB Lab |
| DILU | THU FIB Lab |
| Generative Agents | Stanford (小镇) |
| Dynamic Cheatsheet | Suzgun et al. |
| Agent Workflow Memory | zorazrw |
| EvolveR | KnowledgeXLab |
| MEMP | N/A |

### 4.5 与AFL的关系

MemEvolve证明了一个关键命题: **记忆的架构本身是可演化的，不需要人类预先固定**。

这直接支持了AFL的核心假设——系统不需要人类预先设计结构，结构可以从使用中涌现。但MemEvolve的"演化"目前还是通过LLM生成代码实现的工程式演化，而非我们设想的基于使用统计的自组织式涌现。两者可以互补。

---

## 5. 对AFL项目的启示

### 5.1 已验证的假设

1. **"Filesystem比Database更适合Agent记忆"** — 行业共识，多家独立验证
2. **"Harness/记忆架构对性能影响巨大"** — Meta-Harness: 6倍性能差距
3. **"记忆架构可以自动演化"** — MemEvolve已实现原型
4. **"渐进式披露是正确方向"** — LangChain、Manus都在用类似模式

### 5.2 需要警惕的陷阱

1. **过度设计**: Manus的教训——简单+少工具 > 复杂编排
2. **组件过期**: Anthropic的警告——每个组件都有"过期时间"
3. **Co-evolution trap**: LangChain警告模型可能对特定harness过拟合

### 5.3 AFL可以从Meta-Harness借鉴的

| Meta-Harness做法 | AFL可借鉴之处 |
|-----------------|-------------|
| Filesystem作为反馈通道 | AFL的节点图本身就是agent的反馈通道 |
| 保留完整执行轨迹 | 节点的 `access_log` 应记录完整的访问上下文 |
| 10倍更少的评估 = 更高效学习 | AFL的自演化应该是数据高效的，不是暴力搜索 |
| Harness代码也是可搜索的 | AFL的元数据schema本身也应该是一个可演化的节点 |

---

*End of Meta-Harness Research*
