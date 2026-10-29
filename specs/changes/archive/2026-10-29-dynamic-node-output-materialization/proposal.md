# 提案：动态输出节点（condition/branches）outputs 物化与三端一致性

状态：已完成（2026-10-29）。批准依据：用户就「前端画布查不到 condition_1.if_pass、后端运行/校验却合法」的会话讨论中明确指令「就按这个方案做」「好的，开始动手干」。

## 问题

condition/branches 的输出是配置派生的动态输出（`conditions[].key` / `branches[].id` + else，布尔），运行时 `ConditionNode/BranchesNode.execute` 确实写入 memory，但输出声明从未物化进文档 `data.outputs`——同一条引用链上五个口径里画布变量引擎这一份消费者缺失：

- 后端运行时（getOutputParameters）：keys/ids + else ✅
- 后端校验推断（WorkflowDslValidator.inferOutputFields）：同规则 ✅
- AI 知识（node-knowledge 布尔输出语义）：一致 ✅
- 前端 run-node-panel（document/upstream-variables.ts，2026-10-17 修复）：同规则的独立拷贝 ⚠️
- **画布变量引擎（FlowGram scope）：无任何注册 ❌**——下游变量选择器查不到 `condition_x.<key>`/else，
  模板 `{{ condition_1.if_pass }}` 被 validateTemplateFlowValue 误报 Unknown Variable，而引用在后端完全合法。

全节点排查（18 类）：缺口恰好只有 condition 与 branches——仅有的两个配置派生输出节点；
其余节点全部走「catalog defaults 物化 outputs + form-meta effect 注册」（loop 的
createBatchOutputsFormPlugin 从 loopOutputs 派生 outputs 是既有先例）。

## 范围

- NC-06 增补：动态输出节点的 outputs 是派生字段，归一化/保存时由单一规则重算物化；
  运行时输出参数、校验推断、文档物化声明三者必须相等；空字段名不声明、不做出边端口、不进引用白名单。
- 后端：`NodeDataNormalizer` 新增 condition/branches 派生（整体重算 properties，仿 fillStaticOutputs）；
  schema 放行派生 outputs（additionalProperties 内严格 boolean 形状）；catalog defaults 补空 outputs；
  `inferOutputFields` 与 `ConditionNode/BranchesNode.getOutputParameters` 对空字段名跳过（与 legalPortsOf 同口径）。
- 前端：`nodes/derived-outputs.ts` 单一规则纯函数；condition/branches form-meta 用
  `createEffectFromVariableProvider`（与 variable 节点 infer-assign 同机制）把派生 schema 喂进变量引擎、
  formatOnSubmit 物化进 data.outputs；upstream-variables.ts 改用同一函数（消灭前端规则拷贝）。
- 跨端 parity：`specs/node-contracts/fixtures/dynamic-node-outputs.json` 共享契约样例，
  前后端测试引用同一份文件，规则单边改动两侧同时红灯。

## 非目标

- 不改 condition/branches 引用校验白名单的语义（keys + else 既有口径不变）。
- 不自动回写存量已发布版本（AGENTS.md 红线）；存量草稿在下次保存/归一化触达时补齐物化。
- 不处理 workflow 子流程节点 outputs 自动从子流程定义同步（两端已一致依赖声明，属知识侧完备性，另行提案）。
- 不动浏览器端到端验收（本环境无运行服务，未验证范围见 tasks.md）。

## 设计（简单变更，省略 design.md）

- 物化语义 = 整体重算：每次归一化从 conditions/branches 重新生成 `outputs.properties`
  （每个 key/分支 id → `{type:"boolean"}`，else 恒在最后），幂等；canvas 表单 effect 与后端
  normalizer 双入口收敛同一规范形，模型直写 DSL 缺/错 outputs 在保存边界被修正。
- 三端相等断言 = 归一化产物（本测试 normalizedOutputsMatchContractFixture）、
  运行时 getOutputParameters（runtimeOutputsMatchContractFixture）、
  校验推断 inferOutputFields（validatorInferenceMatchesContractFixture）+ 前端纯函数（derived-outputs.test.ts）。
- 兼容影响：schema 新增 outputs 字段（非 required）——存量无 outputs 草稿照常通过校验；
  空 key/分支 id 此前仅在校验白名单里出现（不可引用、不可连边），本次三端统一跳过，无行为回退。
- 回滚：移除 NodeDataNormalizer 两个 case、form-meta 两个 effect/formatOnSubmit、schema outputs 属性即可恢复旧行为。

## 影响的规则编号

NC-06（图、端口与绑定——作用域语义同一性）、NC-10（变更验收）、P-01（单一事实源）。
