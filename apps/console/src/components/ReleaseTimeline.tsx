/**
 * 发布日志时间线（首页「发布日志」tab 与 /releases 页共用）。
 * 语言跟随全局 i18n（useLanguage）。
 */
import React from 'react';
import { useLanguage, t } from '../i18n';
const ACCENT = '#4d53e8';

export const releasesItems = [
  {
    date: '2026.11.08',
    en: 'Docs release (v1.2.1): both READMEs (zh/en) rewritten — flat badges, features regrouped into Canvas & Nodes / Chat Generation / Configuration & Operations, demo timeline as a table, contributing guide de-templated; Java version requirements unified (builds target 17, code nodes compile at runtime with -source 21, so the runtime needs JDK 21+); demo video now plays from a GitHub attachment and the 11MB in-repo video file is removed.',
    zh: '文档发布（v1.2.1）：中英文 README 全面重写——flat 徽章、特性按「画布与节点 / 对话生成 / 配置与运维」三组重排、演示时间轴表格化、贡献指南去除 GitHub 默认模板；统一 Java 版本口径（构建目标 17，代码节点运行时以 -source 21 现场编译，运行环境需 JDK 21+）；演示视频改用 GitHub 附件播放器直链，并从仓库移除 11MB 视频文件。',
  },
  {
    date: '2026.11.08',
    en: 'Conversation-first IA and product-trustability release (v1.2.0). IA rebuild: the app-state rail converged into New task / Workflow management / project accordion (settings demoted to a secondary area); New task lands on an options-aware welcome page (project + inherited workflow, effective on first message) and carries the previous conversation context by default; Workflow management gains a "more" menu and an owning-project column (folder_id startup migration + version inheritance); the marketing homepage is back with all three tabs addressable via URL hash (/#demo, /#releases — bookmarkable and shareable). Agent: MCP server integration plus web tools (web_search / web_fetch); ask_user orchestrates follow-up turns. Trustability overhaul driven by a 30-conversation real-model eval: 13 engine/tool/knowledge fixes, loop-container AI tool paths, subworkflows discoverable and fixed end-to-end, real error semantics, run history persisted, true cancellation with three-state stop and in-place retry. Canvas: layout converged on server-side ELK layered (real-size layering + port constraints + deterministic re-layout, visually aligned with the previous dagre), condition/branches dynamic outputs materialized (canvas variable engine aligned with runtime), viewport preservation split into track/restore at two timing hooks (no zoom drift after Live-Demo round trips), session-switch flicker and spurious editor remounts fixed. Session semantics: the draft save-on-demand model restored (explicit save replaces auto-sync; hand-edit loss chain fixed), version commit tightened (AI-drafted notes / release confirmation / mixed history timeline), owner nodes removed entirely. Panels: run history Plan A (docked panel / canvas replay / toolbar avoidance), test-case panel AI-ized (toolbar regrouped / sidebar forms / JSON export), artifact panel with Figma-style gestures and compact density, LLM credentials require all three fields. Reliability: 53 interaction-audit fixes (modal-mask races / data guards / session & editor interactions), sidebar group expansion persisted across route switches (/workflows ↔ /chat no longer collapses), LLM secrets moved out of the repo (yml placeholders + tightened guards, fresh deploys start clean). Engineering: ESLint config ESM-ified, CI on JDK 21, knowledge seeds committed — the Verify workflow is green.',
    zh: '对话优先 IA 与产品可信度大版本（v1.2.0）。IA 重构：应用态侧边栏收敛为新建任务 / 工作流管理 / 项目手风琴分组（设置下沉为二级区）；新建任务落欢迎页选项化（所属项目 + 继承工作流，首条消息发送时生效）并默认携带上一次对话上下文；工作流管理新增「更多」菜单与所属项目列（folder_id 启动迁移 + 落版继承）；宣传首页恢复且三个 tab 落 URL hash（/#demo、/#releases，可收藏分享、前进后退）。Agent 能力：MCP 服务器接入 + 联网工具（web_search / web_fetch）；ask_user 支持新一轮对话编排。可信度大版本（30 段对话真实模型评测驱动）：13 项引擎/工具/知识修复、循环容器 AI 工具路径、子流程可发现并修通、错误语义做真、运行历史落库、真取消（停止三态化 + 试运行状态机 + 原地重试）。画布：布局收口后端 ELK layered（真实尺寸分层 + 端口约束 + 确定性重排，观感对齐原 dagre）；condition/branches 动态输出物化（画布变量引擎与运行时口径拉齐）；视口跨重挂保持拆分订阅/恢复两时机（在线演示往返不再放大漂移）；会话切换闪烁与编辑器无故重挂修复。会话语义：草稿保存制回归（显式保存替代自动同步，手改丢失链路修复）；版本落版收口（AI 起草说明 / 发布生效确认 / 历史时间线混排）；负责人节点整体移除（前端注册 / 后端校验 / 存量草稿剥离兼容）。面板：运行历史方案 A（面板 Dock 化 / 画布回放 / 工具栏避让）；测试用例面板 AI 化（工具栏重组 / 侧栏表单化 / 导出 JSON）；产物面板 Figma 式手势与紧凑重排；LLM 模型凭证三字段必填。可靠性收口：交互审计 53 项（弹窗遮罩竞态 / 数据守卫 / 会话与编辑器交互）；侧栏分组展开态跨路由持久化（/workflows ↔ /chat 切换不再折叠）；LLM 凭证出库（yml 占位 + 守卫收紧，全新部署一键起跑）。工程：ESLint 配置 ESM 化 + CI JDK 21 + 知识库种子入库，Verify 工作流转绿。',
  },
  {
    date: '2026.10.17',
    en: 'Agent toolset converged to 8 tools and the whole teaching chain re-aligned with it. Tools: skill / ask_user / todo_write plus get / node / edge / run / test_case (the 15 canvas-family and 12 snake_case tools are retired). The live system prompt (AGENTS), the gaia-workflow-assistant skill manual and reference files, the workflow-architect persona (v3), runtime guard messages, the skill-gate (node/edge now require a prior skill or get) and the unverified-delivery verdict all speak the new vocabulary — previously the prompts taught tool names the registry had already deleted. run(target=workflow) now really executes the session draft (synchronous, 60s cap) and returns end outputs plus per-node status/duration, failedNodes with errors and notExecuted branches; workflow-level test cases share the same path (DraftRunService). Every session draft is persisted as its own workflow row (draft_<sessionKey>, source=session, hidden from the workflow list, soft-deleted with the session) whose single "draft" version mirrors the canvas on every change, so test cases, runs and versions all key on one code; node(action=update) is now persisted too. New get(target=node, nodeId) returns a node\'s full config (secrets masked) with in/out edges so the model never edits blind. Knowledge chain fixed: the 19 node knowledge docs are generated into the skill\'s references/node_*.md from seed/node-knowledge.json (fresh installs previously had none), the dead agent_skill.content column that broke seeding on a fresh DB is gone, and schema.sql is now the single final DDL (llm_model moved in, four missing columns added, retired tables dropped; the migrator only syncs the architect prompt). Retired: RAG knowledge base, two-layer memory, the system_prompt.default double-write and prompt-zh/en.md, the legacy ops batch engine, the frontend tool executor / AgentDock chain, 17 unused API functions and 80 orphan i18n keys. Engineering: ESLint fixed (flat config, 0 errors) and added to CI, jacoco removed, regression tests for draft execution and tool-registry consistency. Conversation UI: a TRAE-style "task took Xs ›" TaskCollapse row replaces ProcessFold, and Markdown tables now parse without a leading blank line or with full-width pipes.',
    zh: 'Agent 工具体系收敛为 8 个并把整条教学链对齐到它：skill / ask_user / todo_write + get / node / edge / run / test_case（15 个 canvas 族与 12 个 snake_case 旧工具全部下线）。生效中的系统提示词（AGENTS）、gaia-workflow-assistant 技能手册与引用文件、workflow-architect 人设（v3）、运行时护栏文案、skill-gate（node/edge 前必须先 skill 或 get）、假绿裁定全部改用新词汇——此前提示词教的是注册表早已删除的工具名。run(target=workflow) 现在真正执行会话草稿（同步、60 秒超时），返回 end 输出 + 每节点状态/耗时 + failedNodes（含 error）+ notExecuted（未命中分支）；工作流级测试用例走同一条链（DraftRunService）。每段会话的草稿落库为独立工作流行（draft_<sessionKey>，source=session，不进列表，随会话软删），唯一的 draft 版本随画布每次变更实时镜像，用例/试跑/版本统一挂在一个 code 上；node(action=update) 也开始持久化。新增 get(target=node, nodeId)：返回节点完整配置（敏感键掩蔽）与入出边，模型不再盲改。知识链修复：19 份节点知识由 seed/node-knowledge.json 生成为技能的 references/node_*.md（此前全新部署一份都没有）、删除导致新库种子失败的死列 agent_skill.content、schema.sql 成为唯一终版 DDL（llm_model 入库、补齐 4 个漏列、退役表 DROP，迁移器只剩 architect 提示词同步）。下线：RAG 知识库、双层记忆、system_prompt.default 双写与 prompt-zh/en.md、旧 ops 批处理引擎、前端工具执行器与 AgentDock 链、17 个无用 API 函数、80 个孤儿 i18n key。工程：ESLint 修复（flat config，0 error）并接入 CI、移除 jacoco、新增草稿执行与工具注册一致性回归测试。对话界面：TRAE 式「任务耗时 Xs ›」折叠行（TaskCollapse）取代 ProcessFold，Markdown 表格支持无前置空行与全角竖线解析。',
  },
  {
    date: '2026.10.12',
    en: 'Agent reliability & platform capability overhaul (owb/dsh aligned). Persistence semantics rebuilt: AI-generated workflows now bind to the conversation as session drafts — write_workflow only writes the draft (no version created), and "save as version" became an explicit user action (POST /agent/session/{key}/save), so intermediate states never pollute the version list. Model management (owb-style): multi-model entries with vendor presets, per-session model binding, five-level thinking modes (auto/off/low/medium/high mapped per vendor to native thinkingBudget/reasoningEffort), liveness probe and a health ledger aggregated from real traffic; the whole block is engine-gated (self-developed engine only — Ark manages its own models) and lives in the Agent config center with the legacy single-model form removed. Reliability: branch-port validation (fromPort must be a conditions[].key or else; empty-shell nodes rejected with a copy-ready complete example inlined in the message), fake-success detection (runs warn when no end node executed or declared outputs are missing, naming the upstream node), skill-gate (write/edit requires touching knowledge first), three-layer repeat guard (identical-args hard stop, edit→run alternating loop detection, same-tool streak stop), unverified-delivery verdict (mutated without a successful run warns at wrap-up), and dual-cutpoint payload pruning (model context only; observability stays full-fidelity). Long-term memory (owb-style two layers): a manual section edited in the config center plus an agent-driven memory tool (remember/forget/list) with dedup, secret-pattern rejection and a 30-entry cap, injected into every system prompt. Knowledge catalog now injected into the system prompt so the model knows what to look up. Conversation UX: historical tool steps collapse into a ProcessFold strip (step count, error badge, tool-trail chips with ×N merge, per-user expand preference), long histories window to the last 10 turns with "show older" batching; the model picker and context-capacity pill moved into the composer bottom bar (ZCode-style); execution-trace module removed in favor of the Trajectory view; homepage stubs cleaned and admin entry bordered. Also shipped: benchmark harness (static knowledge gate catching known bad teachings + scripted E2E task set asserting tool-call budget, no-version-by-AI, structure and outputs).',
    zh: 'Agent 可靠性与平台能力大版本（对标 owb/dsh）。持久化语义重构：AI 生成的工作流与对话绑定为会话草稿——write_workflow 只写草稿不产生版本，「保存为版本」成为用户显式动作（POST /agent/session/{key}/save），试运行中间态不再污染版本列表。模型管理（owb 式）：多模型条目 + 厂商预设 + 会话级绑定 + 五档思考模式（auto/off/low/medium/high 按厂商映射为原生 thinkingBudget/reasoningEffort）+ 测活探针 + 真实流量健康账本；整块按引擎条件展示（仅自研引擎，方舟模型由远端管理）并收敛进 Agent 配置中心，旧单模型表单移除。可靠性：分支端口校验（fromPort 必须为 conditions[].key 或 else）、空壳节点拒绝并在 message 内联可抄完整示例、假成功检测（无 end 执行/声明输出缺失时点名上游节点）、skill-gate（写工作流前必须先查知识）、三层复读护栏（同参硬熔断 + edit→run 交替循环检测 + 同工具连续熔断）、假绿裁定（改动未验证即收尾时警告）、双切点工具结果修剪（只裁模型上下文，观测链路全量不截断）。长期记忆（owb 双层）：配置中心手写区 + agent 自主 memory 工具（remember/forget/list，去重/拦密钥/30 条上限），注入每次系统提示词。知识目录注入系统提示词（模型开局即知可查什么）。对话体验：历史工具步骤折叠为过程条（步数/出错角标/工具轨迹徽章 ×N 合并/展开偏好记忆）、长会话窗口化（最近 10 轮 + 显示更早）、模型选择器与上下文容量 pill 移入输入框底栏（ZCode 形态）、移除执行跟踪模块保留 Trajectory、首页清理待实现按钮。另附基准测试体系：知识静态 gate（拦已知错误教学）+ E2E 任务集（断言工具轮次/不落版/结构/输出）。',
  },
  {
    date: '2026.10.10',
    en: 'Agent toolchain v2 (deepseek-harness aligned): 13 focused tools replace the 7 composite ones (read list: list_workflows/read_workflow/read_node/list_runs/list_templates/search_knowledge/get_node_schema; edit_workflow with atomic ops batches, in-batch $ref references and a declarative addNodes form; run_workflow; commit trio write/save/delete_workflow; todo_write replaces createPlan/executeStep). Every call is schema-validated before execution with path-level violation fixes fed back to the model, plus unified error codes (INVALID_ARGS/NOT_FOUND/STALE_REVISION/...) and CAS optimistic locking (workflow revision: read→edit→save) so stale overwrites return STALE_REVISION. Knowledge switched from prompt-injection to on-demand retrieval (get_node_schema/search_knowledge with attribution events); every commit stores a node/edge diff; new durable event log (agent_session_event) and per-call metrics (agent_tool_call_log, success rate at /api/agent/metrics/tools). Conversation UI rebuilt as a dsh-style timeline: thinking/tool/text interleave in real execution order (24px single-line tool rows with business glyphs, dot separators, shimmer streaming summaries, IN/OUT cards, error-first-line summaries), the apply card renders inline right after the committing tool row and survives page refresh instantly (pending-confirm query endpoint; previously it could vanish until a 300s timeout rejected the call). Streaming performance: tokens publish through a triple-rAF-coalesced store (~20fps cap) — a 67s stream with tool calls now produces at most 2 long tasks; settled paragraphs are memoized so history rows never re-render mid-stream.',
    zh: 'Agent 工具链 v2（对标 deepseek-harness）：13 个细粒度工具替换旧 7 个复合工具（读层 list_workflows/read_workflow/read_node/list_runs/list_templates/search_knowledge/get_node_schema；edit_workflow 原子 ops 批处理 + 批内 $ref 引用 + 声明式 addNodes 形态；run_workflow；落版三件套 write/save/delete_workflow；todo_write 取代 createPlan/executeStep）。每次调用执行前做 schema 校验，path 级违规修复指引回传模型自修；统一错误码（INVALID_ARGS/NOT_FOUND/STALE_REVISION…）+ 工作流 revision 乐观锁（读→改→存 CAS，过期提交返回 STALE_REVISION）。知识从全量注入改为按需拉取（get_node_schema/search_knowledge，带检索归因事件）；每次落版存节点/连线级 diff；新增持久事件日志（agent_session_event）与逐调用指标（agent_tool_call_log，成功率见 /api/agent/metrics/tools）。对话界面重写为 dsh 式时间线：思考/工具/正文按真实调用顺序交错（24px 单行工具行：业务图标+圆点分隔+shimmer 流式摘要+IN/OUT 卡+错误首行红摘要），应用卡内联在落版工具行之后、刷新页面即时恢复（新增 pending-confirm 查询端点；此前卡片可能消失直至 300s 超时被拒）。流式性能：token 经三重 rAF 合帧 store 发布（约 20fps 上限）——67 秒含工具调用的流式仅产生至多 2 个 long task；已收尾段落 memo，流式期间历史行零重渲染。',
  },
  {
    date: '2026.10.06',
    en: 'Dual-engine agent architecture: Volcengine Ark Managed Agents joins as an execution engine (engine=ark) — the conversation loop, cloud sandbox and token usage run on Ark, while agent definitions sync automatically (the remote agent is created on first run with local tools mapped to Custom Tools; definition changes sync with optimistic versioning). The admin config page adds a "Default engine" switch (local / Ark-managed, effective immediately) and Ark connection settings with required-model validation; sessions show an "Ark-managed" badge, plus new thinking & token-usage events, event-id dedup on SSE reconnect and user.interrupt on stop. The editor AI copilot becomes a bottom-right floating window (Gaia logo button, drag-resizable, auto-binds a conversation per workflow on open).',
    zh: '双引擎 Agent 架构：火山方舟 Managed Agents 接入为执行引擎（engine=ark）——对话循环、云沙箱与 token 用量由方舟运行；Agent 定义自动同步（首次运行自动创建远端 Agent 并把本地工具映射为 Custom Tool，定义变更带版本乐观锁增量同步）。管理后台新增「默认执行引擎」切换（自研 / 方舟托管，保存即时生效）与方舟连接配置（默认模型 ID 必填校验）；会话标题显示「方舟托管」徽标；新增思考过程（thinking）与 token 用量事件、SSE 断线按事件 ID 补投历史、停止对话转发 user.interrupt。编辑器 AI 助手改为右下角悬浮窗（Gaia logo 悬浮钮、拖拽调宽、打开即自动绑定工作流对话）。',
  },
  {
    date: '2026.10.05',
    en: 'Backend-autonomous conversations: the agent loop now runs entirely server-side — the frontend only renders. Multiple windows can watch the same session live and a run keeps going after you close the tab (SSE broadcast with run-snapshot replay on reconnect). Tool permissions moved to the backend (forbid / confirm / always, with auto-approve, auto-reject and manual-require modes plus a confirmation dialog). Canvas tools (add/update node, connect, run) and manage.saveWorkflow (saves the session draft as a new version) now execute on the server. Workspace sessions are organized into folders with a Codex-style accordion rail.',
    zh: '对话改为后端自治：Agent 循环完全在服务端执行，前端只负责渲染。多个窗口可同时实时观看同一会话，关闭窗口后运行仍继续（SSE 广播 + 重连回放运行快照）。工具权限下沉到后端（forbid / confirm / always，支持 auto-approve、auto-reject、require 人工确认弹窗）。画布工具（增改节点、连线、运行）与 manage.saveWorkflow（把会话草稿存为新版本）改由服务端执行。工作空间会话按文件夹分组，并采用 Codex 风格手风琴侧栏。',
  },
  {
    date: '2026.10.04',
    en: 'Workspace rebuilt as a Codex-style three-pane layout: left rail (Chat / Work / Manage switcher, global search ⌘K, account menu at bottom-left), center pane, right inspector. Both panels are drag-resizable, auto-collapse when dragged narrow and reset to default width on double-click. Added light / dark themes aligned with the Codex monochrome palette, unified the rail logo with the homepage, and removed the tab-dependent subtitle.',
    zh: '工作台改造为 Codex 风格三区布局：左栏（对话 / 工作空间 / 管理切换、全局搜索 ⌘K、左下角账号菜单）、中区、右侧面板；左右面板支持拖拽调宽、拖窄自动折叠、双击恢复默认宽度；新增 light / dark 主题并全站对齐 Codex 黑白配色；左侧栏 logo 与首页统一，移除随 tab 切换的副标题小字。',
  },
  {
    date: '2026.10.04',
    en: 'Homepage rebuilt around conversation: top tabs (Chat / Live Demo / Release Log), original logo restored, larger chat composer, API docs folded into per-workflow admin row actions.',
    zh: '首页重构为「对话主导」：顶部 tab（对话 / 在线演示 / 发布日志）、恢复原版 logo、放大对话输入框、API 文档收敛到工作流管理行内按钮。',
  },
  {
    date: '2026.09.14',
    en: 'Conversation-as-API: DeepSeek-style chat homepage, preview / API docs / call dashboard pages, pluggable Agent architecture and canvas versioning.',
    zh: '对话即 API：DeepSeek 风对话首页、预览 / API 文档 / 调用看板页面、Agent 可插拔架构与画布版本化。',
  },
  {
    date: '2026.08.07',
    en: 'AI Agent GA: sidebar conversation (CreatePlan + step cards), debug info panel per LLM call, agent config center (models, prompts, tools, permissions), session review reuses the chat bubble style with message → debug jump, curl exports with full host URL, session titles support double-click rename.',
    zh: 'AI Agent 正式发布：侧边栏对话（CreatePlan 分步规划 + 执行卡片）、每次 LLM 调用独立调试信息面板、Agent 配置中心（模型、提示词、工具、权限）、会话审查复用侧边栏消息气泡样式并支持消息↔调试跳转、curl 导出链接带完整 host、会话标题支持双击重命名。',
    link: 'https://boommanpro.cn/post/ai-coding-gaia-ai-agent-workflow',
  },
  { date: '2026.07.14', en: 'Rebuilt as Gaia: internationalized homepage, admin console with workflow/template management, version control, multi-condition node synced from official flowgram.ai.', zh: '重建为 Gaia：国际化首页、管理后台（工作流/模板管理）、版本控制、同步官方 multi-condition 节点。' },
  { date: '2026.01.25', en: 'Added admin console with configurable server address.', zh: '增加管理端，右上角可配置自己的服务器地址。' },
  { date: '2026.01.23', en: 'Added Electron desktop app for local experience.', zh: '增加 Electron 端，可直接运行体验。' },
  { date: '2026.01.06', en: 'Merged frontend and backend repositories into one monorepo.', zh: '前后端两个仓库合并。' },
  { date: '2025.12.27', en: 'Upgraded to flowgram.ai v1.0.6, built Vue3 admin demo and server, updated docs.', zh: '跟进官网升级到 v1.0.6，开发 Vue3 管理端 demo 和服务端，更新文档。' },
  { date: '2025.10.17', en: 'Upgraded to flowgram.ai v0.5.5, fixed related code.', zh: '跟进官网升级到 v0.5.5，修复相关代码。' },
  { date: '2025.09.06', en: 'Frontend and backend support for string-format component with SpEL and Thymeleaf syntax.', zh: '前后端支持 string-format 组件，支持 SpEL、Thymeleaf 语法。' },
  { date: '2025.08.22', en: 'Server-side support released.', zh: '服务端支持发布。' },
  { date: '2025.08.20', en: 'Updated to latest official branch, refactored code.', zh: '更新分支到官网最新，重构代码分支。' },
  { date: '2025.05.27', en: 'Refactored codebase, maintained only apps/demo-free-layout directory.', zh: '重构代码分支，仅维护 apps/demo-free-layout 目录。' },
];

