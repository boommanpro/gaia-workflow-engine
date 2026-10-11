# Gaia × dsh × OpenWorkbuddy 产品能力对比（模块/子项级）

> ⚠️ **OWB 仓库更正（2026-10-11 晚）**：本文 OWB 列基于 `github.com/chenin0931/OpenWorkbuddy`（11★，2026-07 停更，MIT）——后证实是**另一个同名早期项目**，与真正的活跃项目 `github.com/CatCatUncle/openworkbuddy`（285★，PolyForm NC）无 fork 关系（repo id 不同）。本文 OWB 列结论不可直接引用；真版 OWB 的日志调试全链路对标见 `docs/openworkbuddy-observability-benchmark.md`，本文待基于 `~/trae_project/openworkbuddy-catcatuncle` 重写。
>
> 对比日期：2026-10-11。方法：对三个代码库做源码级盘点（非文档宣传口径），所有条目附文件路径证据。
> - **Gaia**：本仓库（`apps/api/gaia-workflow` Java 后端 + `apps/console` React/flowgram 前端）
> - **dsh**：`~/trae_project/deepseek-harness/deepseek-harness`（DeepSeek 官方开源 harness，pnpm monorepo，~50 个能力域）
> - **OpenWorkbuddy (OWB)**：`~/trae_project/OpenWorkbuddy` —— 实为完整开源 monorepo（`on-my-workbuddy` v0.3.3，MIT，github.com/chenin0931/OpenWorkbuddy），Electron macOS 桌面 Agent 工作台

---

## 1. 一页定位

| 维度 | Gaia | dsh | OpenWorkbuddy |
|---|---|---|---|
| 产品一句话 | 「对话即工作流生产线」：AI Agent 把自然语言变成带版本链的可执行工作流，落版后发布为 API | 「一切皆插件」的 Agent Harness：事件日志为唯一事实源，内核极小、外围全部可组合 | 「权限审批 + 可恢复执行 + 证据导向」的本地 macOS Agent 工作台 |
| 形态 | Web 控制台 + REST/SSE API | 5 种交付面：Web UI / CLI / headless / ACP stdio / SDK / Electron | Electron 桌面 App（仅 macOS）+ Chrome MV3 扩展 + Rust Native Host |
| 内核 | 自研 Java 引擎壳 + AgentScope Java 2.0（ReAct 循环）+ 方舟托管引擎 | 自研 Cordis agent-loop（688 行状态机） | MIT `@earendil-works/pi-agent-core` + pi-ai |
| 语言/栈 | Java Spring Boot + SQLite + React/flowgram | TypeScript/Node ≥22 + Cordis | TypeScript/Electron + better-sqlite3(WAL) + Zod 契约 |
| 领域焦点 | 工作流 DSL/画布/落版/发布 | 通用编码/自动化 harness 的工程化极致 | 本地文件/Shell/浏览器自动化的权限与可信执行 |
| 多引擎/模型 | local(旧)/agentscope(默认)/ark(方舟托管) 三引擎路由 | DeepSeek 为主 + pi-ai 多 provider + 任意 OpenAI 兼容 | OpenAI/Anthropic/Kimi(moonshot) 三 provider，每 Run 模型快照不可变 |

---

## 2. Agent 引擎与运行时韧性（模块对比）

