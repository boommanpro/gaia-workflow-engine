<div align="center">

<img src="assets/logo.svg" width="120" alt="Gaia" />

# Gaia

**把想法拖成工作流，或者——直接说给 AI 听**

开源可视化 AI 工作流引擎 · 画布编排 × 对话生成 × 本地运行

基于 [flowgram.ai](https://github.com/bytedance/flowgram.ai) · [MIT](./LICENSE)

[![Stars](https://img.shields.io/github/stars/boommanpro/gaia-workflow-engine?style=flat&color=orange)](https://github.com/boommanpro/gaia-workflow-engine/stargazers)
[![Release](https://img.shields.io/github/v/release/boommanpro/gaia-workflow-engine?style=flat)](https://github.com/boommanpro/gaia-workflow-engine/releases)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat)](./LICENSE)
[![Demo](https://img.shields.io/badge/在线演示-GitHub%20Pages-green?style=flat)](https://boommanpro.github.io/gaia-workflow-engine/)

[English](./README.en.md) · [在线体验](https://boommanpro.github.io/gaia-workflow-engine/) · [文档](https://boommanpro.github.io/gaia-workflow-engine/#docs) · [发布日志](https://boommanpro.github.io/gaia-workflow-engine/#/releases) · [Issues](https://github.com/boommanpro/gaia-workflow-engine/issues) · [Discussions](https://github.com/boommanpro/gaia-workflow-engine/discussions)

</div>

---

## <img src="assets/icons/play.svg" width="22" valign="middle" alt="" /> 76 秒，看完 Gaia 能做什么

在侧栏对话里描述需求，AI 自己规划步骤、创建节点、连好线；点一下试运行，结果直接出现在画布上。以下为真实 API 调用录制：

https://github.com/user-attachments/assets/2530ba1e-3ac2-49c3-835f-87ed9f77b44c

<details>
<summary>视频时间轴</summary>

| 时间 | 内容 |
|------|------|
| 0:00 | 画布总览：开始 → 条件分支 → 生成文案 → 结束 |
| 0:18 | 侧栏对话：描述需求，AI 产出五步计划 |
| 0:46 | 自动编排：创建节点、连线，三次单节点测试通过（加速回放） |
| 0:55 | Trajectory：每次工具调用与执行轨迹可查 |
| 1:01 | 试运行：输入 85，"及格"分支生效并返回判定结果 |

</details>

## <img src="assets/icons/sparkles.svg" width="22" valign="middle" alt="" /> 核心亮点

**<img src="assets/icons/hand.svg" width="20" valign="middle" alt="" /> 拖拽即编排**
无限画布上自由缩放、拖拽、连线。LLM 调用、代码执行、HTTP 请求、条件分支、循环——常用的积木都在节点面板里。

**<img src="assets/icons/message-square.svg" width="20" valign="middle" alt="" /> 一句话，AI 帮你画**
不想动手拖？在侧栏对话里描述需求，AI 分步规划、自动创建节点和连线，每一步实时可见、随时干预。

**<img src="assets/icons/flask-conical.svg" width="20" valign="middle" alt="" /> 先试后用**
单个节点可以单独测试，整条流程一键试运行；输入输出、执行历史、token 消耗全部实时可见。

**<img src="assets/icons/alarm-clock.svg" width="20" valign="middle" alt="" /> 定时自动化**
给工作流设置 cron 或简单规则，让它每天 / 每小时自己跑；错过的触发可配置跳过或补跑一次，运行历史随时回看。

**<img src="assets/icons/history.svg" width="20" valign="middle" alt="" /> 每次保存都有版本**
版本自动记录，任意两版 diff 对比，一键切换生效版本——大胆改，随时回。

**<img src="assets/icons/lock.svg" width="20" valign="middle" alt="" /> 数据留在你手里**
SQLite 单文件存储，数据全部在你自己的电脑或服务器上；模型端点也由你指定（vLLM / Ollama / LM Studio / 任意 OpenAI 兼容网关）。

**<img src="assets/icons/bot.svg" width="20" valign="middle" alt="" /> 你的 Coding Agent 也能来搭**
Gaia 内置 MCP 服务端：Claude Code、DeepSeek、Cherry Studio 等任何支持 streamable-http 的 Agent，都能直接在 Gaia 里建工作流——你在画布上看它一步步搭。

## <img src="assets/icons/users.svg" width="22" valign="middle" alt="" /> 适合谁用

| 如果你… | Gaia 可以… |
|---|---|
| 重复做"抓数据 → 喂给 AI → 整理格式"的活 | 把整条链路拖上画布，一键复跑 |
| 想做一个 AI 小工具给团队用 | 画布 + 配置中心搞定，不用写前端 |
| 用惯了云端编排产品，但在意数据私有 | SQLite 本地文件 + 自选模型端点，MIT 开源可改 |
| 在玩 Coding Agent，想让它沉淀成可复用流程 | MCP 接入：Agent 负责搭，你负责确认，流程留得住 |

## <img src="assets/icons/rocket.svg" width="22" valign="middle" alt="" /> 快速开始

| 方式 | 适合场景 | 上手耗时 |
|---|---|---|
| [在线体验](https://boommanpro.github.io/gaia-workflow-engine/) | 零安装，先逛逛 | 10 秒 |
| macOS 桌面版 | 个人电脑长期使用 | 约 5 分钟 |
| Docker Compose | 服务器部署、团队共用 | 约 10 分钟 |
| 源码运行 | 二次开发 | 需 JDK 21+ / Node 18+ |

> 无论哪种方式，跑通 AI 建流的最后一步相同：在 **管理 → 配置 → 模型配置** 填写一个 OpenAI 兼容端点（API Host / API Key / 模型名），保存即时生效，无需重启。默认执行引擎为内置 AgentScope，也可在配置页切换为火山方舟 Managed Agents。

### macOS 桌面版（最省心）

前后端打包进一个 App，双击即用：

```bash
cd apps/desktop
pnpm install
pnpm build:mac   # 产出 out/Gaia-<version>-mac-{arm64,x64}.dmg 与 .zip
```

双击 dmg 拖入 Applications 即可。运行机器需装有 JDK 21+；未签名包首次打开需右键 → 打开，或执行 `xattr -cr /Applications/Gaia.app`。数据独立存放在 `~/Library/Application Support/Gaia/data/`，关闭窗口后应用在后台运行（菜单栏图标可唤回，支持开机自启动）。细节见 [apps/desktop/README](./apps/desktop/README.md)。

### Docker Compose（服务器推荐）

```bash
cp .env.example .env
docker compose up --build -d
```

打开 <http://localhost:8080> 即用（健康检查 `/api/health`）。数据持久化在命名 volume 中，`docker compose down` 不会丢失。

<details>
<summary>Docker 运维速查</summary>

```bash
docker compose ps                # 状态
docker compose logs -f web api   # 日志
docker compose up --build -d     # 更新后重建
docker compose down              # 停止（数据保留）
```

- SQLite 文件位于 `api` 容器 `/data/gaia_workflow.db`，由命名 volume 持久化；仅在确认不再需要数据时用 `docker compose down -v` 清空
- SQLite 只支持单写实例，不能水平扩容为多个同时写入的 api 副本
- 若使用需要回连 Gaia 的外部托管引擎（AgentScope Service 等），设置 `GAIA_MCP_PUBLIC_URL=https://你的公网域名`，并让入口把 `/mcp/`（及界面所需 `/api/`）转发到 Compose 的 web 服务；仅本机运行 + 内置 Agent 时保持为空
- 常见故障：502 先看 `docker compose ps` 是否 healthy；SSE 中断检查上游代理未开缓冲；SQLite 权限错误不要覆盖 `/data` 所有权（镜像以非 root 用户写入）

</details>

### 源码运行（开发）

<details>
<summary>展开</summary>

环境要求：Node.js ≥ 18 · JDK ≥ 21（运行环境）· Maven 3.x

```bash
# 前端（端口 3000）
cd apps/console
npm install
npm run dev

# 后端（端口 48080）——首次克隆先安装 base/infra 本地构件
cd apps/api/gaia-workflow
mvn install -DskipTests
cd gaia-workflow-app
mvn spring-boot:run
```

SQLite 数据库 `gaia_workflow.db` 在进程工作目录自动创建，首次启动自动建库建表并写入默认配置。项目按 Java 17 构建，但代码节点在运行时以 `-source 21` 编译，因此**运行环境**需 JDK 21+。

生产部署打包为可执行 jar：

```bash
cd apps/api/gaia-workflow
mvn package -DskipTests
java -jar gaia-workflow-app/target/gaia-workflow-app-0.0.1-SNAPSHOT.jar
```

</details>

## <img src="assets/icons/layout-grid.svg" width="22" valign="middle" alt="" /> 功能全景

**画布编排**
- 无限缩放画布，小地图、自动布局、吸附线等插件齐备
- 节点：LLM 调用 · 代码执行 · HTTP 请求 · 字符串格式化 · 变量管理 · 条件分支（and/or 组合条件 + else 兜底）· 循环
- 节点单测 + 整流试运行，实时查看输入输出与执行历史

**AI 建流**
- 侧栏对话：CreatePlan 分步规划，Canvas 工具自动创建节点与连线
- 对话中即可发起 HTTP / Query 查询试跑；token 消耗与计划进度实时预览
- 执行轨迹（Trajectory）完整可查，每一步工具调用都有据可依；会话可重命名

**配置与运维**
- Agent 配置中心：模型参数、系统提示词、知识库、工具定义
- 执行引擎可切换：内置 AgentScope，或火山方舟 Managed Agents
- 工作流模板一键创建；定时任务中心：cron / 简单模式、错过策略（跳过 / 补跑一次）、运行历史含定时触发标记
- 运行观测 API（`/api/agent/metrics/*`）：工具调用、会话运行、LLM 调用账本与上下文占用统计

## <img src="assets/icons/plug.svg" width="22" valign="middle" alt="" /> 让外部 Agent 帮你建流

Gaia 暴露了一个自带会话的 MCP 控制面，任何支持 streamable-http 的 MCP 客户端都能接入，URL 自带会话键（自定义即可，首次连接自动创建「外部构建」会话）：

```
http://127.0.0.1:48080/mcp/gaia/我的第一个会话
```

- **实时观看**：构建期间在 console 打开同名会话（`/chat/会话键`），画布随 Agent 每一步增量渲染；Agent 的 `ask_user` 提问直接在页面作答
- **工具面**：与内置 Agent 完全一致——查节点契约、增量建流、试跑、测试用例
- **落版边界**：Agent 只产出会话草稿，**保存为版本**由你确认——AI 负责干活，人负责拍板
- **鉴权**（可选）：设置环境变量 `GAIA_API_KEY`（逗号分隔多个）后，`/mcp/gaia/**` 要求匹配的 `X-API-Key` 头；未设置则放行（本地单机信任模式）

<details>
<summary>curl 直调示例（MCP 即普通 HTTP POST + JSON）</summary>

```bash
# initialize（返回观看引导，并自动创建会话）
curl -s -X POST http://127.0.0.1:48080/mcp/gaia/ext-deepseek-01 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","clientInfo":{"name":"DeepSeek Coder"}}}'

# 添加 start 节点（SSE /api/agent/session/ext-deepseek-01/events 可实时收到 tool_call/document 事件）
curl -s -X POST http://127.0.0.1:48080/mcp/gaia/ext-deepseek-01 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"node","arguments":{"action":"add","type":"start"}}}'
```

</details>

## <img src="assets/icons/layers.svg" width="22" valign="middle" alt="" /> 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 · TypeScript · [flowgram.ai](https://flowgram.ai/guide/) 1.0.12 |
| 后端 | Spring Boot · MyBatis Plus · Java 17（构建）/ 21（运行） |
| 存储 | SQLite 单文件 |
| 交付 | 单 jar · Docker Compose · macOS 桌面版 · GitHub Pages 前端 |

## <img src="assets/icons/book-open.svg" width="22" valign="middle" alt="" /> 文档

- 项目文档：<https://boommanpro.github.io/gaia-workflow-engine/#docs>
- flowgram.ai 框架文档：<https://flowgram.ai/guide/>

## <img src="assets/icons/git-pull-request.svg" width="22" valign="middle" alt="" /> 贡献

欢迎 Issue 与 PR。提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

1. Fork 本仓库并创建功能分支
2. 提交更改并发起 Pull Request

## <img src="assets/icons/scale.svg" width="22" valign="middle" alt="" /> 许可证

[MIT](./LICENSE)

## <img src="assets/icons/trending-up.svg" width="22" valign="middle" alt="" /> Star 趋势

<a href="https://www.star-history.com/?repos=boommanpro%2Fgaia-workflow-engine&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=boommanpro/gaia-workflow-engine&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=boommanpro/gaia-workflow-engine&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=boommanpro/gaia-workflow-engine&type=date&legend=top-left" />
 </picture>
</a>
