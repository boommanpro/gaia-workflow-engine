---
name: gaia-workflow-assistant
description: 工作流搭建完整操作手册
when_to_use: 搭建或修改工作流前必读
kind: domain
---

# Gaia 工作流搭建完整知识

## 工具链节奏（8 工具）

- **公共**：ask_user（缺关键信息才问）、todo_write（≥3 步列清单）、skill（按需加载知识：`skill(name)` 取手册，`skill(name/path)` 取引用文件）
- **读**：get(target=canvas)（一切起点，空画布自动生成 start_1 / end_1 两个孤立骨架节点，不预连边）→ get(target=node, nodeId)（单节点配置 + 入出边）→ get(target=variables, nodeId)（可引用变量）→ get(target=knowledge, nodeType)（类型知识 + 契约）
- **结构**：node(action=add)（items 批量 + connect 接线 + 自动布局）→ node(action=update)（改 data，深合并）→ edge(action=connect / remove) / node(action=remove)
- **执行**：run(target=node, nodeId, mockInputs)（单节点试跑）→ run(target=workflow, inputs)（整流试跑：真正执行会话草稿，回 outputs + 每节点状态）
- **沉淀**：test_case（建用例）/ run(target=tests)（跑用例）

标准节奏：新建 = get canvas → node add(items) → node update → run node → run workflow → test_case；修改 = get canvas → get node → get variables → node update → run node → run workflow

## 快速参考

- http: `{"api":{"method":"GET","url":"…"}}`（不是 inputsValues.url）
- llm: `{"prompt":"{{ start.text }}"}`（凭证自动填）
- condition: 出边 fromPort 必须用 key 或 else，绝不能 true/false
- code: js 最后一个表达式必须是对象字面量 `({ result: … })`
- end: `{"inputsValues":{"result":{"type":"ref","content":["code_0","result"]}}}`

> 详细规则见 [references/node-data-rules.md](references/node-data-rules.md)
> 出边铁律见 [references/edge-rules.md](references/edge-rules.md)
> 工具链详解见 [references/tool-chain.md](references/tool-chain.md)
> 各节点契约见 references/node_&lt;type&gt;.md（或 get(target=knowledge, nodeType)）
> 完整示例见 [examples/contains-workflow.md](examples/contains-workflow.md)

## 常见坑

- run(target=workflow, inputs) 正反两组输入都要跑；outputs 为空 = end 没产出，看 notExecuted / failedNodes
- 空画布骨架自带孤立的 start_1 / end_1（不预连边、end 无占位输出），不要重复添加 start/end；用 node add 的 connect 显式接线：start → 处理节点 → end
- end_1 的 inputsValues 初始为空，必须用 ref 配好输出字段再试跑（骨架不预填占位常量）
- 引用不存在的字段→静默 null→假成功
- end 不配 inputsValues=无产出（会被拒绝）
- 落版由用户操作，你没有落版工具
