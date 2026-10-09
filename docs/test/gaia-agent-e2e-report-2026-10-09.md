# Gaia Agent E2E 测试报告 第二轮（20 用例 · local 引擎 · 2026-10-09）

- 被测：gaia console + gaia-workflow-app，local 自研引擎，LLM = 局域网 Qwen3.6-35B
- 环境：**隔离测试环境**（后端 48081 + 独立 SQLite 副本 + 前端 3002 经 `GAIA_API_TARGET` 代理）
  —— 因为发现另一个并行会话在测试同一后端（污染数据、后端被对方重启），按端口+DB 隔离后全部用例在隔离环境完成
- 计划：`docs/test/gaia-agent-e2e-plan-2026-10-09.md`（含六个关注点 → 用例映射）
- 测试方式：浏览器 GUI 黑盒（IAB 真实注入衰减后改用 evaluate 驱动交互），发现 bug → 修复 → 重编译重启 → 重跑

## 一、结果总览（20/20 通过，其中 3 项部分通过）

| # | 用例 | 结果 | 关键证据 |
| --- | --- | --- | --- |
| TC01 | 问候+能力引导+选项点击 | ✅ | 纯文本+4 选项块、零工具调用；点击原样发送、选项变已作废；query 返回 12 行与 DB 一致 |
| TC02 | 最小 LLM 工作流 | ✅ | 首次 applyWorkflow 即出卡→落版 v1.0；模型按占位警告自主 canvas 修正+saveWorkflow 闭环 v1.1；调用日志 6 轮完整 |
| TC03 | HTTP 工作流（澄清→闭环→试运行） | ✅(偏差) | 模型先走 canvas 拼装弯路（9 步）但自主纠偏回 applyWorkflow；第二轮修正 URL 后 runWorkflow 真实拿到 httpbin 200 |
| TC04 | 多节点分支工作流 | ✅(偏差) | 8 节点 8 边一次落版 Validation passed；但模型 canvas 修复后未重新落版（占位未闭环）→ 催化出「未闭环提醒」机制；两次凭记忆重构 DSL 丢光 edges → 催化出「零边校验」 |
| TC05 | code 节点工作流 | ✅(偏差) | 落版+自主试运行 success；线上 code 脚本占位未闭环（同上，saveWorkflow warnings 透传修复的动机） |
| TC06 | 变量节点组合 | ✅ | 4 节点 3 边落版；**「占位未闭环」系统提醒自动出现在 run 收尾**；「重新落版」指令 → saveWorkflow 确认卡（新门禁生效）→ v1.2 |
| TC07 | 模板路径负例 | ✅ | 修复会话状态泄漏后消息正常发送；如实告知仅 1 个模板且征求意见，未误创建 |
| TC08 | runNode 单节点测试 | ✅ | 「节点试运行 成功 · llm_summarize」卡；模型发现单节点变量引用未解析后自主转整体运行验证 |
| TC09 | 工作流整体试运行 | ✅ | TC03 内实证：runWorkflow 真实执行，httpbin 200、全节点 succeeded、试运行卡+Artifact records |
| TC10 | 计划模式 | ✅ | TC05 二轮实证：模型主动 createPlan（4 步卡）→ 逐步执行（canvas 修正+试运行 success）→ 修正完成 |
| TC11 | navigate 页面导航 | ✅ | 「带我去看看更新记录页面」→ /releases |
| TC12 | D2 发起会话迭代 | ✅(修复后) | 种子草稿=基于 wf v1.1 迭代；**修复「会话 key 被当 workflowCode」**（绑定上下文注入）+「发起会话直跳后消息发回旧会话」（路由权威对齐）；saveWorkflow 门禁确认后落版 v1.2 |
| TC13 | 同会话多轮迭代 | ✅ | 第二轮落版 v1.3，会话版本轴 v2/2，确认卡实时弹出 |
| TC14 | 迭代保真（核心） | ✅ | v1.2→v1.3 逐节点 diff：仅 end_0 title 'End'→'DONE'，其余 3 节点逐字段一致、meta 无变化 |
| TC15 | 落版后再发起 | ✅ | 新种子会话 summary=基于 **v1.3** 迭代，种子内容含最新修改（end title=DONE） |
| TC16 | 确认门禁拒绝路径 | ✅ | TC04 内两次拒绝实证：Discard 后模型不原样重试，转 ::options 征求方向 |
| TC17 | 删除工作流确认门禁（新） | ✅ | 无 confirmed 调用被拒 → 模型复述目标征求确认 → 用户确认 → confirmed:"true" → 删除成功（DB is_deleted=1） |
| TC18 | 切换会话+刷新回归 | ✅ | 切走无跨会话残留、切回消息/选项完整回放、无幽灵 Running（会话状态泄漏修复后回归） |
| TC19 | 专家模式全链路 | ✅(修复后) | Copilot 对话+确认卡+落版 v1.11+**画布联动**（Start 标题「开始」上画布）；修复「Copilot 会话无种子」（空画布盲重写）与「无订阅者静默连落 9 版」 |
| TC20 | 会话审查增强（新） | ✅ | 消息回放+**思考过程折叠**（真实 Qwen reasoning 内容）+**调试面板 10 条调用日志**（model/durationMs/toolCalls）+审查标记保存+导出 JSON 含 messages[].thinking 与 debugData |

