# Agent 产物（Artifact）体系设计方案

> 状态：**待评审**（评审通过后按 Phase 实施）
> 日期：2026-10-07
> 关联：`docs/ai-native-ux-prd.html`（三主模式）、`docs/ark-managed-agents.md`（双引擎）、`docs/conversation-as-api.md`（发布链路）

---

## 一、现状：Agent 当前产出什么

当前 Agent 的产物全部收敛在「工作流」一个域，呈现为 7 类内容：

| # | 产物 | 存放位置 | 生命周期 | 问题 |
|---|------|---------|---------|------|
| 1 | 服务端画布草稿（`{nodes,edges,globalVariable}` 整份 DSL） | `SessionWorkflowDraftService` 的 `ConcurrentHashMap`（内存） | 会话级，重启即失 | 无持久化、无版本 |
| 2 | 落版工作流版本（v主.次） | `gaia_workflow_version` 表 | 永久 | 与草稿是两套版本轴 |
| 3 | 发布 API（sk-key + 契约冻结） | `gaia_workflow_api` 表 | 永久 | 在会话流里没有产物化呈现 |
| 4 | Plan（createPlan/executeStep 步骤） | `SessionPlanStore` 内存 Map | 会话级 | 不可审批、重启即失 |
| 5 | 过程性内容（正文 token、thinking、工具卡片、`::options` 选项） | `agent_message` 表 | 会话级 | `tool_result` 只有 ≤200 字符字符串快照 |
| 6 | 试运行结果（runWorkflow/runNode 的 taskId/outputs/reports） | 仅作为 tool_result 文本 | 即时 | 证据没有独立产物形态 |
| 7 | 前端画布快照（含 delta、回滚） | 前端 `history.ts`（浏览器内存） | 页面级 | 与服务端版本轴脱节 |

**产物识别靠启发式**：`apps/console/src/ai-workspace/artifact/extract.ts` 递归剥包扫描消息正文/工具结果里的 `{nodes,edges}` 形状对象，字段名一变即漏识别；失败轮靠红卡兜底。

**结构性问题（对照业界后的判断）**：
1. **产物没有一等实体**——散落在事件、消息文本、内存 Map 里，没有稳定 id、状态机、跨会话引用能力。
2. **中间产物与交付物不分**——监控用的过程内容和验收用的结果混在一条消息流里。
3. **没有 diff 语言**——`document` 事件是整表广播，DSL 层无「与当前生效版本比变了什么」视图。
4. **确认点弱**——`applyWorkflow` 落版默认 `auto-approve`（`ToolPolicyService.java:176`），Plan 卡片不能审批。
5. **不可回滚到服务端**——前端快照链只能本地 undo，多端（编辑器路由）写冲突刚修过一次（`7f380853`）。

---

## 二、业界参照（摘要）

调研对象：OpenAI Codex、Claude Code / Artifacts、Cursor、Copilot Workspace / coding agent、Devin、v0 / Bolt / Lovable、ZCode、Anthropic agentic UX 方法论。详细出处见文末附录。

与本项目最相关的四条共识：

1. **Plan 先行、可审批、可中断**（Claude Code plan mode 三选项、Lovable Plan view 可编辑+版本化、Copilot Workspace spec→plan→implement 先审后码）——计划批准前不产生副作用，是最大的人工审批点。
2. **中间产物与交付物分离**——中间产物（进度、工具卡片、日志）供「监控」；交付物（diff / PR / 可预览应用）供「验收」。Devin 的测试录像、Copilot 的 session log 是监控面；diff 和 PR 是验收面。
3. **Diff 是产物的通用语言 + 一切可回滚**（Codex 回传 diff、v0「每次修改都是一个版本所以天然 diffable」、Cursor 自动 checkpoint、Lovable 全自动版本历史并诚实声明回滚边界）。
4. **产物可持久化、可分享、可沉淀**（Claude Artifacts 独立面板、Devin Playbook/Knowledge、AGENTS.md）——产物从一次性输出升级为资产。

