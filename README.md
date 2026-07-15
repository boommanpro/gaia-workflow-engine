<div align="center">

# Gaia · Visual AI Workflow Editor

**Build AI workflows, visually. Powered by [flowgram.ai](https://github.com/bytedance/flowgram.ai).**

[![GitHub stars](https://img.shields.io/github/stars/boommanpro/flowgram-ai-rule-engine?style=social)](https://github.com/boommanpro/flowgram-ai-rule-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/v/release/boommanpro/flowgram-ai-rule-engine)](https://github.com/boommanpro/flowgram-ai-rule-engine/releases)
[![Live Demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue.svg)](https://boommanpro.github.io/flowgram-ai-rule-engine/)

[English](#english) · [中文](#中文)

</div>

---

# English

A modern visual rule engine platform for orchestrating complex AI workflows. Design, test, and deploy AI pipelines on an infinite canvas — no code required. Combines the power of [flowgram.ai](https://flowgram.ai) with a Java backend for production-ready workflow management.

## ✨ Features

- **Visual Canvas** — Infinite, zoomable canvas with drag-and-drop nodes. Supports loops, branches, and conditional logic.
- **AI Node Types** — Built-in LLM calls, code execution, HTTP requests, string formatting, and variable management.
- **Real-time Preview** — Test individual nodes or entire workflows with live input/output inspection.
- **Version Management** — Every save creates a version. Switch, track, and roll back with one click.
- **Template System** — Create reusable workflow templates. Spin up new workflows in a single click.
- **Extensible Plugins** — Minimap, auto-layout, snap lines, node panel, and more.
- **Multi-condition Node** — Synced from official flowgram.ai for complex branching logic.

## 📸 Screenshots

| Page | Preview |
|------|---------|
| **Home** — Internationalized product landing page | ![Home](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-home.png) |
| **Live Demo** — Interactive workflow canvas (draggable, add nodes, no run) | ![Live Demo](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-demo.png) |
| **Docs** — Quick start, prerequisites, deployment options | ![Docs](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-docs.png) |
| **Editor** — Visual workflow editor with version management | ![Editor](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-editor.png) |
| **Admin · Workflows** — Workflow management console | ![Admin Workflows](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-admin-workflows.png) |
| **Admin · Templates** — Template management console | ![Admin Templates](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-admin-templates.png) |
| **Release Log** — Version history timeline | ![Releases](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-releases.png) |

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | >= 18   |
| Java        | >= 17   |
| Maven       | 3.x     |
| Git         | any     |

### Frontend

```bash
git clone https://github.com/boommanpro/flowgram-ai-rule-engine.git
cd flowgram-ai-rule-engine/apps/console
npm install
npm run dev
```

Visit http://localhost:3000

### Backend

```bash
cd apps/api/gaia-workflow
mvn spring-boot:run
```

API server runs on port 48080.

## 🛠 Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Frontend    | React 18, TypeScript, flowgram.ai 1.0.12       |
| Backend     | Spring Boot, MyBatis Plus, Java 17              |
| Database    | SQLite                                          |
| Build       | rsbuild (frontend), Maven (backend)             |

## 📦 Deployment Options

1. **Standalone** — Frontend and backend deployed separately for large distributed systems.
2. **All-in-One** — Bundled as a single application for small to medium teams.
3. **GitHub Pages** — Frontend deployed to GitHub Pages with configurable backend address.
4. **Containerized** — Docker images with Kubernetes support for cloud deployment.

## 📖 Documentation

Full documentation is available on the [homepage Docs section](https://boommanpro.github.io/flowgram-ai-rule-engine/#docs).

For flowgram.ai framework docs, visit https://flowgram.ai/guide/

## 🗓 Release Log

See the [Release Log page](https://boommanpro.github.io/flowgram-ai-rule-engine/#/releases) for the full milestone history.

## 🤝 Contributing

1. Fork this project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

We follow [Conventional Commits](https://www.conventionalcommits.org/).

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=boommanpro/flowgram-ai-rule-engine&type=Date)](https://star-history.com/#boommanpro/flowgram-ai-rule-engine&Date)

---

# 中文

一个现代化的可视化规则引擎平台，用于编排复杂的 AI 工作流。在无限画布上设计、测试和部署 AI 流程——无需编写代码。结合 [flowgram.ai](https://flowgram.ai) 的能力与 Java 服务端，提供生产级工作流管理。

## ✨ 功能特性

- **可视化画布** — 无限缩放画布，支持拖拽节点。通过循环、分支和条件逻辑设计复杂的工作流。
- **AI 节点类型** — 内置 LLM 调用、代码执行、HTTP 请求、字符串格式化和变量管理节点。
- **实时预览** — 测试单个节点或整个工作流，实时查看输入输出和执行历史。
- **版本管理** — 每次保存创建一个版本。在版本间切换、追踪变更、一键回滚。
- **模板系统** — 创建可复用的工作流模板。一键从模板创建新工作流。
- **可扩展插件** — 小地图、自动布局、吸附线、节点面板等。
- **多条件节点** — 同步官方 flowgram.ai，支持复杂分支逻辑。

## 📸 截图

| 页面 | 预览 |
|------|------|
| **首页** — 国际化产品介绍页 | ![首页](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-home.png) |
| **在线演示** — 可交互工作流画布（可拖拽、可新增节点、不可运行） | ![在线演示](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-demo.png) |
| **文档** — 快速开始、环境准备、部署方案 | ![文档](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-docs.png) |
| **编辑器** — 可视化工作流编辑器，含版本管理 | ![编辑器](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-editor.png) |
| **管理后台 · 工作流** — 工作流管理控制台 | ![管理工作流](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-admin-workflows.png) |
| **管理后台 · 模板** — 模板管理控制台 | ![管理模板](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-admin-templates.png) |
| **发布日志** — 版本历史时间线 | ![发布日志](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/screenshot-releases.png) |

## 🚀 快速开始

### 环境准备

| 要求       | 版本    |
|------------|---------|
| Node.js    | >= 18   |
| Java       | >= 17   |
| Maven      | 3.x     |
| Git        | 任意    |

### 前端运行

```bash
git clone https://github.com/boommanpro/flowgram-ai-rule-engine.git
cd flowgram-ai-rule-engine/apps/console
npm install
npm run dev
```

访问 http://localhost:3000

### 后端运行

```bash
cd apps/api/gaia-workflow
mvn spring-boot:run
```

API 服务运行在 48080 端口。

## 🛠 技术栈

| 层级     | 技术                                            |
|----------|-------------------------------------------------|
| 前端     | React 18, TypeScript, flowgram.ai 1.0.12        |
| 后端     | Spring Boot, MyBatis Plus, Java 17              |
| 数据库   | SQLite                                          |
| 构建     | rsbuild (前端), Maven (后端)                     |

## 📦 部署方案

1. **独立部署** — 前后端分离部署，适用于大型分布式系统。
2. **一体化部署** — 打包为单一应用，适用于中小型企业。
3. **GitHub Pages** — 前端部署到 GitHub Pages，后端地址可配置。
4. **容器化部署** — 提供 Docker 镜像，支持 Kubernetes 部署。

## 📖 文档

完整文档请访问[首页文档部分](https://boommanpro.github.io/flowgram-ai-rule-engine/#docs)。

flowgram.ai 框架文档：https://flowgram.ai/guide/

## 🗓 发布日志

完整里程碑历史请查看[发布日志页面](https://boommanpro.github.io/flowgram-ai-rule-engine/#/releases)。

## 🤝 贡献

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

## 📄 许可证

本项目采用 MIT 许可证 — 详见 [LICENSE](./LICENSE) 文件。

## ⭐ Star 趋势

[![Star History Chart](https://api.star-history.com/svg?repos=boommanpro/flowgram-ai-rule-engine&type=Date)](https://star-history.com/#boommanpro/flowgram-ai-rule-engine&Date)

---

<div align="center">

**[Live Demo](https://boommanpro.github.io/flowgram-ai-rule-engine/)** · **[Admin Console](https://boommanpro.github.io/flowgram-ai-rule-engine/#/admin/workflows)** · **[Release Log](https://boommanpro.github.io/flowgram-ai-rule-engine/#/releases)** · **[Issues](https://github.com/boommanpro/flowgram-ai-rule-engine/issues)** · **[Discussions](https://github.com/boommanpro/flowgram-ai-rule-engine/discussions)**

<sub>Built with ❤️ and ☕️</sub>

</div>
