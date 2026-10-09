# Gaia Agent E2E 测试报告（20 用例 · local 引擎 · 2026-10-08/09）

- 被测：gaia console（3001）+ gaia-workflow-app（48080），local 自研引擎，LLM = 局域网 Qwen3.6-35B（正式配置）
- 方式：浏览器 GUI 黑盒（真实点击/输入），发现缺陷 → 修复 → 重编译重启 → 重跑
- 计划文档：`docs/test/gaia-agent-e2e-plan-2026-10-08.md`；截图：`gui-test-screenshots/`
- 测试中清空过 4 次会话/产物数据以保证用例隔离（agent_session/message/artifact/permission）

## 一、结果总览

| # | 用例 | 结果 | 备注 |
| --- | --- | --- | --- |
| TC01 | 问候/能力引导 + 选项点击 + 工作流查询 | ✅ PASS | 选项块渲染为按钮、点击原样发送、点击后「已作废」；query 返回 8 工作流表格与库一致 |
| TC02 | 最小 LLM 工作流（确认→落版→产物面板） | ✅ PASS（修复后） | 首跑暴露 D-1/D-2，修复后重跑通过：落版 wf_397638ba0121 v1，画布/版本/跟进选项正常 |
| TC03 | HTTP 工作流（澄清→生成→确认） | ✅ PASS（修复后） | 澄清带预设选项；占位兜底后首试即出卡；模型还能 canvas 修正+试运行拿到 httpbin 真实 200 |
| TC04 | 多节点分支工作流（condition） | ✅ PASS | 8 节点 8 连线一次落版，含 LLM→code→条件分支→多 LLM→变量→end，校验通过 |
| TC05 | code 节点工作流 | ✅ PASS | 落版 v1.2；模型自主 createPlan+canvas 修复占位脚本（提示词闭环生效） |
| TC06 | 模板路径负例 | ✅ PASS | 如实告知无模板，给替代选项，未误创建 |
| TC07 | D2 发起会话迭代 | ✅ PASS | 库行「发起会话」→ 种子草稿（基于 wf_68fba5b6f8bb v1.0）→ 迭代落版 v1.1，会话轴 v2/2 |
| TC08 | 会话版本切换器 | ✅ PASS | v1/2 ↔ v2/2 双向切换，标签同步 |
| TC09 | 确认门禁拒绝路径 | ✅ PASS | 两次拒绝均拦截（forbidden: 用户未确认），无落库，模型转向导航+选项 |
| TC10 | 模糊需求澄清 | ✅ PASS | 「创建一个工作流」→ 询问类型 + 4 选项，零工具调用 |
| TC11 | 超纲请求（写诗） | ⚠️ PASS(偏差) | 模型把写诗过度转化为「建写诗工作流」——门禁兜底，放弃后正常收尾；记录为模型倾向非系统缺陷 |
| TC12 | 工作流列表查询 | ✅ PASS | TC01 内已验证（表格与 DB 一致） |
| TC13 | runNode 单节点测试 | ✅ PASS | 「节点试运行 成功 · llm_classify_1 查看输出」卡片，模型自分析占位输出 |
| TC14 | 工作流整体试运行 | ✅ PASS | TC03 内实证：canvas runWorkflow 真实执行，httpbin 返回 200 + args 回显 |
| TC15 | createPlan+executeStep 计划模式 | ⚠️ PASS(部分) | 计划卡/三选项/逐步执行/runNode 真实测试（LLM 200）全部工作；步骤间 $N 引用不稳定（F-8） |
| TC16 | navigate 页面导航 | ✅ PASS | 「带我去更新记录」→ /releases |
| TC17 | 会话标题自动生成 | ✅ PASS | 所有会话标题=首条消息/工作流名（含「迭代 xxx」） |
| TC18 | 运行中切换会话+刷新回归 | ✅ PASS | 切走无幽灵内容、切回/刷新回放完整；副作用见 F-9（已修） |
| TC19 | 删除工作流 | ✅ PASS | 查询→定位→删除（DB is_deleted=1）→告知；无确认门禁见 D-4 |
| TC20 | 停止运行 | ⚠️ PASS(部分) | 停止按钮存在（title=停止，流式期出现）；自动化未稳定捕获窗口；门禁等待期无停止入口（F-10） |

**14 全 PASS + 4 PASS(偏差/部分) + 2 复用证据，0 个系统性失败。** 全部核心链路（澄清→生成→门禁→落版→版本→运行→导航→删除）走通。

## 二、测试中发现并修复的缺陷（均已重跑验证）

### D-1 确认卡先于校验 + 用户被迫提供平台已有的凭证（后端·设计）
- 症状：用户确认卡片后才收到「llm 缺 prompt」校验错误；模型反复让用户在对话里贴 apiKey/apiHost，而平台全局 llm_config 里就有。
- 修复：① `ToolExecutor.preValidate()` 钩子——applyWorkflow 在弹卡前预校验，非法直接回模型，不消耗用户确认（AgentRuntime 与 Ark 引擎双端接入）；② 落版规范化时自动为缺凭证的 LLM 节点填平台默认模型（`WorkflowDslCanonicalizer.LlmDefaults`，WorkflowDslApplyService/ApplyWorkflowToolExecutor 注入 AgentModelConfigService）；③ 系统提示词明确「凭证不用问，系统自动填」。

