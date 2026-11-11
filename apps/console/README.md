# Gaia Console

Gaia 的前端控制台：AI 工作区（对话生成/试运行）、流程编辑器画布、管理与发布后台。项目整体介绍见[根 README](../../README.md)。

## 技术栈

React 18 + @flowgram.ai/editor 画布 + Semi Design 组件库 + rsbuild 构建 + Tailwind；单元测试 vitest，端到端 Playwright。

## 常用命令（包管理器统一用 pnpm）

```bash
pnpm install     # 安装依赖（CI 使用 --frozen-lockfile）
pnpm dev         # 本地开发
pnpm lint        # ESLint
pnpm ts-check    # tsc --noEmit 类型检查
pnpm test        # vitest 单元测试
pnpm e2e         # Playwright 端到端（需先启动前后端服务）
pnpm build:gh-pages  # 构建 GitHub Pages 产物
```
