# Gaia Agent E2E 测试计划(20 用例,自研 local 引擎)

- 环境:前端 http://localhost:3001 / 后端 48080 / LLM=局域网 Qwen(192.168.1.11:8082/v1)/ 引擎=local / applyWorkflow 门禁=require
- 方式:browser-use 黑盒 GUI 测试,模拟真实用户对话;每例结束后清除会话历史保证干净
- 验证:前端 UI 断言 + 后端 DB(gaia_workflow / agent_session / agent_artifact)双重核对
- 发现 bug → 修复 → 重启相关服务 → 重跑该用例

## 工具覆盖矩阵

| 工具 | 策略 | 覆盖用例 |
|---|---|---|
| manage | always | 1,2,3,4,5,6,7,8,14,16 |
| canvas | always | 1-8,15,18 |
| applyWorkflow | confirm | 1,2,3,4,5,6,7,8,10,11,15,17 |
| query | always | 12,13 |
| navigate | always | 19 |
| createPlan | always | 15 |
| executeStep | always | 15 |

## 用例清单

### A. 基础创建类

**Case 1 — 单 LLM 摘要工作流**
- 输入:「帮我创建一个文本摘要工作流,接收一段文本,输出摘要」
- 预计交互:manage(createWorkflow)→ canvas(添加 start/llm/end + 连线)→ applyWorkflow 弹「应用确认卡」→ 用户点确认 → 落版
- 预期结果:工作流库新增「文本摘要」,v1,画布 3 节点 2 连线,llm 节点引用 start 的输入

**Case 2 — 中英翻译工作流**
- 输入:「创建一个中英互译工作流」
- 预计交互:同 Case 1;确认卡确认
- 预期结果:落版 v1;llm prompt 含翻译语义;结构合法

**Case 3 — LLM+Code 链**
- 输入:「创建一个工作流:输入一段文本,先用 LLM 起一个标题,再用代码节点把标题转成大写输出」
- 预计交互:create → canvas(4 节点)→ apply 确认
- 预期结果:start→llm→code→end;code 的 script 为合法 java/groovy,引用 llm 输出;落版

**Case 4 — 字符串格式化**
- 输入:「创建一个工作流:输入姓名,输出问候语 Hello, {name}! Welcome to Gaia.」
- 预计交互:create → canvas(string-format 节点)→ apply 确认
- 预期结果:string-format 节点模板正确引用 start 输出;落版

### B. 结构复杂类

**Case 5 — 条件分支**
- 输入:「创建一个工作流:输入一个分数,大于等于 60 输出"及格",否则输出"不及格"」
- 预计交互:create → canvas(condition/分支节点 + 两路)→ apply 确认
- 预期结果:分支条件表达式正确(≥60),两路各自到 end(或经 llm);落版

**Case 6 — 循环节点**
- 输入:「创建一个工作流:输入一个字符串数组,循环对每个元素调用 LLM 翻译成英文,输出结果数组」
- 预计交互:create → canvas(loop 节点,loopFor 引用 start 数组)→ apply 确认
- 预期结果:loop 配置合法;落版

**Case 7 — HTTP 节点**
- 输入:「创建一个工作流:调用 https://httpbin.org/get 接口,把返回的 url 字段输出」
- 预计交互:create → canvas(http 节点 GET)→ apply 确认
- 预期结果:http 节点 method=GET、url 正确;落版

**Case 8 — 双 LLM 串联**
- 输入:「创建一个写文章的工作流:第一个 LLM 生成大纲,第二个 LLM 根据大纲写全文」
- 预计交互:create → canvas(两 llm 串联)→ apply 确认
- 预期结果:第二个 llm 的 prompt 通过 ref 引用第一个的输出;落版

### C. 会话交互类

**Case 9 — 模糊指令澄清**
- 输入:「随便帮我建个工作流」
- 预计交互:期望 Agent 反问澄清(用在哪里/处理什么),**不**盲目创建;或给出建议等用户选择
- 预期结果:无 manage/canvas/apply 调用(或仅建议);会话无异常

**Case 10 — 多轮迭代**
- 前置:复用 Case 1 产物(文本摘要工作流),同一会话继续
- 输入:「把摘要工作流的 LLM temperature 改成 0.3,再加一个 code 节点统计摘要字数」
- 预计交互:canvas 更新节点 → 再次 apply 确认卡
- 预期结果:草稿版本变化,确认后落版新版本(旧版本保留可切换)

**Case 11 — 拒绝确认门禁**
- 输入:「创建一个关键词提取工作流」;在确认卡出现后点「拒绝」
- 预计交互:applyWorkflow → 确认卡 → 用户拒绝
- 预期结果:草稿保留但不落版,工作流库无该工作流落版记录;Agent 收到拒绝并回应

**Case 12 — 查询工作流列表**
- 输入:「现在系统里有哪些工作流?分别是什么用途?」
- 预计交互:query(list)
- 预期结果:回复与实际列表一致;无创建动作

**Case 13 — 查询工作流详情**
- 输入:「看一下文本摘要工作流的详情,它有几个节点?」
- 预计交互:query(detail)
- 预期结果:节点数、节点类型回复正确

**Case 14 — 删除工作流**
- 输入:「把中英互译工作流删除」
- 预计交互:manage(delete);观察是否有二次确认
- 预期结果:工作流从列表消失;若 UI/Agent 有确认交互则按设计走

### D. 高级类

**Case 15 — createPlan 复杂任务**
- 输入:「创建一个客服工单分析工作流:先对工单分类,再做情感分析,最后生成处理建议摘要」
- 预计交互:createPlan(计划卡)→ executeStep 逐步 → apply 确认
- 预期结果:计划卡展示多步骤;逐步执行;最终落版结构完整

**Case 16 — 保存模板**
- 输入:「把文本摘要工作流保存为模板」
- 预计交互:manage(createTemplate)
- 预期结果:模板列表出现该模板

**Case 17 — 基于已有工作流发起会话(D2 入口)**
- 操作:工作流库某行点「发起会话」→ 在新会话里说「把开始节点的输出参数加一个 language 字段,默认 zh」
- 预计交互:seedDraft 生效 → canvas 更新 → apply 确认
- 预期结果:会话草稿=当前落版;确认后产生新版本

**Case 18 — 运行工作流**
- 输入:「运行一下文本摘要工作流,输入:Gaia 是一个 AI 工作流编排平台」
- 预计交互:canvas(runWorkflow)
- 预期结果:执行成功,回复包含摘要结果;无 500

### E. 边界/健壮类

**Case 19 — 页面导航**
- 输入:「带我去工作流编辑器看看」
- 预计交互:navigate → ui_action → 页面跳转
- 预期结果:实际路由切换到编辑器;浏览器返回会话不丢

**Case 20 — 无关闲聊**
- 输入:「今天天气怎么样?」
- 预计交互:纯文字回复,无工具调用
- 预期结果:会话正常;不产生工作流草稿/产物变更;无报错卡死

## 执行顺序与数据依赖

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 →(新会话)9 →(新会话,接 Case1 工作流)10 →(新会话)11 → 12 → 13 → 14 →(新会话)15 → 16 →(UI 入口)17 →(新会话)18 →(新会话)19 →(新会话)20

每例结束:删除/清空本例会话(SQL 或 UI),保留工作流数据到 14/16 用完后再统一清理。