export const ReleaseTimeline: React.FC = () => {
  const lang = useLanguage();
  const isZh = lang === 'zh';

  return (
    <div style={{ position: 'relative', paddingLeft: '32px' }}>
      {/* Vertical line */}
      <div style={{
        position: 'absolute',
        left: '7px',
        top: '8px',
        bottom: '8px',
        width: '2px',
        background: '#e8e8ea',
      }} />

      {releasesItems.map((item, i) => (
        <div key={i} style={{ position: 'relative', marginBottom: i === releasesItems.length - 1 ? 0 : '28px' }}>
          {/* Dot */}
          <div style={{
            position: 'absolute',
            left: '-32px',
            top: '4px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: i === 0 ? ACCENT : '#fff',
            border: i === 0 ? 'none' : `2px solid ${i === 0 ? ACCENT : '#ccc'}`,
          }} />

          {/* Content */}
          <div
            style={{
              padding: '16px 20px',
              background: i === 0 ? '#f5f5ff' : '#fff',
              border: `1px solid ${i === 0 ? '#e0e0ff' : '#f0f0f2'}`,
              borderRadius: '8px',
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: i === 0 ? ACCENT : '#999',
              marginBottom: '6px',
            }}>
              {item.date}
              {i === 0 && (
                <span style={{
                  marginLeft: '8px',
                  padding: '1px 8px',
                  background: ACCENT,
                  color: '#fff',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}>
                  {t('releases.latest')}
                </span>
              )}
            </div>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.6, margin: 0 }}>
              {isZh ? item.zh : item.en}
            </p>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  marginTop: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: ACCENT,
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                {t('releases.readMore')} →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReleaseTimeline;
