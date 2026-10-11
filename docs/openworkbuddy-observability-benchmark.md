# OpenWorkBuddy（真版）观测体系对标 —— 日志与调试全链路

> 对标日期：2026-10-11。对象：**github.com/CatCatUncle/openworkbuddy**（285★，PolyForm NC，活跃开发中；本地克隆 `~/trae_project/openworkbuddy-catcatuncle`，shallow）。
>
> ⚠️ **仓库更正**：此前对标用的 `github.com/chenin0931/OpenWorkbuddy`（11★，2026-07 停更，MIT）是**另一个同名早期项目**，两者无 fork 关系（repo id 不同）。`docs/product-comparison-gaia-dsh-openworkbuddy.md` 的 OWB 列基于旧项目，已打更正横幅，待重写。
>
> License 注意：真版 OWB 是 **PolyForm NC（非商用）**——可以读码借鉴设计，**不可拷代码进 gaia**。

---

## 1. OWB 观测体系全景：四本账各司其职

| 账本 | 存什么 | 存哪 | 证据 |
|---|---|---|---|
| **① Trace 账本**（主记录） | 三层调用树：`trace`（一趟任务）→ `span`（工具/子任务/外部引擎）→ `generation`（每次模型调用：model/modelParameters/完整 prompt/输出/usage{prompt,completion,cached}） | `<workspace>/.openworkbuddy/traces.jsonl`，24MB 滚动留 6 本，提示词全文只记一次+编号引用（`$msgs`），读取按 mtime+size 缓存 | `src/core/obs/trace.js:50-60,127-142,156,210-301,539-574`；埋点 `src/agent/agent.js:3374-3401`（generation）、`agent.js:3646-3661`（span） |
| **② 会话 transcript** | 任务事件流全量（tool_use/tool_result 带时间戳+盘点落盘），**重放与直播共用同一条渲染路径** | `data/sessions/<id>.json`（`recordingEmit` 白名单写入） | `server.js:1126-1163`；`public/js/app-01.js:1181` |
| **③ Audit 账本** | 安全决策凭证：命令/网络/文件动作的放行/拦截/等待审批/批准/拒绝，审批卡含 diff/触发段/截止时间 | `data/audit.json` 环形 1000 条，500ms 原子写；**可导出 TSV** | `src/core/safety/security.js:22-26,248-264,1617-1658` |
| **④ Metrics + 告警** | 分钟快照：任务数/失败率/token/P50/P95 耗时/事件循环卡顿；阈值告警（失败率>30%、磁盘<8%…）推企微/钉钉 | `data/metrics/<年-月>.jsonl`（留 3 个月）+ Prometheus 抓取口 | `src/core/obs/metrics.js:55-83,213-248,287-352`；`server.js:2736-2782` |

另有：系统日志 `logs/app-YYYY-MM-DD.jsonl`（四级 level、留 14 天，`src/platform/log.js`）；Langfuse 为**可选外部副本**（默认关，手写 HTTP SDK 无依赖，`trace.js:13-15,309-456`）；eval 跑批评测框架（`eval/run.js` 真实模型 + 固定题面机器判分 + AI 评委 + baseline 对比）。

## 2. OWB 做得最突出的 6 个设计点（gaia 对标目标）

1. **LLM generation 级全量观测**：每次模型调用的完整输入输出进 trace，事后任何怪行为可复现。这是 gaia 目前最大的观测缺口——gaia 只有 `agent_message` 最终消息 + 工具指标表，模型调用零记录。
2. **失败可见性三件套**：error 红字留在正文不进折叠区 + 侧栏红点；Trace 页「只看出过错的」一键过滤；进程被杀超 30 分钟无收尾 → 判「**中断**」态而非假装还在跑（`trace.js:241-244`）。
3. **韧性动作大声播报**：重试带结构化参数 `{kind:"retry", attempt, total, delayMs}` → 前端**倒计时条**；failover 换道播报；trim/compact 提示行；auto_continue 轮次播报（`llm.js:849-854`、`app-01.js:1669-1675,1820-1858`）。
4. **收尾时间账小结卡**：任务结束在对话区直接给「共 Xs：工具占 Y（并发按重叠区间合并，不是各步相加）、最慢的是哪几步」+「打开执行追踪 →」入口（`app-01.js:1430-1477`）。
5. **「系统拦截」写进工具结果与 trace**：死循环/熔断拦截以【系统拦截】前缀落结果——gaia 的 `appendGuardNote` 已是同款设计 ✓。
6. **观测绝不伤害任务**：空壳 tracer 免判空、写盘全 try/catch、热路径只 append、30 分钟 STALE 推断——慢/挂/崩都不拖累主链路。gaia 的 ToolLogRecorder「录制异常一律吞掉」已有同款纪律 ✓。

## 3. gaia 现状逐项对照

| 能力 | OWB | gaia 现状 | 差距 |
|---|---|---|---|
| 模型调用观测 | generation 级：完整 prompt/输出/usage/model | **零记录**（ModelCallEnd 只取了 usage 发 SSE，不落库） | 🔴 最大缺口 |
| 调用树 UI | 嵌套时间线 + 每步可展开完整输入输出 + 耗时汇总 | 调试详情有 thinking+工具日志，无模型调用层 | 🔴 |
| 事件持久化 | 事件流全存可回放 | `agent_session_event` 只落 5 类，**llm_retry/wrap_up/repeat_reminder/interrupted/run_end 漏落** | 🔴 |
| 失败归因 | status=error + 逐步失败标记 + 错误过滤 | error 只有字符串；无归因卡无过滤 | 🔴 |
| 中断态判定 | 30 分钟无收尾判「中断」 | AgentStartupRecovery 纪元制 ✓（重启后），但运行列表无「卡死中」态 | 🟡 |
| 重试可视化 | 结构化 attempt/delay 倒计时条 | `llm_retry` 事件已有，前端无呈现 | 🟡 |
| 收尾时间账 | 工具耗时合并重叠 + 最慢步骤 | 无 | 🟡 |
| 压缩可观测 | trim/compact 提示行 | HISTORY_PRUNE 只打 log.info；框架 Compaction 无出口 | 🔴 |
| 审批留痕 | 审批全程审计+导出 TSV | 确认卡决策无留痕（工具指标表有 outcome） | 🟡 |
| 指标+告警 | 分钟快照+P95+告警推送 | 无 | 🟢 后置 |
| eval 跑批 | 真实模型+判分+baseline | 无（测试护城河 4 例） | 🟡 |
| Langfuse | 可选副本 | 无 | 🟢 后置 |

