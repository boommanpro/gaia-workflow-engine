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
- llm: `{"prompt":"{{start.text}}"}`；modelName/apiHost/apiKey 从 knowledge 的 platformDefaultModel 填进 inputsValues（必填，不自编）；输出模式 outputMode：text（默认）固定输出 result；**要下游引用具体字段必须用 json 模式**（`"outputMode":"json"` + `outputs.properties` 声明字段 + prompt 要求只输出 JSON），下游直接引用 `llm_x.<字段>`，不需要 code 解析。打标/分级类完整范式（照抄结构，换业务词）：
  ```json
  {"outputMode":"json",
   "prompt":"判定标准：出现抱怨、催促、威胁投诉 → negative；纯咨询陈述 → neutral；表扬感谢 → positive。分析下面的工单，只输出 JSON 对象，不要输出任何其他文字：\n{\"sentiment\":\"positive|neutral|negative\",\"category\":\"账务|物流|产品|其他\",\"priority\":1到5的整数}\n\n工单：{{start.text}}",
   "outputs":{"type":"object","properties":{"sentiment":{"type":"string"},"category":{"type":"string"},"priority":{"type":"number"}}}}
  ```
- condition: 出边 fromPort 必须用 key 或 else，绝不能 true/false；operator 用 neq/gte/lte（不是 ne/ge/le）；各分支连不同目标才有分流意义，同目标的多分支应合并成 else；**outputs 是每个 key 的命中布尔**——分支专属文案/数值在分支后接 string-format/code 生成，不要把布尔当业务结果引用
- loop: **循环体节点必须 `node(action=add, parentId="<loopId>", items=[…])` 放进容器**（自动补 block-start/block-end、首节点自动接线；容器内连线 edge(connect) 自动写入容器）；迭代变量 `{"type":"ref","content":["<loopId>_locals","item"]}`；每轮输出聚合用 data.loopOutputs（引擎逐轮收集成数组，保序）；绝不要在 loop 外 add 体节点再连线。完整范式（三步照抄，换业务词）：
  1. `node(action=add, items=[{"type":"loop","id":"loop_1","data":{"loopFor":{"type":"ref","content":["start_1","items"]},"loopOutputs":{"slogans":{"type":"ref","content":["llm_2","result"]}},"outputs":{"type":"object","properties":{"slogans":{"type":"array"}}}}}])`，再 `edge(action=connect, from="start_1", to="loop_1")`
  2. `node(action=add, items=[{"type":"llm","id":"llm_2","parentId":"loop_1","data":{"prompt":"为商品 {{loop_1_locals.item}} 写一句促销标语","outputMode":"text","modelName":"…","apiHost":"…","apiKey":"…"}}])` → 回执 autoConnected=block_start→llm_2
  3. `edge(action=connect, from="llm_2", to="loop_1_block_end")`（体内最后一跳连到 block-end），最后 `edge(action=connect, from="loop_1", to="end_1")`
- code: js 最后一个表达式必须是对象字面量 `({ result: … })`；language 只支持 javascript/java/groovy；object 输出写全 properties；数量先算成字段，别在模板里写 `.length`
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
- 引用不存在的节点/字段会被校验打回（DANGLING_REF / TEMPLATE_REF_UNKNOWN / DANGLING_REF_FIELD），按报错里的可用字段改；llm text 模式被引用的输出永远是 result，json 模式是 outputs.properties 声明的字段
- end 不配 inputsValues=无产出（会被拒绝）
- 落版由用户操作，你没有落版工具
