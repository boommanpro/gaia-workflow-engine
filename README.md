<div align="center">

<img src="assets/logo.svg" width="120" alt="Gaia" />

# Gaia

可视化 AI 工作流编辑器

基于 [flowgram.ai](https://github.com/bytedance/flowgram.ai) · React + Spring Boot + SQLite

[![Stars](https://img.shields.io/github/stars/boommanpro/gaia-workflow-engine?style=flat&color=orange)](https://github.com/boommanpro/gaia-workflow-engine/stargazers)
[![Release](https://img.shields.io/github/v/release/boommanpro/gaia-workflow-engine?style=flat)](https://github.com/boommanpro/gaia-workflow-engine/releases)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat)](./LICENSE)
[![Demo](https://img.shields.io/badge/在线演示-GitHub%20Pages-green?style=flat)](https://boommanpro.github.io/gaia-workflow-engine/)

[English](./README.en.md) · [发布日志](https://boommanpro.github.io/gaia-workflow-engine/#/releases) · [Issues](https://github.com/boommanpro/gaia-workflow-engine/issues) · [Discussions](https://github.com/boommanpro/gaia-workflow-engine/discussions)

</div>

在无限画布上拖拽编排 AI 工作流：LLM 调用、条件分支、循环、HTTP 请求、代码执行。也可以在侧栏对话里描述需求，由 AI 规划步骤、自动创建节点和连线，直接在画布上试运行。

后端为 Spring Boot 单体应用，内置 SQLite 存储与 AgentScope 执行引擎，打包为可执行 jar 部署。

## 演示

76 秒完整流程：对话描述需求，AI 生成工作流，单节点测试，试运行。全程为真实 API 调用录制。

https://github.com/user-attachments/assets/2530ba1e-3ac2-49c3-835f-87ed9f77b44c

<details>
<summary>时间轴</summary>

| 时间 | 内容 |
|------|------|
| 0:00 | 画布总览：开始 → 条件分支 → 生成文案 → 结束 |
| 0:18 | 侧栏对话：描述需求，AI 产出五步计划 |
| 0:46 | 自动编排：创建节点、连线，三次单节点测试通过（加速回放） |
| 0:55 | Trajectory：每次工具调用与执行轨迹可查 |
| 1:01 | 试运行：输入 85，"及格"分支生效并返回判定结果 |

</details>

在线体验：[首页](https://boommanpro.github.io/gaia-workflow-engine/) · [管理后台](https://boommanpro.github.io/gaia-workflow-engine/#/admin/workflows) · [发布日志](https://boommanpro.github.io/gaia-workflow-engine/#/releases)

## 功能特性

### 画布与节点

- 无限缩放画布，拖拽编排，支持循环、分支、条件逻辑
- 多分支节点：and/or 组合条件，else 兜底
- 内置节点：LLM 调用、代码执行、HTTP 请求、字符串格式化、变量管理
- 节点单测与整流试运行，实时查看输入输出与执行历史
- 小地图、自动布局、吸附线等画布插件

### 对话生成

- 侧栏对话生成工作流：CreatePlan 分步规划，Canvas 工具自动创建节点与连线
- HTTP / Query 节点可在对话中发起查询
- token 消耗与计划进度实时预览
- 会话可重命名，执行轨迹（Trajectory）完整可查

### 配置与运维

- Agent 配置中心：模型参数、系统提示词、知识库、工具定义
- 执行引擎可切换：内置 AgentScope，或火山方舟 Managed Agents
- 每次保存生成版本，支持版本间 diff 对比与切换生效
- 工作流模板：一键从模板创建新工作流
- 运行观测 API（`/api/agent/metrics/*`）：工具调用、会话运行、LLM 调用账本与上下文占用统计

## 快速开始

### 环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | ≥ 18 |
| JDK | ≥ 21（代码节点在运行时以 `-source 21` 编译，需以 JDK 21 运行服务） |
| Maven | 3.x |

> 项目自身按 Java 17 构建（`maven.compiler.release=17`），但代码节点由运行中的服务调用系统 JDK 现场编译，因此**运行环境**需要 JDK 21 及以上。

### 前端

```bash
git clone https://github.com/boommanpro/gaia-workflow-engine.git
cd gaia-workflow-engine/apps/console
npm install
npm run dev
```

启动后访问 <http://localhost:3000>。

### 后端

```bash
cd apps/api/gaia-workflow
mvn install -DskipTests     # 首次克隆必做：把 base/infra 构件装进本地仓库
cd gaia-workflow-app
mvn spring-boot:run         # 开发模式启动，端口 48080
```

> 多模块说明：`gaia-workflow-app` 单模块启动依赖本地仓库中的 base/infra `SNAPSHOT` 构件。克隆后或 base/infra 有改动时，需先在聚合目录 `apps/api/gaia-workflow` 下执行 `mvn install -DskipTests`。

生产部署可打包为可执行 jar：

```bash
cd apps/api/gaia-workflow
mvn package -DskipTests
java -jar gaia-workflow-app/target/gaia-workflow-app-0.0.1-SNAPSHOT.jar
```

API 服务运行在 48080 端口。SQLite 数据库文件 `gaia_workflow.db` 创建于进程工作目录，首次启动自动建库建表并写入默认配置。

### LLM 配置（必需）

Agent 对话需要一个 OpenAI 兼容的 LLM 端点（vLLM / Ollama / LM Studio / 各类网关均可）。启动后在浏览器进入 **管理 → 配置 → 模型配置**，填写 API Host / API Key / 模型名并保存。配置写入 `agent_config` 表，即时生效，无需重启。

- 默认执行引擎为内置 AgentScope（Harness ReAct 循环，依赖 [io.agentscope:agentscope-harness](https://central.sonatype.com/artifact/io.agentscope/agentscope-harness)，Maven Central 公开可取）。
- 也可切换为火山方舟 Managed Agents 托管引擎：在「模型配置」页的「火山方舟托管」分区填写 apiKey / environmentId / 模型 ID，再将默认引擎切到方舟。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 · TypeScript · flowgram.ai 1.0.12 |
| 后端 | Spring Boot · MyBatis Plus · Java 17（构建）/ 21（运行） |
| 数据库 | SQLite |
| 构建 | rsbuild（前端）· Maven（后端） |

## 部署方案

- 前后端分离部署，适合已有网关与服务治理的环境
- 单 jar 一体化部署，适合中小规模使用
- 前端部署到 GitHub Pages，后端地址可配置
- 容器化：暂无官方镜像，可基于上述 jar 自行构建

## 文档

- 项目文档：<https://boommanpro.github.io/gaia-workflow-engine/#docs>
- flowgram.ai 框架文档：<https://flowgram.ai/guide/>

## 贡献

欢迎 Issue 与 PR。提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

1. Fork 本仓库并创建功能分支
2. 提交更改并发起 Pull Request

## 许可证

[MIT](./LICENSE)

## Star 趋势

<a href="https://www.star-history.com/?repos=boommanpro%2Fgaia-workflow-engine&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=boommanpro/gaia-workflow-engine&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=boommanpro/gaia-workflow-engine&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=boommanpro/gaia-workflow-engine&type=date&legend=top-left" />
 </picture>
</a>
