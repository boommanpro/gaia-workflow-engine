# 提案：外部 Agent 建流能力（MCP 统一控制面 + 实时渲染）

- 状态：已完成（2026-11-21 实施并验证，随方案批准一并落地）
- 日期：2026-11-21

## 问题

会话草稿 / 工具 / SSE 事件 / 校验 / 落版链路此前只服务两类驱动方（内置 LLM agent、火山方舟托管 Agent 回连）；外部 coding agent（DeepSeek、Claude Code 等 MCP 客户端）无法建流，且 `/mcp/gaia/{sessionKey}` 离线路径事件被丢弃（托管 Agent 离线调用同样不可见）。

## 统一模型

**外部 coding agent 是同一工具链路的第三个驱动方**，不新增平行通道：

```
内置 LLM agent（/chat）─┐
外部 coding agent（MCP）┼─▶ 同一套：会话 → 工具(AgentToolRegistry) → 草稿(SessionWorkflowStore)
火山方舟托管（MCP 回连）─┘            → 事件(SessionEventBus SSE) → 校验 → 用户确认落版
```

对外控制面 = 唯一 MCP 端点；工具一份不裁剪；实时渲染复用 document 增量 ops → SSE 链路；外部产出=会话草稿，落版权限在人。

## 范围（实施内容）

1. `ass/AgentServiceMcpController` 迁移重构为 `agent/mcp/server/GaiaMcpServerController`（路径不变；删冗余状态与 AgentRegistry 依赖；initialize 懒创建 `engine=external_mcp` 会话 + 观看引导，策略性文字无字段表）。
2. 离线 tools/call 补驱动方事件：tool_call/tool_result、外部构建快照（`driver=external_mcp`）、直连总线的 sink（修复工具内部 document 事件丢弃，托管 Agent 离线链路同受益）；DELETE 对 running 快照发 done 收尾。live 路径行为不变。
3. 鉴权：ApiKeyAuthInterceptor 增实例级 key（`agent.security.api-keys`，env `GAIA_API_KEY`，未配置放行=本地单机信任），注册路径补 `/mcp/gaia/**`；`/api/v1/wf` 行为不变。
4. 前端 `engine=external_mcp` 会话「外部」徽标（SessionList + AiWorkspace，zh/en）；README 接入章节。

## 非目标 / Future

- 外部 agent 落版权限（AI 起草不落库边界不变）；REST 面 / 凭据表 / 工具白名单（永久取消，不新增）。
- Future（记录不实施）：实例 key 管理界面；MCP progress 通知；/editor 页实时观看；外部 agent 空闲超时自动收尾。

## 影响的规则编号

- P-07 渐进收敛（本提案即其应用）；P-05/NC-04（instructions 仅策略，契约走 get(target=knowledge)）；NC-07（外部 agent 同走查契约→改草稿→校验→试跑闭环）。
- 不改变 NC-01~NC-06、NC-08~NC-10 规则文本。

## 拟议规范差异

specs 此前无外部 agent 接入规范；本提案确立：**对外 MCP 控制面即 `/mcp/gaia/{sessionKey}`，与内部驱动方共用同一链路；外部产出=会话草稿，落版权限在人**。后续如出现第二类对外端点须先修订本提案。

## 验证

- `mvn test -pl gaia-workflow-app -am` 通过（新增 GaiaMcpServerTest 7 用例、ApiKeyAuthInterceptorMcpTest 6 用例）；`pnpm ts-check` 通过；改动文件 eslint 无告警。
- 运行时端到端（48080 实测）：initialize 懒创建会话、tools/list 与内置同份 9 工具、node add 建流（自动布局）、SSE 依次收到 run_state(driver=external_mcp)/tool_call/tool_result/artifact/document(`ops:[{op:"node_set"}]` 增量)、草稿留档重启不丢。
- 未验证：真实 MCP 客户端联调（dsh 已配置待用户验收，见 README 接入章节）。
