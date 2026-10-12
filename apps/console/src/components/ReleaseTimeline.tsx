/**
 * 发布日志时间线（首页「发布日志」tab 与 /releases 页共用）。
 * 语言跟随全局 i18n（useLanguage）。
 */
import React from 'react';
import { useLanguage, t } from '../i18n';
const ACCENT = '#4d53e8';

export const releasesItems = [
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