## 二、六个关注点结论

1. **工具一次成功**：A 组生成类用例的首次 applyWorkflow 全部一次出卡（TC02/04/05/06）。失败案例均为弱模型行为且有三层兜底（预校验回模型/占位派生/熔断），无死循环。
2. **提示词迭代**：闭环落版指引重写——「canvas 修正后优先 saveWorkflow（直接保存画布），不要凭记忆重构 DSL 调 applyWorkflow」（classpath + DB 同步）。
3. **DSL 闭环技术方案**：没有走向「增量 patch」架构，而是分层兜底（对弱模型更鲁棒）：① 零边 DSL 在弹卡前被 preValidate 拒绝并给出补救指引；② saveWorkflow 与 applyWorkflow 同门禁同 warnings；③ run 收尾系统级检测「落版带占位+画布已修但未重落」自动追加提醒；④ 会话绑定上下文注入让模型拿到真实 workflowCode。
4. **历史工作流续会话**：种子草稿保真（TC14 diff 零意外变更）+ 最新落版再发起（TC15）+ 绑定信息注入（模型不再拿会话 key 当 code）。
5. **专家模式**：Copilot 新会话自动 seed 当前工作流落版（空画布盲重写根因消除）；AI 改动实时联动画布；新会话完整落库（审查页可查消息+日志）。
6. **会话审查**：新增 thinking 持久化全链路（agent_message.thinking 列 + local/ark 双引擎落库 + 回放折叠渲染）与调用日志（ToolLogRecorder → debug_data，与调试面板结构兼容）；导出 JSON 同时含两者。

## 三、本轮发现并修复的缺陷（12 项，均已重跑验证）

