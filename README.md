## flowgram-ai-rule-engine

### ① 项目定位

一个可视化的规则引擎前端画布程序，期望具备以下功能

1. 代码节点
2. 分支节点
3. 测试运行
4. 配套的java后端
5. 可以微前端或者web-components运行，进而支持跨前端语言 已实现

### ② 为什么会基于flowgram.ai再次开源一个项目？

官方的demo-free-layout更新较慢，提PR再使用较慢，并且不适用于我的场景。

### ③ 功能介绍

vue3 微前端: workflow-manage，可以搭配后端 api/gaia-workflow启动

微前端管理端：https://boommanpro.github.io/flowgram-ai-rule-engine/

flowgram 示例: https://boommanpro.github.io/flowgram-ai-rule-engine/workflow-editor/

在官方版本的基础上实现以下功能

1. 新增code节点 已完成
2. 增加note节点，仿官方注释功能 已完成
3. 增加全局导入和导出功能 已完成
4. 新增单个节点支持增加注释和注释修改，节点名称修改功能 已完成
5. 增加单个节点的运行和导出节点内容功能 已完成
6. 优化组件变量能力 已完成
7. condition组件优化 已完成
   - 支持false功能
   - 支持left和right的表达式功能
   - 支持与和或的功能
8. 支持format-string节点，用于数据格式化 已完成
9. 支持java后端能力 已完成
10. 支持测试能力，并且记录测试入参
11. 加载中效果实现

服务端支持,项目地址：https://github.com/boommanpro/gaia-workflow


2026.1.25 增加管理端，https://boommanpro.github.io/flowgram-ai-rule-engine/#/，右上角你可以配置自己的服务器地址，本地启动后访问即可

2026.1.23 增加electron端，可以直接运行体验

2026.1.6 前后端两个仓库合并

2025.12.27 跟进官网升级到v1.0.6，开发vue3管理端demo，并且开发服务端，更新docs

2025.10.17 跟进官网升级到v0.5.5，修复相关代码

2025.9.6 前后端支持string-format组件，支持spel、thymeleaf语法，当前支持与vue3打通，管理端使用vue3，工作流核心使用flowgram.ai

2025.8.22 服务端支持,项目地址：https://github.com/boommanpro/gaia-workflow

2025.8.20 更新分支到官网最新，重构代码分支

2025.5.27 重构代码分支，该代码仅维护apps/demo-free-layout目录，其余和官方保持一致

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   前端编辑器     │◄──►│   规则引擎核心    │◄──►│   后端服务      │
│ (React/Vue3)   │    │   (Rule Engine)  │    │  (Java/Spring)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  工作流画布      │    │  节点执行引擎     │    │  数据库存储     │
│ (Visual Canvas) │    │ (Node Executor)  │    │ (Database)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 什么是 Flowgram AI Rule Engine?

Flowgram AI Rule Engine 是一个现代化的可视化规则引擎平台，专为复杂业务流程的自动化编排而设计。它结合了传统的规则引擎能力与现代AI技术，支持可视化拖拽式工作流设计，让业务人员和技术人员都能轻松构建、管理和执行复杂的业务逻辑。

我们的目标是为企业提供一个统一的、易于使用的规则引擎解决方案，帮助组织快速响应业务变化，提高运营效率。

### 主要优势

- **可视化编排**: 直观的图形化界面，拖拽式操作，无需编写复杂代码
- **智能决策**: 集成AI能力，支持智能决策和预测分析
- **灵活扩展**: 支持自定义节点和插件，满足个性化业务需求
- **多端部署**: 支持Web端、桌面端和微前端等多种部署方式
- **高性能执行**: 优化的执行引擎，确保高并发场景下的性能表现

## 核心特性

**1. 可视化工作流设计**:
通过直观的画布界面，用户可以轻松拖拽和连接各种节点，构建复杂的工作流程。支持代码节点、分支节点、条件判断、数据处理等多种节点类型。

**2. 多样化节点类型**:

- 代码节点：支持JavaScript代码执行
- 分支节点：实现业务逻辑分支
- 注释节点：添加流程说明
- 条件节点：实现复杂条件判断
- 字符串格式化节点：数据格式转换
- API节点：与外部系统集成

**3. 测试与调试能力**:
内置测试功能，支持单节点测试和完整流程测试，实时查看执行结果，快速定位问题。

**4. 微前端架构支持**:
支持与Vue、React等主流前端框架集成，提供Web Components和微前端解决方案。

**5. 完整的前后端解决方案**:

- 前端：基于React/Vue3的可视化编辑器
- 后端：Spring Boot驱动的Java服务
- 桌面端：Electron封装的桌面应用

**6. 数据流转与状态管理**:
完善的上下文管理和数据流转机制，确保复杂业务流程的数据一致性。