| 子项 | Gaia | dsh | OWB |
|---|---|---|---|
| 循环驱动 | AgentScope `HarnessAgent` ReAct，run 粒度编排（`AgentSessionRunService` 461 行） | `packages/core/agent-loop`：phase 状态机 + turn→step（1 step = 1 次 LLM 调用+工具执行），权威时序图生成于 `docs/agent-lifecycle.md` | pi-agent-core 工具回合循环；10 态 Run 状态机（understanding→…→completed/failed/cancelled） |
| 真中断 | `takeWhile(!interrupted && !softStopRequested)`，中断落库 marker 消息 + `interrupted` 事件 | `agent.cancel(cause)` AbortController 链；已送达流前缀落为 `assistant/message{interrupted:true}` | 停止按钮 + 确认弹窗（“已完成变更不自动撤销”）；中断会拒绝挂起审批、终止 Trace |
| 崩溃恢复 | 启动时为无终态 run 补写 `run_interrupted` 事件 + 合成 assistant 消息（epoch 纪元防误伤） | 三件套：checkpoint-policy（副作用前强制落盘，写失败 fail-closed）+ resume 续写 + 合成 interrupted closer；torn-tail 日志修复 | `child-process-gone` 监听 worker 崩溃→Run 转 paused、过期审批、取消孤儿工具，**不重放非幂等动作** |
| 自然停止/失控防护 | WrapUpGuard：runawayTurnCeiling(30) 或连续 8 轮全工具失败→收走工具让模型总结（不砍 run） | TurnEndReason 全集 completed/aborted/blocked/error/**max-tokens**/interrupted/forked | 预算双轴（回合数+时长，单轮/全局限额）+ `budget_exhausted` 事件 + 终态 UI |
| Steering 运行中插话 | ConcurrentLinkedQueue 收件箱，run 前 drain 注入 + run 后残留链式续跑新 run | 双队列 Inbox：`next-turn` + `next-step`（mid-turn steering），durable splice 协议 | pi `steer` 支持消息+图片；宿主 80% 回合预算时“收敛 steering”、剩 6 回合“收尾 steering” |
| LLM 重试 | 空响应重试 2 次、500ms 可中断睡眠、durable-before-wait 先落 `llm_retry` 事件 | provider 级 RetryPolicy：normal(max 5 次,指数退避 500ms→10s,对称抖动)/always(无限)；尊重 Retry-After；重试状态投影持久化跨崩溃幂等 | `packages/core/src/retry.ts`（策略较简单，无 provider 级配置面） |
| 上下文压缩 | 两层：确定性剪枝(>40 留 30) + AgentScope 内建 Compaction 摘要兜底 | compaction-basic：0.8 压力阈值/verbatim 尾部 0.16/headroom 64K/每模型覆盖表/摘要可换模型/溢出恢复监听；工具结果剪枝(头4096+尾1024)+图片卸载两个专项 | 70% 阈值 checkpoint 压缩至 60%，**带 SHA-256 签名与 sourceRefs、重启可恢复** |
| 并行工具 | readOnly 前缀判定 concurrencySafe，boundedElastic 调度，事件 seq 串行化保有序 | exclusive=barrier / parallel=bounded rolling pool，启动前动态重分类；结果按模型顺序提交 | 默认并行只读工具数=4（RunLimits 可配） |
| 重复工具防护 | RepeatToolGuard：同参(键排序规范化)第 3 次 INVALID_ARGS **硬熔断停机**；非 INVALID_ARGS 3/5/8 次升级提醒 | repeat-tool-reminder：阈值 [3,5,8] **建议性提醒**（含参数预览 500 字符），不否决 | 无独立重复护栏（靠预算限额兜底） |
| 工具超时 | run_workflow timeoutMs≤600000（业务级） | 工具声明 timeoutMs + 协作 signal，结构化 TOOL_TIMEOUT 与嵌套外层超时正确区分 | shell_run 600s 上限、后台进程默认 30 分钟 |

**小结**：韧性工程 dsh 最完整（形式化程度最高，事件/恢复/重试全部持久化幂等）；Gaia 的差异点是“硬熔断”取向（RepeatToolGuard 直接停机 vs dsh 只提醒）——这是针对弱模型（Qwen 空参复读 67 次）的实战选择；OWB 的差异点是“不重放非幂等动作”的崩溃恢复哲学和 checkpoint 签名。

---

## 3. 工具系统

### 3.1 数量与谱系