## 4. 对标清单（更新版，融合 2026-10-11 观测缺口诊断）

**P0 —— 失败根因探索闭环**（全部有现成范式，无新机制）
1. `agent_session_event` 补落 `llm_retry/wrap_up/repeat_reminder/interrupted/run_end`（recorder 补 case，几行事）
2. **`agent_llm_call_log` 表**：学 OWB generation 模型——turn 粒度记 model/消息数/prompt 摘要（头尾截断）/输出摘要/usage/耗时/error/重试次数；埋点挂 ModelCallStart/End（已在消费）或 AgentScope Hook；SQLite 即可，Langfuse 后置
3. **失败归因卡 + 「只看失败的」过滤**：run_end 带 outcome 枚举失败链；前端调试页置顶
4. 修 AGENT_RESULT 回显坑（不修则空响应类失败永远被伪装成成功）
5. 「卡死中」判定：运行列表对超时无 run_end 的 run 显示中断态

**P1 —— 压缩可见 + 过程体验**
6. 压缩/裁剪事件外显（前后条数/token）+ compacted 列闭环 + compactionConfig 对齐 Qwen 窗口
7. 收尾时间账小结卡（工具耗时重叠合并算法可直接借鉴思路）+「打开执行追踪」入口
8. llm_retry 倒计时条（事件已有，补 UI）

**P2 —— 护城河与工程化**
9. eval 跑批评测（OWB 方法论：固定题面+机器判分+AI 评委+baseline）——比单纯轨迹回放测试更实战
10. 指标快照 + 失败率告警
11. OTel/Langfuse 接入（框架有 OtelTracingMiddleware）
12. 休眠工具 disable（web_fetch/web_search 出网面 + schema 噪声，弱模型卫生）

---

## 5. 实施状态（2026-10-11 全量对标落地）

**P0 全部完成** ✅
- [x] #1 事件落库：核实 `ToolLogRecorder.persistEvent` 本就全量落库（仅 token/thinking 除外），此前诊断有误；真正缺的是查看 UI → 已补
- [x] #2 `agent_llm_call_log` 表 + `RecordingModel`（Model 装饰器，generation 级：消息数/工具数/prompt 头尾摘要/输出摘要/usage 含缓存 token/耗时/结局 ok-empty-error）— `AgentScopeExecutionEngine.persistLlmCall`
- [x] #3 run_end 结构化归因：`AgentRunResult.failureChain`（user_interrupt / repeat_guard_hard_stop[:tool] / exceeded_max_iters / empty_response / empty_response_unrecovered / wrap_up_advisory / engine_error）+ durationMs/toolTimeMs（区间重叠合并）/tokens/llmRetries；观测 API 新增 `GET .../runs`（run 列表派生）与 `GET .../llm-calls`
- [x] #4 AGENT_RESULT 回显坑修复：历史 assistant 文本集合做回显守卫，逐字相同即弃（空响应不再被伪装成成功）
- [x] #5 卡死中判定：live 状态行 >90s 无事件提示「疑似卡住」；执行追踪里无 run_end 的 run 标「疑似未收尾」

**P1 全部完成** ✅
- [x] #6 压缩三件套：buildMessages 剪枝发 `compaction(kind=prune)` 事件；SessionCompactionService 接入 run 启动前自动触发（`compaction(kind=summary)` 事件播报）；HarnessAgent `.compaction()` 按 Qwen 上下文窗 80% 显式设阈值
- [x] #7 时间账：`RunStats` 区间重叠合并工具耗时 + 最慢 3 工具；run_end 载荷 + live 时间线 `RunSummaryCard`（失败链徽标 + 「执行追踪 →」入口，window 事件联动）
- [x] #8 llm_retry 倒计时条（RetryNotice，delayMs 线性收缩）

**P2 部分完成**
- [x] #12 休眠工具剔除：`stripForeignTools`（web_fetch/web_search/memory_*/session_search/filesystem/wait_async_results 黑名单后处理——web 工具无 builder 开关，只能 post-build 移除）
- [ ] #9 eval 跑批评测（另立工程）
- [ ] #10 指标快照+告警
- [ ] #11 OTel/Langfuse

**前端**：调试面板双视图（调用日志 / 执行追踪）——`TraceView.tsx`（run 列表+失败过滤+事件回放+LLM 账本展开）；live 时间线富通知（倒计时条/时间账卡/归因徽标/压缩播报）。**测试**：`AgentScopeEngineObservabilityTest` 4 例（prune 事件/截断/摘要）；全量 132 例绿（含并行会话轨迹回放测试）；ts-check 零错误 + rsbuild 生产构建通过（顺手修了 HEAD 上 TemplateManagement 的既有 TS 错）。

**未尽事项**：ark 引擎未接 agent_llm_call_log（方舟侧走 usage 事件，可后续对称补）；ScriptedChatModel 轨迹 fixture 仅 1 个（并行会话已启动轨迹回放护城河重建，与我方 eval 方向互补）。