**本项目域的映射**：Codex/Cursor 的「PR 收口」= 我们的「发布 API（版本冻结）」；「代码 diff」=「DSL diff」；「可预览应用」=「画布预览 + 试运行」。

---

## 三、设计目标与原则

1. **产物一等公民**：每个产物有 id、类型、状态机、版本，独立于消息存在，可被消息引用、可跨会话检索。
2. **监控面 / 验收面分离**：对话流 = 监控（过程叙述 + 工具卡片）；右栏 ArtifactPanel = 验收（产物全文 + diff + 证据）。
3. **确认点显式化**：落版、发布两个副作用动作前必须有人工可读的「变更摘要」，策略可在管理端配置。
4. **引擎无关**：local 与 ark 产出完全同构的产物事件，差异只允许存在于过程事件（thinking/usage）。
5. **单一事实源**：服务端草稿是画布的唯一权威；前端快照链降级为本地 undo 体验。

---

## 四、核心设计：统一 Artifact 层

### 4.1 数据模型（新表 `agent_artifact`）

加入 `apps/api/gaia-workflow/gaia-workflow-app/src/main/resources/sql/schema.sql`：

```sql
CREATE TABLE agent_artifact (
  id          TEXT PRIMARY KEY,              -- art_ 前缀
  session_key TEXT NOT NULL,
  run_id      TEXT,                          -- 产出它的那一次 run
  message_id  BIGINT,                        -- 挂靠的 assistant 消息（草稿类可为空）
  type        TEXT NOT NULL,                 -- workflow | plan | test_report | release
  status      TEXT NOT NULL,                 -- 见 4.3 状态机
  title       TEXT,                          -- 卡片主标题
  summary     TEXT,                          -- 一句话 delta/结论（卡片副标题）
  payload     TEXT NOT NULL,                 -- JSON，schema 按 type 定义（见 4.4）
  version     INTEGER NOT NULL DEFAULT 1,    -- 同一 artifact 的第 N 次内容更新
  engine      TEXT,                          -- local | ark（产出引擎）
  created_at  TIMESTAMP,
  updated_at  TIMESTAMP
);
CREATE INDEX idx_artifact_session ON agent_artifact (session_key, updated_at DESC);
```

**关键决策：草稿持久化与产物实体化一步到位**——`SessionWorkflowDraftService` 从「内存 Map」改为「读写当前会话的 workflow artifact（内存缓存 + DB 持久化）」。重启恢复 = 读取该会话最新的 workflow artifact。不再单独建 `session_draft` 表。`SessionPlanStore` 同理迁到 plan artifact。

### 4.2 事件协议（引擎无关，双引擎同发）

在 `AgentEvent.java` 事件族中新增（沿用现有字符串约定风格）：

```jsonc
// 内容更新（Phase 1 用全量 payload，不做增量 patch——DSL 规模为几十节点，全量足够）
{ "type": "artifact", "action": "upsert",
  "artifact": { "id", "type", "version", "status", "title", "summary", "payload" } }

// 状态迁移（applied / discarded / approved / rejected 等，不带 payload）
{ "type": "artifact", "action": "state", "id": "art_xxx", "status": "applied" }
```

- 事件经现有 `SessionEventBus` 广播，多窗口天然同步；断线回放走现有 run 快照机制（快照携带当前产物列表摘要）。
- **ark 侧**：`ArkEventTranslator` 把 `applyWorkflow`/canvas 类工具的 `agent.custom_tool_use` 结果翻译为 artifact 事件；方舟自有事件中的结构化产物（后续版本）也有归一口。
- **兼容期**：`document` 事件保留双发（Phase 1），前端切到 artifact 事件后（Phase 2）收敛删除。

### 4.3 状态机（按 type）

```
workflow:  streaming → stable ──用户/模型落版──→ applied
                              └─用户丢弃/新 run 重来─→ discarded
plan:      proposed → approved（按计划执行） | edited | rejected
test_report: completed（终态）
release:   published（终态，发布成功即创建）
```

### 4.4 四种产物的 payload schema

