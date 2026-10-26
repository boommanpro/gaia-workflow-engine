# 提案：end 节点顶层唯一（与 start 对称）

状态：已完成（2026-10-26）。批准依据：用户当日明确指令「前端和后端都能出现多个 end，这个不符合预期」。

## 问题

- 后端权威校验 `WorkflowDslValidator` 只有 `NO_END`（零个）和 `MULTI_START`，`endCount > 1` 从不报错；
- 前端 headless 校验 `document/validate.ts` 同样只查 `MULTI_START`；
- AI 画布工具 `SessionWorkflowDraftService.addNode` 对 start/end 不做数量检查；
- 架构师提示词写「至少一个 end」，节点知识种子写「一个工作流可以有多个 End 节点（条件分支场景）」，
  与技能手册里「不要重复加 start/end」自相矛盾；
- 引擎侧多个 end 只是把各自 `inputsValues` 合并进 memory（同键后写覆盖），没有任何语义支撑。

## 范围

- NC-06 文字：`end` 与 `start` 同为顶层唯一；条件/分支各路径汇合到同一个 `end`。
- 后端：`MULTI_END` error（nodeId 点名全部 end，文案指引汇合）；`addNode` 当场拒绝第二个 start/end 并指引改接。
- 前端：`validate.ts` `MULTI_END` error；外部宿主 `wujie-communication.addWorkflowComponent` 加 start/end 唯一性守卫。
- 提示词 / 节点知识种子措辞同步（知识种子按 classpath 内容同步进库，重启生效）。

## 非目标

- 不新增 node-catalog 基数字段：start/end 基数是图语义（P-02「语义校验管图」），沿用 `MULTI_START` 既有实现位置；
  若将来更多类型需要基数约束，再提案迁入目录能力。
- 不处理 loop 容器内出现 `start`/`end` 的情形（校验只看顶层 `nodes`，与现状一致）。
- 不自动改写存量多 end 的草稿/版本：它们在下次保存、试跑、落版时被 `MULTI_END` 打回，由用户/AI 修正。

## 设计（简单变更，省略 design.md）

- 后端 `WorkflowDslValidator` S2：`else if (endCount > 1) → MULTI_END`，与 `MULTI_START` 对称。
- `SessionWorkflowDraftService.addNode`：type 为 start/end 且顶层已存在同类型 → `err(...)`，批量 `node(action=add, items)`
  路径把该错误作为 `items[i] 添加失败` 警告回执给模型。
- 兼容影响：存量多 end 工作流无法再通过校验（预期行为）；画布渲染不删节点，只在保存/运行时报错。
- 回滚：移除两处判断即可恢复旧行为。

## 影响的规则编号

NC-06（图、端口与绑定）、NC-10（变更验收）。