| # | 缺陷 | 层 | 修复 |
| --- | --- | --- | --- |
| F-1 | 思考过程从未持久化（表无列、convertMessages 声明 thinkings 却从不填充、审查页无渲染） | 前后端 | agent_message.thinking 列+迁移；TokenListener.onThinking + OpenAI 兼容协议 reasoning_content 解析；local/ark 双引擎落库；convertMessages 填充；审查页 MessageItem 折叠渲染 |
| F-2 | 工具调用日志无生产者（debug_data 只读遗留，审查页调试面板必空） | 后端 | 新增 ToolLogRecorder：包装事件输出端旁路记录 llm_end/tool_call/tool_result，run 结束按 LLM 轮次分组并入 debug_data（上限 50 条，与前端 DebugEntry 结构兼容） |
| F-3 | saveWorkflow 落版无门禁——模型在用户确认 applyWorkflow 后又用它静默落新版，绕过人机交接点 | 后端 | saveWorkflow 走 apply_confirm_mode（默认 require）确认门禁；warnings/repairs 随回执透传（原先被丢弃，模型根本看不到占位警告） |
| F-4 | deleteWorkflow 零门禁（上轮遗留 D-4） | 后端 | 必须带 confirmed=true；缺省拒绝并指引模型先向用户确认（TC17 实证完整问答链） |
| F-5 | 凭记忆重构 DSL 落版丢光 edges（8 节点 0 边两次直达确认卡） | 后端 | preValidate 增加结构校验：多节点 0 边直接拒绝并提示「先补全 edges/用 saveWorkflow 保存画布」 |
| F-6 | 占位修正不回写落版时用户被蒙在鼓里（模型宣称「已创建成功」而线上是占位） | 后端 | AgentRuntime run 收尾检测「落版带占位警告 + 之后 canvas 有修改 + 未再落版」→ 自动追加系统提醒消息（TC06 实证出现，且「重新落版」指令可闭环） |
| F-7 | 工具 schema 升级不生效（seedMissingTools 只补缺失不更新既有，manage.confirmed 在老库永远看不到） | 后端 | 种子时按 description/parameters 差异自动同步覆盖 DB |
| F-8 | **会话状态机跨会话泄漏**：旧会话确认挂起/运行中时切会话，新会话首条消息被吞进队列永不发送、确认卡弹在别的会话页面 | 前端 | 切会话时复位 messageQueue/processingRef/streaming/pendingConfirm（回放快照兜底恢复） |
| F-9 | turn-limit 截断后挂起的确认等待悬到 300s，窗口挂着永远不会处理的卡 | 后端 | run 收尾（finally）cancelPendingConfirms(sessionKey) 全部按拒绝收口 |
| F-10 | **发起会话直跳后消息发回旧会话**：URL→状态对齐要求会话已在列表，新建会话不在列表 → 状态停留旧会话 | 前端 | 路由权威：/chat/:key 无条件跟随 URL 切换会话 |
| F-11 | **会话 key 被当 workflowCode**：发起会话的迭代请求中模型拿会话 key 查详情（还用会话 key 创建了垃圾工作流） | 后端 | 系统提示词注入「当前会话绑定的工作流」节（从产物 summary 解析 code，说明落版/查询的正确姿势） |
| F-12 | 专家模式 Copilot：①新会话无种子，模型面对空画布凭记忆盲重写（65s 连落 9 版）；②订阅缺失时 require 门禁按「无窗口」静默放行全部落版 | 前后端 | ①Copilot 会话物化后自动 seedDraft（仅无消息的新会话）；②无窗口放行落版限 2 次/ run，超过转挂起等待（窗口回来可确认），且每次无窗口放行都向对话流写提示 |

附带：maxTurns 10→18（实测占位修正+重落版+试运行的常规链路 10 轮必触顶截断）；rsbuild 代理支持 `GAIA_API_TARGET` 环境变量（并行开发/测试隔离）。

## 四、遗留问题（未修，附建议）

| 编号 | 问题 | 建议 |
| --- | --- | --- |
| F-2(旧) | 产物画布 fitView 只缩放不平移（节点可见但缩在角落，zoom 0.39/translate 0；onAllLayersRendered 的 fitView 与 document.fitView 均只生效一半），疑似 scroll 负值被裁剪 | 深挖 flowgram PlaygroundConfigEntity scroll 语义，或改为渲染前把节点坐标归一化到原点附近 |
| F-3(旧) | 落版后产物面板显示「Unsaved changes」 | 落版确认后 markSaved 对齐新落版快照 |
| F-5(旧) | 版本标签语义混乱（v0/v1/v1.10 同屏；v1.9→v1.10 与 v1.1 视觉混淆） | 会话轴/落版轴统一命名 + 版本号用 (1,10) 数值序展示 |
| F-7(旧) | 计划卡步骤状态「等待」不随执行更新 | 计划卡状态映射真实 executeStep 进度 |
| 新-G1 | Copilot 会话物化后「No conversation」文案误导（会话实际已创建并运行） | 悬浮窗头部会话选择器改为显示当前 draft/真实会话 |
| 新-G2 | 专家模式 Copilot 的 SSE 订阅缺失根因未定位（本次以后端限额+提示兜底） | 排查编辑器路由下订阅 effect 与 draft 物化的时序 |
| 新-G3 | 空选项条渲染（::options 偶发渲染出一个空行） | Markdown options 解析过滤空项 |
| 新-G4 | 并行会话共库互扰（本次被迫搭建隔离环境） | 文档化 GAIA_API_TARGET 隔离方案；或会话列表增加「来源标记」 |