| type | payload | 生成时机 |
|------|---------|---------|
| `workflow` | `{nodes, edges, globalVariable, dslVersion?, validation:{ok, repairs[]}}` —— 即现草稿结构 + 校验结果 | canvas 工具增量改草稿时持续更新；`applyWorkflow` 落版时置 applied |
| `plan` | `{goal, steps:[{index, desc, status: pending/running/done/error/testing/testFailed}]}` —— 复用现有 PlanCard 数据结构 | createPlan 创建；executeStep 更新 |
| `test_report` | `{workflowCode, version, input, output, durationMs, nodeResults:[{nodeId, status, message}], taskId}` | canvas.runWorkflow / runNode 成功返回后生成 |
| `release` | `{workflowCode, version, apiPath, apiKeyMasked, requestSchema, responseSchema, logUrl}` | publish 成功后创建，同时作为会话流里的「发布收口卡片」 |

### 4.5 落版语义重构（本方案最关键的行为变化）

现状：模型调 `applyWorkflow` 工具 → 直接落 `gaia_workflow_version` 新版本（auto-approve）。

改为：

1. 模型仍调 `applyWorkflow`，但 executor 只做**校验 + 更新 workflow artifact（stable）+ 广播**，不再直接落版；
2. 前端在会话流里出现「**应用卡片**」：变更摘要（+N 节点 · −M 连线 · 修复 R 处）+ 「应用到画布/落版」按钮（复用现有 `confirm_request` 通道时序）；
3. 确认策略进 `agent_config`（管理端配置中心可切，符合「切换放管理端」约定）：
   - `require`（**默认**）：等人点按钮；
   - `auto`：免确认直接落版（保留现状能力，老用户可切回）。
4. 用户点「应用」→ 走 `POST .../confirm` → executor 落版 → artifact 置 applied + 创建新 `gaia_workflow_version`。

这样「落版」从模型的一个工具调用变成**人机交接点**——这是业界 PR/diff-review 模式在本域的对应物。

### 4.6 Plan 审批三选项

`createPlan` 产出 plan artifact（proposed 状态）后，模型在正文中输出现有 `::options` 协议块（能力已存在，`prompt-zh.md:149+`），前端 PlanCard 顶部渲染三个动作：

- **按计划执行** → approve，继续 executeStep；
- **修改后执行** → 用户直接改 plan 文本（Phase 2：可编辑；Phase 1：让模型按用户反馈重出 plan）；
- **继续讨论** → reject，plan 不执行，回到对话。

---

## 五、前端改造

### 5.1 新增 ArtifactStore（zustand）

新文件 `apps/console/src/agent/artifact-store.ts`：`byId` Map + 当前会话产物有序列表。`AgentContext.tsx` 的 SSE 回调增加 `onArtifact`，upsert 入 store。

### 5.2 各视图数据源切换

| 视图 | 现状 | 改为 |
|------|------|------|
| 右栏 `ArtifactPanel.tsx` | `extract.ts` 递归剥包从消息里「猜」出 DSL | 直接读 ArtifactStore 最新 workflow artifact；`extract.ts` 保留为无 artifact 事件时的兜底 |
| `useWorkflowArtifactSync.ts` | 监听消息变化同步 headless DSL | 监听 artifact upsert；非法产物仍走 `captureFailure` 红卡 |
| 消息流 `PlanCard` | 从工具消息里捞 plan | 引用 plan artifact（点卡片 → 右栏定位） |
| 消息流 `CanvasSnapshotCard` | 前端本地快照链 | 卡片绑定 artifact version；「回滚到此」从本地替换改为**服务端动作**（基于该版本创建新落版，多端一致） |
| 新增「应用卡片」「试运行报告卡」「发布收口卡」 | 无 | 分别渲染 workflow(stable)/test_report/release artifact |
| 会话切换恢复 | `getSessionDocument` 拉内存草稿 | 拉该会话最新 workflow artifact（重启后依然可用） |

### 5.3 ArtifactPanel 增加验收视角（Phase 2）

现有三视角「预览 / 画布 / DSL」之上，为 stable/applied 状态增加 **Diff 视角**：与当前生效版本 `v主.次` 的结构化 delta（复用 CanvasSnapshotCard 已有的 delta 计算）+ DSL 文本 diff。落版前看到的是「将变更什么」，落版后看到的是「本次应用改了什么」。

