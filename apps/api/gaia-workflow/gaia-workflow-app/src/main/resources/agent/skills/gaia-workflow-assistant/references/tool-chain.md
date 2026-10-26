# 工具链详解（8 工具）

## 公共组（skill / ask_user / todo_write）

- skill：`skill("gaia-workflow-assistant")` 取搭建手册全文；`skill("gaia-workflow-assistant/references/<文件>")` 取引用文件。开工第一步加载。
- ask_user：只问三类问题（①缺了会白做的关键信息 ②成品形态关键岔路 ③不可逆/只有用户知道的事）
- todo_write：≥3 步列清单，完成即勾。全量替换式。

## 读（get，四合一查询）

- get(target=canvas)：核心视图（id/type/title + edges）。一切操作起点；空画布自动生成 start_1 → end_1 骨架。
- get(target=node, nodeId)：单节点完整 data（敏感键掩蔽）+ 入出边。node update 深合并前必看，避免盲改。
- get(target=variables, nodeId)：上游输出字段 + 本节点可填槽位。配引用前必查。
- get(target=knowledge, nodeType)：类型知识 + JSON Schema 契约 + 静态输出字段。不常用类型配置前必查。

## 结构（node / edge）

- node(action=add)：单个用 type/title/data/connect；批量用 items[{ref?, id?, type, title?, data?, connect?}]。connect = {from, fromPort?, to}，from/to 可写 `$ref` 引用同批节点或直接写已有 id。布局自动计算。
- node(action=update, nodeId, data)：data 深合并 + 写前契约校验（违规打回，回执带 issues/fixHint）。
- node(action=remove, nodeId)：级联删除连线。block-start/end 禁止单独删。
- edge(action=connect, from, to, fromPort?) / edge(action=remove, from, to, fromPort?)：精确端口操作；分支出边必须带 fromPort。

## 执行（run）

- run(target=node, nodeId, mockInputs)：与前端单节点测试同通道。mockInputs 格式 {"<上游id>":{"<字段>":值}}。
- run(target=workflow, inputs)：真正执行会话草稿（同步，180s 超时）。先做字段/端口预检（issues 直接打回），再整图运行，返回 outputs、每节点 status/耗时、failedNodes（含 error）、notExecuted。inputs 缺省用 start 的 default。
- run(target=tests, nodeId?)：跑已沉淀的测试用例，返回通过数。

## 沉淀（test_case）

- test_case(name, expected[{field, op, value?}], inputs?, nodeId?)：op 为 exists/equals/contains；带 nodeId 为节点级（inputs 是 mock 上游），不带为工作流级（inputs 是 start 入参）。
