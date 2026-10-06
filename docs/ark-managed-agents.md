# 火山方舟 Managed Agents 接入指南（双引擎架构）

本项目现在支持两种 Agent 执行引擎，由 `AgentDefinition.engine` 字段选择：

| 引擎 | 值 | 循环在哪跑 | 工具在哪跑 | 适用场景 |
|---|---|---|---|---|
| 自研编排（默认） | `local` | 本服务 `AgentRuntime` | 本服务（后端自治）或浏览器（前端执行） | 自定义模型、完全自主可控 |
| 方舟托管 | `ark` | 火山方舟 Managed Agents | 方舟云沙箱（内置工具）+ 本服务（Custom Tool 桥接） | 长任务、沙箱执行、用量统计、少运维 |

存量 Agent 定义未配置 `engine` 时一律按 `local` 处理，行为零变化。

## 一、架构速览

```
浏览器控制台 ──SSE──> AgentSessionRunService ──> AgentExecutionRouter
                                                    ├─ engine=local → AgentRuntime（自研循环 + LlmProvider）
                                                    └─ engine=ark   → ArkManagedExecutionEngine
                                                                        ├─ ArkAgentProvisioningService（定义→方舟 Agent 自动同步）
                                                                        ├─ ArkManagedClient      （方舟 REST + SSE）
                                                                        ├─ ArkEventTranslator    （事件映射）
                                                                        ├─ ArkAgentSessionService（sessionKey ↔ sesn-* 映射/用量）
                                                                        └─ ToolExecutorRegistry  （custom tool 本地执行）
```

- **会话映射**：本地 `agent_session.session_key` ↔ 方舟 `sesn-*`，持久在 `agent_session` 新增列（`engine` / `remote_session_id` / `remote_agent_id` / `remote_agent_version` / `token_usage`）。方舟 Session 自带对话历史与沙箱快照（idle 保留 14 天），本地库是控制台使用的镜像投影。
- **事件翻译**：`agent.message`→`token`（增量归一）、`agent.thinking`→`thinking`、`agent.tool_use/tool_result`→`tool_call/tool_result`（executedBy=ark-sandbox）、`agent.custom_tool_use`→`tool_call`（executedBy=backend）+ 本地执行、`span.model_request_end`→`usage`（token 累计）。
- **工具桥接**：方舟发 `agent.custom_tool_use` → 本地 `ToolExecutorRegistry` 执行（走 `ToolPolicyService` 策略门禁，确认/拒绝语义与 local 引擎一致）→ `user.custom_tool_result` 回传。deny 时回传 `is_error=true` + 拒绝原因，模型可感知边界。
- **中断**：控制台「停止」→ 引擎转发 `user.interrupt`。
- **SSE 断线**：按官方推荐流程重开流 + 分页拉历史（`GET /sessions/{id}/events`）+ 按事件 id 去重，仅补投本次 user.message 回执之后的事件。

核心代码：`apps/api/gaia-workflow/gaia-workflow-app/src/main/java/cn/boommanpro/gaia/workflow/app/agent/ark/`。

## 二、开通与配置（人工步骤，无需在方舟控制台建 Agent）

1. 火山方舟控制台开通 **Managed Agents 服务** 与 **模型服务**。
2. 创建 **API Key**（Ark API Key 管理）。
3. 创建云沙箱 **Environment**（Environments → 创建；记录 `env-2026...-xxxx`）。可选配置预装包、环境变量、TOS 产物存储。
4. 在本系统「管理 → 配置 → 模型配置」页填 **火山方舟托管** 分区（或写 `agent_config` 表 `config_key=provider_config:ark`，`config_data` JSON），保存即时生效：

```json
{
  "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
  "apiKey": "<你的方舟 API Key>",
  "environmentId": "env-2026...-xxxx",
  "defaultModelId": "doubao-seed-2-1-pro-260628"
}
```

`application.yml` 的 `agent.ark.*` 是兜底默认值（DB 配置优先）。

**不需要手动创建方舟 Agent**：`AgentDefinition.engine=ark` 且未填 `arkAgentId` 时，`ArkAgentProvisioningService` 会在首次运行时自动调 `POST /api/v3/agents` 创建远端 Agent——system 提示词取三级兜底解析结果，工具自动映射为 Custom Tool（`AgentToolRegistry` 的 OpenAI function parameters → `input_schema`），映射状态与 payload hash 存于 `agent_config`（key=`ark_provisioning:{definitionId}`）。之后本地定义每次变更（提示词/工具/描述）都会带版本乐观锁自动更新远端，无变更时零远端调用。若在 `provider_config:ark` 或定义里显式填了远端 `agentId`，则视为手动绑定，自动同步不再触碰该资源。

## 三、默认 Agent 与路由