### D-2 弱模型不写节点 data → 7~10 次重试死循环（后端·健壮性）
- 症状：Qwen3.6-35B 在工具调用里几乎从不写 `data`（15+ 次采样，仅 1 次成功；与温度/思考开关/schema 长度无关，已逐一 A/B 排除），校验拒绝后自强化循环直至 maxTurns。
- 修复（系统对弱模型健壮）：① 占位派生——llm 缺 prompt 按节点标题生成占位提示词、http 缺 url 填 example.com 占位、code 缺 script 填 return input，全部记入 repairs+warnings 明示用户（仅 agent 落版路径，编辑器手动发布保持严格校验）；② 连续失败熔断——同工具连续失败 4 次强制终止 run 并转为人话说明（AgentRuntime）。
- 效果：TC03/TC04/TC05 从「10 连败零产出」变为「首试出卡→确认→落版」；TC05 中模型还能按 warnings 自主闭环。

### D-3 占位修正不回写落版（后端提示词·语义裂缝）
- 症状：模型用 canvas 修正草稿后不再落版，线上 v1.0 永远是占位配置，却宣称「已验证运行」。
- 修复：提示词新增「占位警告必须闭环」——canvas 修正后必须以相同 workflowCode 再次 applyWorkflow 落版。TC05 中已观察到模型照做（重落版 v1.2）。

### F-4 产物面板跨会话残留（前端）
- 症状：切换会话后右栏画布仍显示上一会话的工作流，严重误导。
- 根因：`workflowDocumentStore` 模块级单例有 `clear()` 但全工程无调用点。
- 修复：AgentContext 会话切换 effect 中调用 `workflowDocumentStore.clear()`。回归验证：有产物会话→无产物会话，面板正确清空。

### F-9 运行失败不落消息（后端）
- 症状：run 失败（如模型吐 27K 畸形 JSON 导致 LLM 500）只发一次性 error 事件；用户切走/刷新后失败原因凭空消失，界面沉默。
- 修复：`AgentSessionRunService.runAsync` 错误路径持久化 assistant 消息「⚠️ 本次执行失败：…」。

### 附带修复
- 提示词全面刷新：DB 中 `system_prompt.default` 停留在旧版（canvas 逐节点时代），覆盖了 classpath 新版——已同步为最新 classpath 内容并补充平台默认模型说明；`NODE_DATA_SCHEMA_HINT` 从 60 行压缩为 3 行（实测巨型嵌套 schema description 会压垮模型，细节移入系统提示词正文）。
- `llm_config` 支持透传 `chatTemplateKwargs`（本部署已配 `{"enable_thinking":false}`，工具调用质量与速度显著提升）。

## 三、遗留问题清单（未修，附建议）

| 编号 | 问题 | 建议 |
| --- | --- | --- |
| F-2 | 落版后画布初始视图未 fit（节点挤在角落） | ReadonlyCanvas 挂载后调用 fitView/自动缩放 |
| F-3 | 刚落版成功面板即显示「有未保存的修改」 | 落版后应重置 dirty 基线（markSaved 对齐新落版快照） |
| F-5 | 版本标签语义混乱：产物 v0 / 草稿 v11 / 落版 v1.2 同屏 | 统一「会话版本(游标)/落版版本」两轴命名 |
| F-6 | navigate 收到幻觉参数（workflowCode="$0"）仍报 success 并打开空编辑器 | navigate 对 editor 目标做 workflowCode 存在性校验 |
| F-7 | 计划卡步骤未执行即显示「完成」 | 计划卡状态改为「等待/执行中/完成/出错」真实映射 |
| F-8 | 计划步骤间 nodeId 引用不稳定（#3 node not found: llm_2） | executeStep 的 $N 解析与画布实际节点对账；失败步骤自动重试一次 |
| F-10 | 门禁等待期无停止入口，用户只能逐张放弃卡片 | 确认挂起时输入区也显示「停止」（终止整个 run 并自动拒绝所有 pending） |
| D-4 | 删除工作流零门禁（manage=always，一句话即删） | deleteWorkflow 拆分独立 action 并默认 confirm 策略 |
| M-1 | 模型硬伤：Qwen3.6-35B(Aggressive GGUF) 工具调用几乎不写嵌套 data | 更换/升级对话模型；或继续用占位+warnings 体验（已可用） |

## 四、测试基建备忘（复测注意）

- ZCode 内置浏览器（IAB）长时间交互后输入注入/截图会静默失效（零事件、截图超时）：**每次用例前 `visibility.set(true)` + 重建标签页**可解；此前疑似「新建对话按钮失效」均为该问题，产品无此 bug。
- 前端 playwright locator 点击常因页面动画超时：统一用「evaluate 取几何 → cua 坐标点击」。
- Qwen 无思考模式后单轮 20~40s；确认卡 300s 超时自动拒绝是有效兜底（TC02 首轮实测）。

## 五、修改文件清单

后端：`ToolExecutor`（preValidate）、`ApplyWorkflowToolExecutor`、`AgentRuntime`（预校验+熔断）、`ArkManagedExecutionEngine`、`WorkflowDslCanonicalizer`（LlmDefaults+占位派生）、`WorkflowDslApplyService`、`AgentModelConfigService`（chatTemplateKwargs）、`OpenAiCompatibleLlmProvider`、`AgentSessionRunService`（错误持久化）、`AgentToolRegistry`（schema 瘦身）、`prompt-zh.md`。
前端：`AgentContext.tsx`（会话切换清空画布文档）。
数据：DB `system_prompt.default` 刷新、`llm_config` 增加 chatTemplateKwargs、canvas/applyWorkflow 工具定义重播种。