### 5.4 对话流中的画布呈现（评审新增）

现状：`CanvasSnapshotCard` 已把「画布这一轮变成了什么样」放进对话流——每次结构性变更在产生它的助手消息下插一张卡（SVG 缩略拓扑 + delta chips + 对比上一版 + 回滚 + 失败红卡，`apps/console/src/chat/CanvasSnapshotCard.tsx`）。但有三个差距：

1. **缩略图是抽象 SVG（rect+line），不是真实渲染的画布**——看不到节点标题与真实布局，真渲染只在右栏；
2. **粒度是「每次结构性变更」一张卡**——`AgentContext.onDocument`（:830-841）每收到一次 document 事件就记快照，一轮里 AI 连续多次 canvas 工具调用会在同一条消息下叠多张卡，刷屏；
3. **没有流式「构建中」形态**——卡在变更后才出现，缺少「正在构建 → 逐步生长 → 定格」的叙事感；且快照仅存 localStorage，跨设备即丢。

改造设计（与本方案 artifact 层打通）：

- **卡粒度改为「每轮 run 一张活卡」**：run 开始即在对话流插入「构建中」卡；run 期间每次 artifact/document 事件**原地更新**这张卡（缩略图逐步变化 + 构建中脉冲），中间版本收进卡内可展开的小时间线；run 结束（done）定格为正式快照卡。卡片即 workflow artifact 的渲染面——artifact 版本链驱动，跨设备可复现。失败轮红卡与重试保留。
- **「当前版」卡升级为真实画布渲染**：仅最新/当前版本的卡用真实渲染（复用 ArtifactPanel 只读 flowgram：auto-fit、禁交互、IntersectionObserver 懒挂载），历史版本保持 SVG 缩略（同一时刻最多 1–2 个 flowgram 实例，性能可控）；提供 hover 放大与点击在 Modal 中全屏查看。
- **本地快照链降级为页面内 undo**（同 D3），对话流卡片的权威数据源切到 artifact 版本链。

### 5.5 运行摘要（Phase 3）

run 结束（done）时生成 ≤30 字摘要存 `agent_session` 新列 `summary`，会话列表显示为副标题（Ark 引擎可复用 final message，local 走模型生成一次，成本可忽略）。

---

## 六、与双引擎的关系

- 产物工具（`applyWorkflow`/canvas/createPlan/executeStep）已是引擎无关的 `ToolExecutor`，两引擎产物形态天然一致；本方案把「产物事件」也统一收口，**ark 翻译器只多翻译一类事件**，无引擎分叉。
- 明确边界：ark 引擎下「应用卡片」同样生效（custom_tool_use 回传后走同一条 confirm 通道，`ArkManagedExecutionEngine.java:402-463` 已有该链路）。

---

## 七、实施计划（三期）

### Phase 1 — 产物实体化（后端为主，1 个可独立验证的里程碑）

1. 建表 `agent_artifact` + 实体/Manager（schema.sql + infra 层实体类）；
2. `AgentEvent` 增加 artifact 事件；`SessionEventBus` 快照规则补充产物列表；
3. `SessionWorkflowDraftService`/`SessionPlanStore` 改为 artifact 持久化（内存缓存 + DB），重启恢复验证；
4. `ApplyWorkflowToolExecutor` 按 4.5 重构（校验→stable→确认→落版），确认策略入 `agent_config`（默认 require，管理端可切）；
5. runWorkflow/runNode 成功后生成 test_report artifact；
6. publish 成功后生成 release artifact；
7. 前端：artifact-store + onArtifact + ArtifactPanel/PlanCard/快照卡数据源切换 + 应用卡片/报告卡/发布卡；
8. 对话流画布呈现（5.4）：run 粒度活卡（构建中→定格）+ 当前版真实渲染 + 历史版 SVG；
9. 提示词更新（`prompt-zh.md`）：applyWorkflow 语义变化说明、plan 三选项话术。