- 内置定义 **`ark-assistant`**（`AgentAssembly.arkAssistantDefinition()`）：engine=ark、工具集为后端可执行的 `query / manage / applyWorkflow / createPlan / executeStep`，sortOrder=50（不参与隐式路由，只被显式指定或默认配置选中）。未填 `arkAgentId`，首次运行时由自动同步创建远端资源。
- 当 `provider_config:ark` 的 `apiKey` / `environmentId` / `defaultAgentId` 三项齐备时，**新会话默认走方舟托管**（`AgentSessionRunService.resolveDefaultAgentId()`）；任一缺失自动回退 local 的 `workspace-backend`，聊天永不被配置问题打断。要让自动创建的 Agent 作为默认，把 `defaultAgentId` 填 `ark-assistant` 即可。
- 显式指定：`POST /api/agent/session/{key}/run` 请求体传 `agentId: "ark-assistant"`；headless 接口 `POST /api/managed-agent/run` 同理。

## 四、Custom Tool 的两种形态

**自动同步（默认，推荐）**：`ArkAgentProvisioningService` 在首次运行/定义变更时自动把工具暴露给方舟——
只暴露 `toolNames` 中**后端可执行**的工具（`ToolExecutorRegistry.isBackendExecutable`），schema 直接取自 `agent_tool_definition`（控制台「工具定义」页可查看）。前端专属工具（`canvas` / `navigate`）没有 Custom Tool 执行方，永远不会被暴露。

**手动绑定（可选）**：若你想自己在方舟控制台调 Agent（比如要用方舟的 Skills/MCP/Advisor 等高级配置），在方舟创建 Agent 并声明 Custom Tool 后，把远端 `agent-...` 填进 `provider_config:ark.defaultAgentId`（或 `AgentDefinition.arkAgentId`）。手动绑定模式下系统不再同步该资源，但工具调用事件桥接照常工作。

| 工具名 | 用途 | input_schema 来源 |
|---|---|---|
| `query` | 查询工作流/画布/版本等只读信息 | `agent_tool_definition` 表（自动同步直接复用） |
| `manage` | 管理工作流（改名、归档等） | 同上 |
| `applyWorkflow` | 把 DSL 落成工作流草稿版本 | 同上 |
| `createPlan` | 为复杂任务建立执行计划 | 同上 |
| `executeStep` | 执行计划中的下一步 | 同上 |

## 五、验证清单

- [ ] 配置保存后，管理页「方舟托管」分区回显正确。
- [ ] 新建会话发消息（显式 `agentId=ark-assistant` 或 defaultAgentId 指向它）→ 方舟控制台 Agent 列表出现 `ark-auto`（自动创建），工具声明为 Custom Tool。
- [ ] 回复流式出现（`agent.message` 增量语义以实测为准，若全文重发则由翻译器 diff 归一）。
- [ ] 让 Agent 调 `query` 工具 → 前端工具卡片显示 executedBy=backend，方舟 Session 从 requires_action 恢复 running。
- [ ] 把 `manage` 设为 confirm 策略 → 前端弹确认框；allow 后工具执行，deny 后方舟收到错误结果并自行调整。
- [ ] 修改 ark 引擎定义（如加工具）→ 下次运行时方舟侧 Agent 版本号 +1。
- [ ] 会话进行中关闭窗口 → 运行继续；重开窗口快照恢复。
- [ ] 点击停止 → 本地停发事件 + 方舟收到 `user.interrupt`。
- [ ] 会话列表页 `agent_session.token_usage` 有累计 token；方舟控制台追踪视图用量一致。
- [ ] 断网重连（拔 VPN 等）→ 引擎自动重连并补投事件，正文不缺段。

## 六、已知边界（与方案一致）

- `agent.message` 的增量/全量语义：官方文档只列 `agent.message`，社区有 delta 变体的可能。翻译器按「前缀 diff」归一，两种形态都能工作；联调首日建议抓一次原始事件确认，必要时在 `ArkEventTranslator` 显式分支。
- 方舟事件历史是权威（保留 6 个月），本地镜像不做自动合并；如需核对，调 `GET /api/v3/sessions/{id}/events`（二期会加 debug 视图）。
- API Key 明文存于 `agent_config`（与现有 llm_config 一致），加密存储在后续版本统一处理。
- 方舟沙箱内置工具集（bash/文件/web_search，按次计费）v1 不启用；`AgentDefinition.arkSandboxTools` 字段已预留，启用需方舟侧 Agent 同步配置。
- 自动同步以本地定义为权威：若有人在方舟控制台直接修改了自动创建的 Agent，本地下次变更触发更新时会经乐观锁找回远端版本并覆盖；想完全自管远端资源，在定义里填 `arkAgentId`（手动绑定）即可。
- 多 Agent 协作（`agent.thread_*`）与 image/document 上行：三期。
