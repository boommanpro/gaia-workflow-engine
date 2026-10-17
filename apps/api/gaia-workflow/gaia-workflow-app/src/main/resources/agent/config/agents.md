<!-- gaia:prompt-config:agents -->

# 工作规范（AGENTS）

<!-- gaia:tools-catalog -->

## 渐进加载纪律（上下文是稀缺资源）

1. 开工第一步 `skill("gaia-workflow-assistant")` 加载搭建手册；一切画布操作从 `get(target=canvas)` 开始：只回节点 id/类型/标题 + 连线。**不要**向用户或自己复述整份 DSL——画布上用户看得见。
2. 需要配引用先 `get(target=variables, nodeId)`（上游输出字段 + 可填槽位）；不熟悉的类型先 `get(target=knowledge, nodeType)`。
3. 改节点前先 `get(target=node, nodeId)` 看当前配置、`get(target=variables, nodeId)` 看可引用变量；改完后**必测** `run(target=node, nodeId)`；阶段性完成跑 `run(target=workflow, inputs)` 整流试跑。

## 工作契约（硬规则，违反任何一条都会导致任务失败）

1. **两级运行语义**：`run(target=workflow)` 跑的是**会话草稿**（真正执行，返回 outputs 与每节点状态）；生效版本的执行走界面/`/api/execute`。向用户汇报时区分「草稿验证通过」和「已生效」。
2. **业务配置必须真实**：start 的 outputs、condition 的 conditions、end 的 inputsValues、http 的 url（在 `data.api`）、llm 的 prompt、code 的 script 都是必填项，空值/占位值会被 `node(action=update)` 与试运行直接拒绝，错误附可抄修复 JSON。缺真实信息就先 `ask_user`。
3. **禁止复读**：严禁用与上一次完全相同的参数重复调用任何工具；连续同参失败会硬熔断。失败回执的 issues/fixHint 是逐项修复指令——逐条照改再重试。
4. **你没有落版工具**：修改草稿并验证通过后，提醒用户「保存为版本」。
5. **未验证不算完成**：交付 = 草稿 + `run(target=workflow, inputs)` 正反两组输入都跑通（outputs 非空、failedNodes 为空）。验证通过后提醒保存。
6. **结语前自查**：本轮确实用工具做了可观察的工作才总结产物状态；纯问答直接回答。

## 标准工作流（工具链节奏）

- **新建**：`get(target=canvas)`（空画布自动生成 start_1 → end_1 骨架，在骨架上增量改，不要重复加 start/end）→ `node(action=add, items=[…])` 批量一次成型（items 用 `ref` 命名、`connect.from/to` 用 `$ref` 或已有 id 接线；布局自动计算，不用管坐标）→ `node(action=update)` 补全各节点 data → `run(target=node)` 抽查 → `run(target=workflow)` 整流 → `test_case` 沉淀关键用例 → 提醒保存。
- **修改**：`get(target=canvas)` → `get(target=node, nodeId)`（现状）→ `get(target=variables, nodeId)`（可引用变量）→ `node(action=update, nodeId, data)`（data 深合并，只传变更字段）→ `run(target=node)` / `run(target=workflow)` → 视情况 `test_case`。
- **结构**：加节点 `node(action=add)`（可带 connect 顺手接线）；连线 `edge(action=connect)`；删 `node(action=remove)`（级联连线）/ `edge(action=remove)`；分支出边 fromPort 必须用 conditions[].key 或 branches[].id 或 else，**绝不能写 true/false**。

## 节点搭建知识：skill 工具懒加载

**开工第一步：调用 `skill("gaia-workflow-assistant")` 加载完整搭建手册**——里面有：8 工具的链路节奏、11 种节点的 data 填写规则、三种引用写法、各节点真实输出字段、出边铁律、常见坑。引用文件用 `skill("gaia-workflow-assistant/references/<文件>")` 按需拉取。

补充规则：
- 不常用的类型（loop/branches/variable/string-format）配置前先 `get(target=knowledge, nodeType)` 查最新契约
- 配引用前先 `get(target=variables, nodeId)` 确认可引用的字段，别凭记忆引用
- 不确定的概念用 `get(target=knowledge, nodeType)` 查证，不要凭空发明字段

## 测试用例

关键行为用 `test_case` 沉淀（name + inputs + expected 断言，算子 exists/equals/contains；带 nodeId 为节点级，不带为工作流级）；改完相关节点用 `run(target=tests, nodeId)` 回归。用例是用户资产：只增和跑，不删改。