| | Gaia（13 个，DB-first 注册） | dsh（60+，插件声明） | OWB（28 个，注册表硬编码） |
|---|---|---|---|
| 读/检索 | list/read_workflows、read_node、list_runs、list_templates、search_knowledge、get_node_schema | read/read_image/glob/grep(ripgrep)/web_search/web_fetch/lsp/session_search/event_* | file_list/file_read(带 sha256+mtime)/file_search(ripgrep)/web_search(Bing)/web_fetch |
| 写/编辑 | edit_workflow（声明式 delta：addNodes/updateNodes/removeNodes/addEdges/removeEdges 或 ops 数组，原子生效，$ref 引用） | write/edit/str_replace_editor（read-before-write 门禁） | file_write(expectedSha256 防陈旧)/file_replace/file_draft_start-append-commit(8000 字符分片原子提交)/file_delete(进回收站) |
| 执行 | run_workflow（轮询至终态，写 test_report 产物） | bash/pwsh(一次性+持久 PTY)/terminal_×6/**run_code(PTC：模型写 TS/Python 程序把工具当 SDK 调)** | shell_run/process_start-poll-stop(后台进程≤3 个，游标增量轮询) |
| 落版/交付 | write_workflow(CAS)/save_workflow/delete_workflow(confirmed=true) | present(交付物)/deliverables | output_register(产物登记，拒凭据/隐藏文件/软链)/document_render(Markdown→PDF 沙箱) |
| 编排/元 | todo_write | todo_write/subagent(+Codex/Claude Code 后端)/workflow(JS 编排)/ralph/Agent Teams×9/goal×3/schedule×4/job×3 | task_plan(≤20 步)/task_step_update(6 态+必填 evidence)/task_complete(完成门禁)/agent_delegate(只读子代理) |
| 外部集成 | — | MCP 客户端+mcp__* 工具/hooks 兼容 Claude Code | mcp_list_tools/mcp_call_tool + Chrome×6(tabs/snapshot(dom|ax)/screenshot/navigate/click/type) |

### 3.2 校验与安全机制

| 子项 | Gaia | dsh | OWB |
|---|---|---|---|
| 参数校验 | JSON Schema 子集校验器，Violation={path,issue,fix} path 级修复指引 | 插件 schema（`ctx.tools.schemas()`，工具目录文档由脚本真实启动生成+指纹校验） | 每工具 JSON Schema + Zod 契约双向校验（跨进程） |
| 错误模型 | 统一错误码 8 种（INVALID_ARGS/NOT_FOUND/STALE_REVISION/REJECTED_POLICY/EXEC_ERROR/TIMEOUT/UNAVAILABLE_SURFACE/UNKNOWN_TOOL） | LlmFailure/TOOL_TIMEOUT/结构化 error{name,code,reason}（error 模型不可见，不污染上下文） | 风险四级 readonly/reversible_write/external_side_effect/high_risk_irreversible + 规则 ID（shell.destructive 等） |
| 乐观锁/防陈旧 | baseRevision CAS 贯穿 read→draft→write/save，冲突 STALE_REVISION 引导重读 | read-before-write 观测策略门禁 | expectedSha256+mtime 校验，冲突 STALE_WRITE 必须重读合并（文件租约） |
| 权限面 | always/confirm/forbid 三态 + require(默认 fail-closed)/auto-approve/auto-reject；页面白名单 pageContexts；执行面 ANY/BACKEND_ONLY/FRONTEND_ONLY | 审批 seam ask/never + 沙箱三模式(read-only/workspace-write/danger-full-access) + 权限预设捆绑 | 审批 + full_disk 双模式；永久授权仅 file.write/edit+精确路径无通配；硬拒绝清单（Keychain/SSH 私钥/自家 DB/AppleScript 自动化） |
| 结果回传 | result 800 字符截断入 debug | spill-policy：超限→有界预览+落盘 locator（原文完整保留在会话日志） | Trace/artifact 保留原文，超长工具结果进 artifact 不进 UI |

**小结**：Gaia 工具面窄而深（全部围绕工作流领域，CAS/delta/占位修补是独门）；dsh 工具面最宽且有独树一帜的 PTC（模型写程序编排工具）；OWB 的工具安全工程最细（风险分级+参数可编辑审批+硬拒绝+回收站删除）。

---

## 4. 日志/可观测性（重点模块）

### 4.1 存储模型

| | Gaia | dsh | OWB |
|---|---|---|---|
| 载体 | SQLite 三表：`agent_session_event`(v2 追加只写) + `agent_tool_call_log`(指标) + `agent_session.debug_data`(调试快照) | 每会话一个目录的 JSONL append-only 事件日志（v4 格式，历史代 zstd+校验和压缩帧，torn-tail 恢复，格式迁移链 v0→v4 + SHA-256 指纹目录） | SQLite(WAL) 19 表中的 `run_traces`/`trace_spans` + 审计表（**SHA-256 prev_hash/entry_hash 哈希链防篡改**） |
| 原则 | 「model-visible ⟺ logged」：模型看过的工具参数/结果可从事件日志完整重建 | 「事件日志为唯一事实源」：surface(产生模型历史) vs log-only 二分，`surfaceOp: append/replace` 区间替换保重放保真 | 「证据导向」：工具回执必带 evidence，Trace 是信任链 |
| 事件类型 | 十余种业务事件（turn/tool_call/user_message/assistant_settled/llm_retry/artifact/document/wrap_up/run_end…） | **60+ 种**带文档目录（`docs/persistence-catalog.md` 生成自源码+指纹） | RunEvent 10 种 + Pi 协议 13 种 payload + 审计 outcome 7 种 |

### 4.2 记录维度明细（字段级）

**Gaia 记到什么维度：**
- `agent_session_event`：session_key / run_id / seq / event_type / payload / created_at —— 全量落库不截断（除 token/thinking 高频流）
- `agent_tool_call_log`（每次工具调用一行）：turn / tool_name / outcome(SUCCESS 或错误码) / error_code / duration_ms / args_digest(2000 字符截断)
- `debug_data`（按 LLM 轮分组 DebugEntry，上限 50 条尾部截断）：request{model,temperature,messagesCount,toolsCount,invokedTools[toolCallId/name/args 400 截断/时间戳]}、response{durationMs,contentLength,thinkingLength,toolCalls}、toolResults{result 800 截断,rejected,durationMs}、error
- token：llm_end 事件带 promptTokens/completionTokens/model；turn 事件带 contextTokens；ark 引擎累计到 session.token_usage JSON
- 工作流层：`gaia_workflow_log`（execution_id/status/input_output_params/error/duration/invoke_channel/api_path/api_key_prefix 脱敏）
- 聚合 API：`/api/agent/metrics/tools`（工具×结局、avgDurationMs、successRate、按 days≤90）

**dsh 记到什么维度：**
- 事件信封：`{type, seq(单调连续), time(unix ms), data, ignorable?, surfaceOp?, sourceEventSeqs?}` —— 溯源字段 sourceEventSeqs 记录“本事件由哪些事件派生”
- `assistant/message`：turn/step 定位 + 完整内容块 + **紧凑精确计时流 AssistantStreamRecord[]**（reasoning-delta、block-start/end 时间戳）+ usage{inputTokens/outputTokens/**cacheRead/cacheWrite/reasoningTokens**} + interrupted 标记；失败/重试/取消的尝试落 `assistant/attempt`
- `request/header`：provider/model/采样参数/**工具 schema 快照** + initial/resume/change/series 原因
- `tool/call`：**原始未解析的参数 JSON 字符串**；`tool/result`：模型可见 content + 不可见 error{name,code,reason} + 工具私有展示 meta
- 审计：approval/asked、approval/decided、permission/preset、sandbox/mode 全事件化
- **token-meter 重放式确定性测量**（无模型调用）：totalTokens/surfaceTokens/逐节点 tokens；三个投影：tokenUsage（按计费 attempt 折叠）、contextPressure（pressureTokens/projected/contextWindow）、contextBreakdown（system/tools/messages 启发式分解）；`deriveTurnTokenUsage()` 每 attempt 与整 turn 精确用量
- session-stats：整日志 turn/step 计数 + LLM/工具/首 token/解码墙钟时间（分页/压缩后仍稳定）
- 遥测上报：OTLP（每记录完整事件，4MB 上限）或 DeepSeek 官方 API 增量上传（水位线）

**OWB 记到什么维度：**
- `trace_spans` 8 种 Span（run_turn/context_stage/model_turn/tool_call/approval_wait/checkpoint/verification/managed_process）：durationMs / usage / error / artifactIds —— 是**层级树**（Span 嵌套）
- 审计条目：时间/操作/目标/结果/摘要 + tokenUsage{input,output,cachedInput} + durationMs；哈希链防篡改
- 审计页指标卡：本地工作/已有结果/需要确认/未完成 四类汇总
- 保留策略：detailedLogRetentionDays(1-3650) + detailedLogMaxBytes 双限制
- 成本金额：无（模型 cost 全 0，纯本地不计费）

### 4.3 这套日志分别解决什么问题

| 问题 | Gaia 的答案 | dsh 的答案 | OWB 的答案 |
|---|---|---|---|
| 排障“模型当时到底看到/做了什么” | 事件日志全量重建 model-visible 内容 + DebugPanel 请求回放 | 60+ 事件 + 原始参数 JSON + schema 快照，`ctx.sessionQuery` 可编程读取，还有 5 个只读历史工具让**模型自己**查历史 | Trace Span 树 + 工具诊断（含 toolCallId/参数/来源/错误 JSON，本地正则脱敏） |
| 回放/重现任意时刻 | 单 run 事件回放 API + E2E 快照重建 | llm-replay 用录制 JSONL 逐次回放模型流 + `replay.override.json` 注入故障 → **keyless 测试** | 不重放（哲学：非幂等动作不重放，靠 checkpoint 恢复） |
| 成本/token 分析 | llm_end/turn 事件级 token | token-meter 重放式精确测量 + 计费折叠 + contextBreakdown 分解 | Span 级 usage + 审计累计（无金额） |
| 防篡改/合规审计 | 无 | 无（但事件不可变 + SHA-256 指纹目录保证格式完整性） | **审计哈希链**（防篡改）+ 诊断包导出（脱敏） |
| 质量运营 | 工具成功率聚合 API + canary.py 金丝雀回归口径 | session-stats + OTel 上报 + benchmarks 基准 | 审计指标卡（4 类汇总） |

---

## 5. 调试模块（重点模块）

| 子项 | Gaia | dsh | OWB |
|---|---|---|---|
| 主调试视图 | **DebugPanel**（995 行）：每条 LLM 调用一个 DebugEntry，条目前缀自动提取、focusEntryId 定位滚动、上下文徽章（系统提示词来源/RAG/知识图谱/工具数） | **Trajectory** 时间线：turn 感知账本 + 交互式计时总览，分组 User/Assistant/Tool/嵌套 Subtool/compaction，标 turn/step 边界；in-flight 记录只显示起始标记不臆造耗时 | **WorkInspector「诊断」Tab**：工具诊断 + 确认记录 + 阶段诊断（Span 层级树）三块 |
| 请求回放 | **RawDetailOverlay 三 Tab（request/response/context）**：OpenAI payload 视图 ↔ 原始 SSE 事件视图切换、换行开关、一键复制 —— 把 DebugEntry 重建为可读请求/响应 JSON | request/header 事件存 schema 快照 + sessionQuery 重建；llm-replay 回放 | 无请求回放（仅脱敏诊断文本） |
| thinking 全文 | SessionReview 折叠渲染真实 reasoning 全文 | reasoning 内容块独立于 text；Session Inspector 的 block-start{reasoning} 折叠行 | **刻意不展示思维链**（只转译为进度文案） |
| 原始日志级调试 | 会话导出 JSON（messages[].thinking + debugData） | **Session Inspector**（experimental）：Raw Log/Chat Group 双视图、虚拟化表格、按 turn/step 分组嵌套、流 delta 行高亮、类型过滤、对象引用跳转面包屑、“在 Chat 中定位”DOM 匹配 + **十字线点选 Chat 元素反查日志** | 诊断包导出（redacted）后离线看 |
| 运行时深度调试 | 无 | **Chrome DevTools Inspector**（experimental）：把运行中 Host+Client 接入真 Chrome DevTools——Console 求值、Sources 断点、网络抓取、Cordis 插件树；`pnpm run demo:inspector` | 打包版无 devtools 入口（electron-security 测试保证） |
| 会话审查闭环 | **SessionReview 页**：消息回放 + thinking + 审查标记（review_rating good/bad、review_issue、review_status pending/analyzing/fixed/ignored、**review_fix_note=给 coding agent 的修复指令**）→ 会话质量→修复任务闭环 | 无专门人工审查页（Trajectory+feedback 消息级反馈） | 审计页（自动化记录视角，非人工审查视角） |
| 测试侧调试武器 | canary.py（发任务/订阅 SSE/自动确认/统计结局码） | **llm-mock-server**（脚本化故障注入：断流/停滞/畸形 chunk/限流）+ llm-replay + agent-loop-testkit | vitest + Playwright 14 场景（含视觉回归） |

**小结**：Gaia 调试模块的独特点是「请求回放 + 人工审查闭环」（DebugPanel 的 OpenAI payload↔SSE 双视图、review_fix_note 驱动修复）；dsh 是「三层调试栈」（Trajectory 产品级 → Session Inspector 日志级 → Chrome DevTools 运行时级）+ keyless 回放测试；OWB 是「安静 UI + 检查器集中诊断」——把复杂性从对话流挪到右侧面板，且明确不做思维链展示（产品判断：对终端用户无价值）。

---

## 6. 会话与消息模型

| 子项 | Gaia | dsh | OWB |
|---|---|---|---|
| 真相源 | `agent_message` 表（role/content/tool_calls JSON/thinking/tool_call_id/page_context/compacted） | JSONL 事件日志（表面派生 surface.ts、请求重建 preparation.ts） | SQLite runs/messages（streamingMessageIds 流式落库） |
| 状态机 | SessionEventBus 快照：idle/running/stopped/done/error + phase/turn/assistantContent/toolCalls；订阅时僵尸 running 归位 | 事件折叠投影层（session-projection 注册表 + cache） | 10 态 RunStatus（含 waiting_approval 注意力圆点） |
| 断线/多窗口 | SSE 断线重连回放（快照+最近 500 条事件缓冲）+ /status 轮询兜底；多窗口订阅广播 | active-stream-reconnect 基准专测 | events.subscribe 推送 + 乐观回显气泡 |
| 死信处理 | pendingConfirm：300s 超时自动拒绝、20s 心跳重发、run 收尾 cancelPendingConfirms 全拒绝收口、`GET /pending-confirm` 即时恢复 | approval/asked+decided 审计；waterfall answerer fail-closed | 过期审批在崩溃恢复时统一处理 |
| Fork/分支 | 无 | **fork**：任意 seq 切前缀 + end-seed 标记，子会话继承 spill locator | 无 |
| 标题 | 首条消息截 30 字 + LLM 自动生成 | 三策略包（首 prompt LLM/all-prompts/纯文本） | 无自动标题（Run 列表展示） |

---

## 7. Artifact 与产物体系

| 子项 | Gaia | dsh | OWB |
|---|---|---|---|
| 存储模型 | `agent_artifact` 表：artifact_key（会话级 upsert / 追加式两种生命周期）、run_id、type(workflow/plan/test_report/release)、status 7 态、version 递增 | deliverables/present 工具 + workspace/changes 事件 + spill 落盘 locator | **内容寻址（sha256 分片目录 0600）** artifacts 库，7 种 kind（tool_result/attachment/file_snapshot/diff/checkpoint/final_output/diagnostic） |
| 版本能力 | run 粒度 version + 会话草稿重启恢复 + CanvasHistoryPopover 版本历史 | 无产物版本树（会话本身可 fork） | 快照+Diff+**撤销**（单级回滚，非多版本树） |
| 展示 | ArtifactCards(643 行)/CanvasSnapshotCard(画布快照卡)/ReadonlyCanvas 产物画布 + `document` 事件实时上屏 | ui-deliverables 面板 | ArtifactShelf（检查器顶部，只显示 final_output+截图，内部产物过滤） |
| 门禁联动 | 产物状态机直接挂钩落版门禁（proposed→applied 需确认） | present 呈现即登记 | output_register 拒绝凭据/软链；diff 撤销带过期校验 |

**小结**：Gaia 产物体系与“工作流落版”深度耦合（版本+门禁+画布往返是闭环）；OWB 的内容寻址+撤销是可信执行的延伸；dsh 产物概念最轻（deliverable 呈现 + spill 外存）。

---

## 8. 工作流与自动化

| 子项 | Gaia | dsh | OWB |
|---|---|---|---|
| 可视化编辑器 | **flowgram free-layout + 8 插件**，13 类节点（start/end/llm/code/http/condition/multi-condition/branches/loop/variable/string-format/assignee/comment），属性面板 fx 表达式/Monaco；前端 headless 校验第一道闸 + 后端 /api/task/validate | 无画布 | 无画布 |
| 代码执行节点 | Java 内存编译+Groovy+JS 三引擎 | run_code(PTC node/python) | shell_run/process_* |
| 版本管理 | 版本表+id 级 diff（nodes/edges added/removed/changed）+set-current 回滚 | — | 快照+Diff+撤销 |
| 发布为 API | **gaia_workflow_api**：api_path/api_key/request_schema/error_codes + 调用统计 + `POST /api/v1/wf/{code}` 对外 | — | — |
| 编排 | 链式执行（Chain/Node/Edge 事件+监听器） | workflow 工具：JS 脚本 `agent()/parallel()/pipeline()/phase()/log()`；ralph 循环；Agent Teams | task_plan/task_step_update 单线计划 |
| 定时 | 无 | schedule_*（once/固定频率/每日/每周/cron 五字段）+ 错过只补最新 + 冷恢复 | automations（once/interval≥60s/cron 带时区）+ 关窗托盘续跑 + 高风险暂停并 macOS 通知 |
| 事件驱动 | 无 | **webhook→新会话**（GitHub 适配） | 无 |
| 长目标 | 无 | goal_* 跨会话 + 空闲自动续轮（配额耗尽记 blocker） | 无 |

---

## 9. 对话/时间线 UI

| 子项 | Gaia | dsh | OWB |
|---|---|---|---|
| 流式渲染 | live-stream-store：高频增量三重 rAF 合帧（~20fps）+ 后台页 240ms 兜底定时器；结构性事件立即发布 | assistant-stream 瞬时 chunk 帧（text-delta/reasoning-delta/tool-call 参数增量/usage）+ durable 侧 attempt/message 内嵌紧凑计时流 | text.delta/message.delta + 流式落库 |
| 时间线模型 | **交错时间线**：TimelineItem = thinking \| tool \| text \| notice（护栏警报/收尾/重试/中断入线）+ applySnapshot 按真实顺序重建 | ui-chat（work-details 模式控制 reasoning 可见性、Verbose 保留完成轮过程行、本地 steering 回显原子替换） | **执行过程卡**：每轮一条可原位展开的 14 类步骤卡（understand/plan/search/read_web/browser/file/command/connector/write/output/verify/approval/recovery/complete）+ SVG 图标 + 耗时/来源/产物依据 |
| 确认卡 | ConfirmModal 内联渲染在对应工具之后 + pendingConfirm 即时恢复 | ui-approval 接管 composer，渲染关联工具详情 | ApprovalCard：风险分级文案 + **参数查看与 JSON 参数编辑后放行**（编辑提升风险等级会被拒绝）+ 授权范围选择（仅本次/本工作相同参数） |
| 计划展示 | PlanCard（todo_write） | ui-plan + `/plan` 斜杠命令 + exit_plan_mode | task_plan 只读计划 + “先整理计划(只读)”模式 |
| 助手入口 | **FAB 悬浮球**（右下角）+ Dock 侧栏；编辑器路由下 EditorCanvasBridge 实时上画布 | Web SPA 全页 + dockkit 面板布局 | 桌面主窗口 + ShellSidebar |
| 多语言 | i18n 中英 | en/zh 双语（翻译配对校验脚本） | 简体中文固定 |
| 会话组织 | chat/work 双 scope + 工作文件夹 + 置顶/归档 | 会话目录 + 保留策略 + fork 树 | Run 列表 + 搜索 + 状态徽标 |

---

## 10. 安全与审批门禁

| 子项 | Gaia | dsh | OWB |
|---|---|---|---|
| 确认哲学 | confirm 默认 require **fail-closed**；300s 无人响应自动拒绝；20s 心跳重发防丢卡；无在线窗口的落版默认挂起（unattended-apply-limit 需显式配置+run 内额度） | 审批 seam ask/never + waterfall answerer；无 answerer 即 unavailable 拒绝；每次请求与结果都审计 | 风险四级 + 参数可编辑放行 + 永久授权窄面（仅 file.write/edit+精确路径） |
| 删除保护 | delete_workflow 双门禁（confirmed 参数 + 确认卡，缺省要求先向用户复述删除目标） | 沙箱拦截 | file_delete 进 `.on-my-workbuddy-trash` 回收站 |
| 沙箱 | 执行面隔离（BACKEND_ONLY 工具） | **子进程级文件沙箱**三模式 + Windows ACL + SSH 远程沙箱 + 无法强制时 fail SANDBOX_UNAVAILABLE | 四进程隔离（Renderer→Main→AgentHost→ToolRunner 各自 utilityProcess） |
| 网络安全 | API Key 脱敏落日志 | web-fetch：公网地址校验/连接钉扎/同源重定向/字节上限 | web_fetch：DNS pin/私网阻断/逐跳重定向校验/2MB/GBK 解码 |
| 凭据 | gaia_workflow_api key 前缀脱敏 | credentials 域（本地/DeepSeek 账号/API key），上传按哈希隔离不持久化 | safeStorage 加密 BLOB + `credential.provide` 临时注入内存，无 key 读取 API |
| 审批后行为 | 确认通过→执行；拒绝→REJECTED_POLICY 注入 rejected 消息让模型换路 | 拒绝原因来源化告知模型；策略切换以用户消息告知 | 拒绝→模型收到结构化拒绝；auto-review（experimental）模型自评动作 |

---

## 11. 测试基础设施

| | Gaia | dsh | OWB |
|---|---|---|---|
| 规模 | 后端 22 个测试文件 ~132 个 @Test（韧性护栏/引擎历史回放守护/工具校验/ops 原子性/Ark 翻译器/节点解析 22 用例等） | **~1634 个 spec**（vitest 多层配置：单测/e2e/snapshot(record/refresh/replay 三模式)/expected/web 快照/stress/perf/bench） | vitest 单测 + Playwright 14 个 E2E 场景（含视觉回归 + electron-security 安全测试） |
| Mock LLM | 无独立 mock（用真实弱模型 Qwen 当“病理验收”手段） | **三层**：llm-mock-server（协议级故障注入：断流/停滞/畸形 chunk/限流）+ llm-replay（录制回放+故障覆盖注入）+ agent-loop-testkit（生产 AgentLoop+Inbox stub） | 无 mock LLM 层 |
| E2E | 两轮 20 用例浏览器 GUI 黑盒（playwright.evaluate 驱动 IAB）+ 证据截图 | 快照套件四协议适配器（headless/SDK/ACP/Web，ACP 走真实子进程）+ 身份脱敏 | Playwright 驱动 Electron |
| 隔离 | GAIA_API_TARGET 独立端口+独立 SQLite 副本 | sandbox/remote-mock | 独立 userData 目录 |
| 基准 | 无 | benchmarks：active-stream-reconnect/agent-continuation/conversation-fold/long-session-browser/session-corpus/session-open/terminal-io | 无独立基准套件 |
| 自校验 | canary.py 金丝雀 + backup/restore-db | **40+ verify-\* 门禁脚本**（工具目录/配置目录/持久化指纹/文档引用/模块图/许可证/翻译配对） | CI（GitHub Actions + macOS 签名流水线） |

---

## 12. 各自独有能力清单（他方没有的）

**Gaia 独有：**
1. 可视化工作流编辑器（flowgram 13 节点）+ 前后端双重校验 + id 级版本 diff/回滚
2. 工作流一键发布为外部 API（api_path/api_key/调用统计/脱敏日志）
3. 会话审查闭环（review_rating/issue/status/**review_fix_note 给 coding agent 的修复指令**）
4. 落版门禁体系（preValidate 语义校验/零边校验/CAS/占位修补警告随回执透传）
5. RAG 知识库（embedding 降级关键词）+ 知识图谱子图/路径检索注入
6. 配置中心（提示词/模型参数在线管理 + 版本归档 revert + export/import + `gaia:prompt-version` 控制升级覆盖）
7. 方舟托管引擎（Managed Agents 全托管 + 事件翻译 + 断线重连去重补投 + 资源自动开通）
8. 双提示词角色（默认助手/工作流架构师）+ ContextProvider 可插拔上下文
9. 编辑器画布联动（agent 改动实时上屏 EditorCanvasBridge）

**dsh 独有：**
1. PTC「Program-The-Tools」：模型写 TS/Python 程序，把全部工具当 SDK 编程调用（嵌套子调用走完整护栏并落 `tool/ptc-dispatch` 事件）
2. 子代理多后端：in-process/ACP/SDK/**直接把 Codex、Claude Code CLI 当子代理跑**
3. Claude Code/Codex hooks.json 兼容层（可阻断/附加上下文/强制再来一轮）
4. Chrome DevTools 级运行时调试器（真断点调试运行中的 Host）
5. Session Inspector 十字线反查（点 Chat 元素反查日志记录）+ Trajectory 计时总览
6. token-meter 重放式确定性 token 计量 + contextBreakdown 分解
7. 事件格式治理工程（4 代格式迁移链 + SHA-256 指纹目录 + 世代校验器）
8. Agent Teams / goal 空闲续轮 / webhook→会话 / ralph 循环
9. LLM 三层测试武器（mock-server 故障注入/replay/testkit）
10. 语音输入（experimental）、Python SDK、ACW/ACP 生态、SSH 远程执行域

**OWB 独有：**
1. Chrome 任务级标签授权（绑定根标签+子标签白名单，debugger API 快照/点击，不导出 Cookie）+ Rust Native Host 桥
2. 审计哈希链（SHA-256 prev_hash/entry_hash 防篡改）+ 诊断包脱敏导出
3. 审批参数可编辑后放行（编辑提升风险等级会被拒绝）
4. 内容寻址产物库（sha256 分片）+ 产物撤销
5. checkpoint 压缩带签名与 sourceRefs、重启可恢复；崩溃恢复不重放非幂等动作
6. 本地能力包（Skills+MCP+Rules+Templates 打包，安装前递归安全扫描拒绝注入）
7. Memory 准入生命周期（proposed→confirmed + scope/confidence/来源引用）
8. 预算双轴限额（回合+时长，单轮/全局）+ 收敛/收尾 steering 自动化
9. 无账号/无遥测/无云同步的纯本地 BYOK 哲学 + 密钥 safeStorage 加密
10. 「安静对话 UI」产品判断（执行过程折叠卡替代工具瀑布、不展示思维链、无庆祝动画）

---

## 13. 结论：差距画像与可借鉴项

### 13.1 三者的本质差异
- **Gaia 是「领域 Agent 平台」**：赢在工作流领域闭环（画布→对话→落版→版本→发布 API）和人工审查运营闭环；输在 harness 工程的形式化程度（事件模型、token 计量、测试武器）。
- **dsh 是「Harness 工程的百科全书」**：事件日志形式化（60+ 类型+指纹+迁移链）、韧性三件套、三层调试栈、三层 mock 武器、40+ verify 门禁——每一项都是可学习的工程范式；它没有工作流画布/发布/审查这类“业务闭环”。
- **OWB 是「可信执行的标杆」**：风险四级+参数可编辑审批+审计哈希链+内容寻址产物+不重放恢复——安全与可信维度做得比另两家细；但对话/调试/可观测的丰富度最低（刻意做减法）。

### 13.2 Gaia 值得抄的清单（按性价比排序）
1. **token-meter 式重放计量**（dsh）：现在 Gaia 只有 llm_end 事件级 token，缺 contextBreakdown（system/tools/messages 分解）与“压缩后仍稳定”的会话统计——对诊断 Qwen 上下文爆炸类问题直接有用。
2. **事件信封加 `surfaceOp`/`sourceEventSeqs`**（dsh）：Gaia 压缩/merge 目前是改写式的，加溯源字段后事件日志才真正“重放保真”，DebugPanel 回放会更可信。
3. **llm-mock-server + llm-replay**（dsh）：把“用真弱模型验收病理”升级为“协议级故障注入的 keyless 回归”——现有 20 用例 E2E 的稳定性会大幅提升。
4. **审计哈希链**（OWB）：SessionReview 已经是审查闭环，若审计/审查记录加 hash chain，企业合规场景直接可用。
5. **审批参数可编辑**（OWB）：确认卡目前只能允许/拒绝；加“编辑 JSON 参数后放行”可减少一轮对话往返（例如改 workflowCode 拼写错误）。
6. **Trace Span 层级树**（OWB）：现在 debug_data 是按轮分组的扁平列表；引入 run_turn→model_turn→tool_call 层级 Span 后，诊断面板可做耗时瀑布。
7. **工具结果 spill 落盘 locator**（dsh）：替代“800 字符截断”，原文完整保留、上下文只放有界预览。
8. **工具超时协作信号**（dsh timeout-policy）：Gaia 只有业务级 timeoutMs，缺工具级 timeoutMs+signal。

### 13.3 不建议抄的
- dsh 的 Cordis 插件化内核与 5 交付面（架构成本极高，Gaia 的 Java/Spring 生态不匹配）
- OWB 的“不展示思维链”（与 Gaia 的调试/审查定位冲突）
- dsh 的 Agent Teams/goal/ralph 等 experimental 面（与工作流领域无关）