## 五、测试基建备忘

- **并行会话互扰**：本次发现另一 ZCode 会话在同一后端跑测试（probe 会话、后端被重启）。隔离方案：`GAIA_API_TARGET=http://127.0.0.1:48081 npm run dev -- --port 3002` + 后端 `--server.port=48081 --spring.datasource.url=jdbc:sqlite:<独立DB绝对路径>`。
- **IAB 注入衰减**：真实现象复现——fill/click/press 静默失效（零事件），且 `browser getState` 超时。可靠替代：`playwright.evaluate` 驱动（原生 setter+input 事件填文本；`el.click()` 合成点击；KeyboardEvent Enter 发送）。visibility.set(true) + 重建标签页只部分恢复。
- **spring-boot:run 陈旧 jar**：`-pl gaia-workflow-app` 不带 infra 重装时运行期 `NoSuchMethodError`（AgentMessage.setThinking）——改 infra 后必须 `mvn install` 全模块再 run。
- 会话发送的三条路（Landing Enter / Chat Enter / Copilot Send 按钮 title='Send'、aria-label 大小写不一）已全部验证可用。
- Qwen 开思考（清空 chatTemplateKwargs）可产生真实 reasoning_content，用于验收 thinking 链路；测完恢复 `{"enable_thinking": false}`。

## 六、修改文件清单

后端：`AgentMessage`(thinking 列)、`schema.sql`+`SchemaMigrationInitializer`、`ConversationStore`/`DatabaseConversationStore`(thinking 重载)、`TokenListener`/`LlmChatResponse`(thinking/model)、`OpenAiCompatibleLlmProvider`(reasoning_content)、`AgentRuntime`(thinking 事件+落库、llm_end 事件、占位未闭环提醒、绑定工作流上下文注入、artifactStore 注入)、`ArkManagedExecutionEngine`/`ArkEventTranslator`(thinking+toolCallsJson 落库)、`ToolLogRecorder`(新)、`AgentSessionRunService`(录制器接线、run 收尾取消挂起确认、toolPolicyService 注入)、`ToolPolicyService`(saveWorkflow 门禁模式、无窗口放行限额、cancelPendingConfirms)、`ManageToolExecutor`(deleteWorkflow confirmed 门禁、saveWorkflow 确认门禁+warnings 透传)、`ToolResult`(rejected(payload,message))、`ApplyWorkflowToolExecutor`(零边校验)、`AgentToolRegistry`(manage schema + 差异同步)、`AgentAssembly`(maxTurns 18)、`AgentDataSeeder`(无改)、`prompt-zh.md`(saveWorkflow 闭环指引 + deleteWorkflow confirmed)。

前端：`types.ts`(AgentMessage.thinking)、`AgentContext.tsx`(convertMessages 填充 thinking、切会话复位状态机、refreshDebugData 抽取+done 后刷新、防跨会话 debug 回写)、`MessageList.tsx`(思考折叠渲染)、`ReadonlyCanvas.tsx`(CanvasFit 尝试，未彻底解决 F-2 旧)、`AiWorkspace.tsx`(路由权威会话对齐)、`CopilotSidebar.tsx`(新会话 seedDraft)、`rsbuild.config.ts`(GAIA_API_TARGET)。

数据：隔离库 llm_config 维持 Qwen 正式配置（测试中临时开思考后已恢复 enable_thinking=false）；DB system_prompt.default 与 classpath 同步刷新；manage 工具 schema 已由差异同步机制自动更新。
