# GitHub Actions 工作流说明

本文档描述了项目中各个 GitHub Actions 工作流的用途和配置。

## 工作流概述

### 1. `deploy.yml` - 部署到 GitHub Pages
- **触发条件**: 推送到 `main` 分支
- **功能**: 构建并部署前端应用到 GitHub Pages
- **涉及组件**: 
  - `apps/console/workflow-manage` (Vue3 主应用)
  - `apps/console/workflow-editor` (React 子应用)

### 2. `build-electron.yml` - 构建 Electron 应用
- **触发条件**: 推送到 `main` 或 `develop` 分支，以及 PR 合并到 `main`
- **功能**: 完整构建 Electron 桌面应用程序
- **涉及组件**:
  - 后端 API (`apps/api/gaia-workflow`)
  - 前端编辑器 (`apps/console/workflow-editor`)
  - Electron 应用 (`apps/console/workflow-electron`)

### 3. `build-backend-frontend.yml` - 分步构建组件
- **触发条件**: 推送到 `main` 或 `develop` 分支，以及 PR 合并到 `main`
- **功能**: 分别构建后端和前端组件，便于独立部署或测试
- **涉及组件**:
  - 后端 API (`apps/api/gaia-workflow`)
  - 前端编辑器 (`apps/console/workflow-editor`)

### 4. `build-full-application.yml` - 综合构建工作流
- **触发条件**: 推送到 `main` 或 `develop` 分支，以及 PR 合并到 `main`
- **功能**: 完整构建整个应用程序，包括后端、前端和桌面应用
- **涉及组件**:
  - 后端 API (`apps/api/gaia-workflow`)
  - 前端编辑器 (`apps/console/workflow-editor`)
  - Electron 应用 (`apps/console/workflow-electron`)
- **特殊功能**: 当创建版本标签时自动发布

## 技术栈要求

### JDK 版本
- 所有构建工作流均使用 JDK 21
- 使用 Temurin 发行版确保兼容性

### Node.js 版本
- 使用 Node.js 20.x 版本
- 使用 pnpm 作为包管理器

### 平台支持
构建工作流在以下平台上运行：
- Ubuntu (Linux)
- Windows (Windows)
- macOS (macOS)

## 构建流程

### 后端构建
1. 使用 Maven 构建 Java 项目
2. 生成可执行 JAR 文件
3. 测试后端组件

### 前端构建
1. 使用 pnpm 安装依赖
2. 构建 React 应用程序
3. 生成静态资源

### Electron 应用构建
1. 整合后端 JAR 文件和前端资源
2. 构建 Electron 桌面应用
3. 打包为各平台原生应用格式

## 输出产物

- **Linux**: `.AppImage`, `.deb` 文件
- **Windows**: `.exe` 安装程序
- **macOS**: `.dmg`, `.pkg` 安装程序

## 环境变量和密钥

- `GITHUB_TOKEN`: 用于访问 GitHub API，由 GitHub 自动提供

## 故障排除

### 常见问题
1. **内存不足**: 确保构建环境有足够的内存
2. **权限问题**: Linux 构建可能需要额外的系统库
3. **依赖冲突**: 检查 pnpm-lock.yaml 文件的一致性

### 调试方法
- 启用工作流调试日志
- 检查缓存键是否正确
- 验证跨平台兼容性