## 架构概览

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   前端编辑器     │◄──►│   规则引擎核心    │◄──►│   后端服务      │
│ (React/Vue3)   │    │   (Rule Engine)  │    │  (Java/Spring)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  工作流画布      │    │  节点执行引擎     │    │  数据库存储     │
│ (Visual Canvas) │    │ (Node Executor)  │    │ (Database)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 快速开始

### 环境准备

在开始之前，请确保您的环境中已安装以下软件：

- Node.js >= 16.0.0
- Java >= 17
- Maven 3.x
- Git

### 前端运行

```bash
# 克隆项目
git clone https://github.com/boommanpro/flowgram-ai-rule-engine.git
cd flowgram-ai-rule-engine

# 进入前端项目目录
cd apps/console/workflow-editor

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 后端运行

```bash
# 从项目根目录进入后端目录
cd apps/api/gaia-workflow

# 使用Maven打包并运行
mvn spring-boot:run
```

### Electron桌面版

```bash
# 进入Electron目录
cd apps/console/workflow-electron

# 安装依赖
pnpm install

# 启动桌面应用
pnpm start
```

## 部署方案

### 生产环境部署

我们提供多种部署方案：

1. **独立部署**: 前后端分离部署，适用于大型分布式系统
2. **一体化部署**: 打包为单一应用，适用于中小型企业
3. **微前端集成**: 与现有微前端系统集成
4. **容器化部署**: 提供Docker镜像，支持Kubernetes部署

### 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                    负载均衡层                                │
├─────────────────────────────────────────────────────────────┤
│                    API网关                                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   前端UI集群     │  │  规则引擎集群    │  │   数据存储      │ │
│  │  (React/Vue)   │  │  (Java/Spring)  │  │  (MySQL/Redis) │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 屏幕截图

<div align="center">

链接：https://boommanpro.github.io/flowgram-ai-rule-engine/workflow-editor/

![工作流编辑器](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/demo-free-layout.png)

### 微前端集成示例


![微前端集成](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/demo-wujie-main-vue3.png)

### 管理端示例

链接：https://boommanpro.github.io/flowgram-ai-rule-engine/#/

![工作流编辑器](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/workflow-manage.png)


### 与RuoYi Vue3集成示例

![RuoYi集成](https://raw.githubusercontent.com/boommanpro/flowgram-ai-rule-engine/main/docs/images/yudao-vue3-flowgram.png)

</div>

## 技术栈

### 前端技术

- **React 18**: 现代化UI开发框架
- **Flowgram AI**: 强大的可视化工作流引擎
- **TypeScript**: 类型安全的编程语言
- **Tailwind CSS**: 实用优先的CSS框架
- **Monaco Editor**: 高性能代码编辑器

### 后端技术

- **Java 17**: 稳定的后端运行环境
- **Spring Boot**: 快速开发框架
- **MyBatis-Plus**: ORM框架
- **Maven**: 项目构建工具

### 桌面端技术

- **Electron**: 跨平台桌面应用框架
- **Node.js**: JavaScript运行时

## 贡献

我们欢迎社区贡献！如果您想参与项目开发，请遵循以下步骤：

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范

- 代码提交请遵循 [Conventional Commits](https://www.conventionalcommits.org/)
- 所有新功能必须包含单元测试
- 代码风格遵循项目现有规范

## 社区与支持

- **问题反馈**: [GitHub Issues](https://github.com/boommanpro/flowgram-ai-rule-engine/issues)
- **讨论交流**: [GitHub Discussions](https://github.com/boommanpro/flowgram-ai-rule-engine/discussions)
- **文档中心**: [Docs](./docs/README.md)

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件。

## 星图

[![Star History Chart](https://api.star-history.com/svg?repos=boommanpro/flowgram-ai-rule-engine&type=Date)](https://star-history.com/#boommanpro/flowgram-ai-rule-engine&Date)

---

<div align="center">
  <sub>由 ❤️ 和 ☕️ 驱动的开源项目</sub>
</div>

## 时间线

2026.1.25 增加管理端，https://boommanpro.github.io/flowgram-ai-rule-engine/#/，右上角你可以配置自己的服务器地址，本地启动后访问即可

2026.1.23 增加electron端，可以直接运行体验

2026.1.6 前后端两个仓库合并

2025.12.27 跟进官网升级到v1.0.6，开发vue3管理端demo，并且开发服务端，更新docs

2025.10.17 跟进官网升级到v0.5.5，修复相关代码

2025.9.6 前后端支持string-format组件，支持spel、thymeleaf语法，当前支持与vue3打通，管理端使用vue3，工作流核心使用flowgram.ai

2025.8.22 服务端支持,项目地址：https://github.com/boommanpro/gaia-workflow

2025.8.20 更新分支到官网最新，重构代码分支

2025.5.27 重构代码分支，该代码仅维护apps/demo-free-layout目录，其余和官方保持一致