验证清单：重启后端 → 草稿/计划不丢；双窗口同步；local 与 ark 各跑一轮产物等价性（**ark 侧只验证事件翻译与 confirm 链路，不发起消耗额度的真实对话**）。

### Phase 2 — Diff 与确认体验

1. ArtifactPanel Diff 视角（结构化 delta + DSL diff）；
2. Plan 文本可编辑（编辑后作为 artifact 新 version 回传模型）；
3. `document` 事件下线，删除前端 extract 主路径（保留兜底）；
4. 「回滚到此」服务端化（基于历史 artifact/version 创建新落版）。

### Phase 3 — 沉淀与转向

1. run 摘要入会话列表；
2. 运行中消息排队（发消息即入队，run 结束自动续跑，参考 Cursor steering）；
3. （可选）Work 模式文件夹级产物视图（WorkToolsPanel 伏笔）；
4. （可选）报告/文档类产物 type 扩展。

---

## 八、需要确认的决策点

| # | 决策 | 建议 | 影响 |
|---|------|------|------|
| D1 | `applyWorkflow` 默认确认策略 | `require`（管理端可切 `auto`） | 对话多一步确认；安全性/可控性显著提升 |
| D2 | Phase 1 事件用全量 payload（不做增量 patch） | 是 | 实现简单可靠；DSL 规模小，带宽可接受 |
| D3 | 回滚服务端化后，前端本地快照链保留为纯 undo | 是 | 两段式：本地 undo（页面内）+ 服务端版本（跨端） |
| D4 | 三期范围是否认可；Phase 3 两项可选项做不做 | 先做 Phase 1 | — |
| D5 | 对话流画布卡：run 粒度活卡 + 仅当前版真渲染（历史版 SVG） | 是 | 兼顾「每轮看到渲染画布」与性能（flowgram 实例数可控） |

---

## 附录：调研出处

- OpenAI Codex：[Introducing Codex](https://openai.com/index/introducing-codex/)、[Codex Cloud 分析](https://www.agent37.com/blog/codex-cloud)、[CLI 云端委派工作流](https://codex.danielvaughan.com/2026/05/19/codex-cli-cloud-delegation-workflows-plan-locally-execute-remotely-apply-diffs/)、[Review](https://developers.openai.com/codex/app/review)、[AGENTS.md](https://agents.md)
- Claude Code：[Permission modes / plan mode](https://code.claude.com/docs/en/permission-modes)、[Best practices](https://code.claude.com/docs/en/best-practices)、[Subagents](https://code.claude.com/docs/en/sub-agents)、[Artifacts](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)
- Cursor：[Agent Overview](https://cursor.com/docs/agent/overview)、[Cloud Agents](https://cursor.com/docs/cloud-agent)
- Copilot：[Workspace User Manual](https://raw.githubusercontent.com/githubnext/copilot-workspace-user-manual/main/overview.md)、[coding agent GA](https://github.blog/changelog/2025-09-25-copilot-coding-agent-is-now-generally-available/)、[Agent management](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/agent-management)
- Devin：[Session tools](https://docs.devin.ai/work-with-devin/devin-session-tools.md)、[Testing & recordings](https://docs.devin.ai/work-with-devin/testing-and-recordings.md)、[Playbooks](https://docs.devin.ai/product-guides/creating-playbooks)、[Knowledge](https://docs.devin.ai/product-guides/knowledge)
- 应用生成器：[v0 Docs](https://v0.app/docs/introduction) / [Agentic features](https://v0.app/docs/agentic-features)、[Bolt Version history](https://support.bolt.new/concepts/version-history-github)、[Lovable Plan mode](https://docs.lovable.dev/features/plan-mode.md) / [Drafts](https://docs.lovable.dev/features/drafts.md) / [History](https://docs.lovable.dev/features/projects/history.md)
- 方法论：[Anthropic Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)、[NN/g AI Agents as Users](https://www.nngroup.com/articles/ai-agents-as-users/)、[IBM Carbon with AI](https://preview.carbondesignsystem.com/with-ai/)、[ZCode Docs](https://zcode.z.ai)
