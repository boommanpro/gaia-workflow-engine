<div align="center">

<img src="docs/images/logos/logo-3-lettermark.svg" width="200" height="200" alt="Gaia Logo" />

# Gaia · 可视化 AI 工作流编辑器

**可视化构建 AI 工作流，基于 [flowgram.ai](https://github.com/bytedance/flowgram.ai) 驱动。**

[![GitHub Stars](https://img.shields.io/github/stars/boommanpro/gaia-workflow-engine?style=for-the-badge&logo=github&label=Stars&color=orange)](https://github.com/boommanpro/gaia-workflow-engine/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![GitHub Release](https://img.shields.io/github/v/release/boommanpro/gaia-workflow-engine?style=for-the-badge)](https://github.com/boommanpro/gaia-workflow-engine/releases)
[![Live Demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue.svg?style=for-the-badge)](https://boommanpro.github.io/gaia-workflow-engine/)

**[English](./README.en.md)** · **[简体中文](./README.md)**

</div>

---

一个现代化的可视化规则引擎平台，用于编排复杂的 AI 工作流。在无限画布上设计、测试和部署 AI 流程——无需编写代码。结合 [flowgram.ai](https://flowgram.ai) 的能力与 Java 服务端，提供生产级工作流管理。

## 功能特性

- **AI Agent 侧栏对话** — 对话式生成工作流：CreatePlan 分步规划、Canvas 自动创建节点/连线、HTTP/Query 查询工作流、实时预览 token 与计划进度；会话可重命名、可审查。
- **Agent 配置中心** — 模型参数（Host/Key/Temperature/Max Tokens）、默认执行引擎切换（内置 AgentScope / 火山方舟托管）、系统提示词与知识库、工具定义目录。
- **Agent 运行观测 API** — `/api/agent/metrics/*`：工具调用、会话运行、事件流、LLM 调用账本与上下文占用统计（`AgentObservabilityController`，供管理端/运维侧消费）。
- **可视化画布** — 无限缩放画布，支持拖拽节点。通过循环、分支和条件逻辑设计复杂的工作流。
- **AI 节点类型** — 内置 LLM 调用、代码执行、HTTP 请求、字符串格式化和变量管理节点。
- **实时预览** — 测试单个节点或整个工作流，实时查看输入输出和执行历史。
- **版本管理** — 每次保存创建一个版本。版本间差异对比（新增/删除/修改的节点与连线）、切换生效版本。
- **模板系统** — 创建可复用的工作流模板。一键从模板创建新工作流。
- **可扩展插件** — 小地图、自动布局、吸附线、节点面板等。
- **多分支节点** — 多分支 + 组合条件（and/or）与 else 兜底，支持复杂分支逻辑。

## 截图

### 工作台与工作流

| 页面 | 预览 |
|------|------|
| **首页** — 国际化产品介绍页 | ![首页](https://raw.githubusercontent.com/boommanpro/gaia-workflow-engine/main/docs/images/screenshot-home.png) |
| **在线演示** — 可交互工作流画布（可拖拽、可新增节点、不可运行） | ![在线演示](https://raw.githubusercontent.com/boommanpro/gaia-workflow-engine/main/docs/images/screenshot-demo.png) |
| **文档** — 快速开始、环境准备、部署方案 | ![文档](https://raw.githubusercontent.com/boommanpro/gaia-workflow-engine/main/docs/images/screenshot-docs.png) |
| **编辑器** — 可视化工作流编辑器，含版本管理 | ![编辑器](https://raw.githubusercontent.com/boommanpro/gaia-workflow-engine/main/docs/images/screenshot-editor.png) |
| **管理后台 · 工作流** — 工作流管理控制台 | ![管理工作流](https://raw.githubusercontent.com/boommanpro/gaia-workflow-engine/main/docs/images/screenshot-admin-workflows.png) |
| **管理后台 · 模板** — 模板管理控制台 | ![管理模板](https://raw.githubusercontent.com/boommanpro/gaia-workflow-engine/main/docs/images/screenshot-admin-templates.png) |
| **发布日志** — 版本历史时间线 | ![发布日志](https://raw.githubusercontent.com/boommanpro/gaia-workflow-engine/main/docs/images/screenshot-releases.png) |

### AI Agent

| 页面 | 预览 |
|------|------|
| **AI Agent 对话** — 侧边栏对话式生成工作流，CreatePlan 分步规划 + 步骤执行卡片 | ![AI Agent 对话](https://raw.githubusercontent.com/boommanpro/gaia-workflow-engine/main/docs/agent/Snipaste_2026-08-07_19-20-20.jpg) |
| **调试信息面板** — 原始请求/响应、SSE Event、Context 详情、Raw JSON，点击消息跳转定位 | ![调试信息面板](https://raw.githubusercontent.com/boommanpro/gaia-workflow-engine/main/docs/agent/Snipaste_2026-08-07_19-20-42.jpg) |
| **Agent 配置中心 · 模型** — API Host/Key、模型参数、Embedding 向量检索（BGE） | ![Agent 模型配置](https://raw.githubusercontent.com/boommanpro/gaia-workflow-engine/main/docs/agent/Snipaste_2026-08-07_19-21-14.jpg) |
| **Agent 配置中心 · 提示词** — 默认系统提示词 + 工具集定义（navigate/query/manage/canvas） | ![Agent 提示词配置](https://raw.githubusercontent.com/boommanpro/gaia-workflow-engine/main/docs/agent/Snipaste_2026-08-07_19-21-29.jpg) |
| **Agent 执行工作流** — 在画布上自动创建节点与连线，逐步测试并执行 | ![Agent 执行工作流](https://raw.githubusercontent.com/boommanpro/gaia-workflow-engine/main/docs/agent/Snipaste_2026-08-07_19-23-25.jpg) |

## 快速开始

### 环境准备

| 要求       | 版本    |
|------------|---------|
| Node.js    | >= 18   |
| Java       | >= 21（代码节点运行时编译要求）  |
| Maven      | 3.x     |
| Git        | 任意    |

### 前端运行

```bash
git clone https://github.com/boommanpro/gaia-workflow-engine.git
cd gaia-workflow-engine/apps/console
npm install
npm run dev
```

访问 <http://localhost:3000>

### 后端运行

```bash
cd apps/api/gaia-workflow
mvn install -DskipTests     # 首次克隆必做：把 base/infra 构件装进本地仓库
cd gaia-workflow-app
mvn spring-boot:run         # 开发模式启动，端口 48080
```

> 多模块注意：`gaia-workflow-app` 单模块启动依赖本地仓库中的 base/infra `SNAPSHOT` 构件，克隆后或 base/infra 有改动时，必须先在聚合目录 `apps/api/gaia-workflow` 下执行 `mvn install -DskipTests`。

生产部署可打包为可执行 jar：

```bash
cd apps/api/gaia-workflow
mvn package -DskipTests
java -jar gaia-workflow-app/target/gaia-workflow-app-0.0.1-SNAPSHOT.jar
```

API 服务运行在 48080 端口。SQLite 数据库文件 `gaia_workflow.db` 创建在**进程工作目录**，首次启动自动建库建表并写入默认配置。

### LLM 配置（必需）

Agent 对话需要一个 OpenAI 兼容的 LLM 端点（vLLM / Ollama / LM Studio / 各类网关均可）。启动后在浏览器进入 **管理 → 配置 → 模型配置**，填写 API Host / API Key / 模型名并保存——配置写入 `agent_config` 表，即时生效，无需重启。

- 默认执行引擎为内置 **AgentScope**（Harness ReAct 循环，依赖 [io.agentscope:agentscope-harness](https://central.sonatype.com/artifact/io.agentscope/agentscope-harness)，Maven Central 公开可取）；
- 也可切换为火山方舟 Managed Agents 托管引擎：在「模型配置」页的「火山方舟托管」分区填写 apiKey / environmentId / 模型 ID，再把默认引擎切到方舟即可。

### Docker Compose 部署

前置条件：安装 Docker Engine（含 Docker Compose v2）。复制示例配置；示例中不包含任何模型、管理员或服务凭据：

```bash
cp .env.example .env
docker compose up --build -d
```

Windows PowerShell 可用 `Copy-Item .env.example .env`。默认入口是 <http://localhost:8080>，健康检查是 <http://localhost:8080/api/health>。只有 Nginx `web` 服务发布宿主机端口；`api:48080` 仅在 Compose 内部网络中可访问。首次打开后，在 **管理 → 配置 → 模型配置** 配置兼容 OpenAI 的模型端点、模型名和 API Key；不要把这些凭据写入 `.env.example` 或提交到仓库。

常用运维命令：

```bash
# 状态与日志
docker compose ps
docker compose logs -f web api

# 停止（保留命名 volume 中的 SQLite 数据）
docker compose down

# 更新源码或镜像后重建并启动
docker compose up --build -d

# 仅在确认要删除全部本地数据时清空 SQLite volume
docker compose down -v
```

SQLite 文件在 `api` 容器的 `/data/gaia_workflow.db`，由命名 volume `gaia_data` 持久化。普通 `docker compose down` 不会删除它；重建容器后可用 `docker compose exec api ls -l /data/gaia_workflow.db` 核对。SQLite 只适合单个 `api` 写实例，不能将本 Compose 水平扩容为多个同时写入该数据库的 API 副本。

Docker 前端镜像在构建时注入同源 `/api` 访问后端，不改变独立部署/桌面部署原有的后端地址默认值。Nginx 保留 `/api/` 前缀并以 HTTP/1.1、禁用缓冲和缓存的方式代理 API/SSE，因此浏览器无需额外宽松 CORS 配置；`/mcp/` 也会转发给后端，供受管 Agent 回调使用。Nginx 的 SPA 回退会把未知前端路由交给 `index.html`。

#### 内置 Agent 与托管 Agent

本地 Compose 默认保证内置 Agent 的运行路径，不保证托管 Agent 开箱即用。`host.docker.internal:48080` 不是生产通用回调地址，也不作为本方案默认值。若使用外部托管执行引擎（AgentScope Service 等）且它需要回连 Gaia MCP，必须让部署者提供可由该服务访问的 HTTPS 公网基址：

```dotenv
GAIA_MCP_PUBLIC_URL=https://gaia.example.com
```

公网反向代理或入口必须将该地址的 `/mcp/`（以及使用界面所需的 `/api/`）转发到本 Compose 的 Nginx `web` 服务。仅在本机运行 Compose、使用内置 Agent 时保持该值为空即可。若已在管理界面保存过托管 Agent 的 provider 配置，界面中的 `mcpPublicUrl` 会优先于应用配置，应同步更新为该 HTTPS 地址。

常见故障：

- 前端显示 502：先运行 `docker compose ps`，确认 `api` 为 `healthy`，再用 `docker compose logs api` 查看启动/迁移错误。
- SSE 中断：确认访问经过 Nginx `web` 入口且上游反向代理没有缓冲或过短的读超时；仓库附带的 Nginx 已为 `/api/` 关闭缓冲并设置一小时读超时。
- SQLite 权限错误：不要覆盖挂载 `/data` 的所有权；检查 `docker compose exec api ls -ld /data`。镜像以非 root `gaia` 用户写入该目录。
- Agent 提示缺少模型配置：进入管理后台的模型配置填写兼容 OpenAI 的端点、模型名和 API Key 后保存；该值存入持久化 SQLite，不应写入镜像或示例环境文件。

## 技术栈

| 层级     | 技术                                            |
|----------|-------------------------------------------------|
| 前端     | React 18, TypeScript, flowgram.ai 1.0.12        |
| 后端     | Spring Boot, MyBatis Plus, Java 17              |
| 数据库   | SQLite                                          |
| 构建     | rsbuild (前端), Maven (后端)                     |

## 部署方案

1. **独立部署** — 前后端分离部署，适用于大型分布式系统。
2. **一体化部署** — 打包为单一应用，适用于中小型企业。
3. **GitHub Pages** — 前端部署到 GitHub Pages，后端地址可配置。
4. **容器化部署** — 官方 Docker Compose 方案，使用 Nginx 前端入口和 Spring Boot API。

## 文档

完整文档请访问[首页文档部分](https://boommanpro.github.io/gaia-workflow-engine/#docs)。

flowgram.ai 框架文档：<https://flowgram.ai/guide/>

## 发布日志

完整里程碑历史请查看[发布日志页面](https://boommanpro.github.io/gaia-workflow-engine/#/releases)。

## 贡献

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

## 许可证

本项目采用 MIT 许可证 — 详见 [LICENSE](./LICENSE) 文件。

## Star 趋势

<a href="https://www.star-history.com/?repos=boommanpro%2Fgaia-workflow-engine&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=boommanpro/gaia-workflow-engine&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=boommanpro/gaia-workflow-engine&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=boommanpro/gaia-workflow-engine&type=date&legend=top-left" />
 </picture>
</a>

---

<div align="center">

**[在线演示](https://boommanpro.github.io/gaia-workflow-engine/)** · **[管理后台](https://boommanpro.github.io/gaia-workflow-engine/#/admin/workflows)** · **[发布日志](https://boommanpro.github.io/gaia-workflow-engine/#/releases)** · **[Issues](https://github.com/boommanpro/gaia-workflow-engine/issues)** · **[Discussions](https://github.com/boommanpro/gaia-workflow-engine/discussions)**

</div>
