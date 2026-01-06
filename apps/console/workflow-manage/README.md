# 微前端主应用 - 工作流编辑器

这是一个使用 wujie 微前端框架构建的工作流编辑器主应用。主应用负责管理工作流的版本控制、模板管理和与子应用的通信。

## 功能特性

- 工作流编辑器（通过微前端加载子应用）
- 工作流版本管理
- 模板管理
- AI 助手（新增功能）

## AI 助手功能

本项目新增了 AI 助手功能，具有以下能力：

1. **悬浮按钮**：在页面右下角有一个 AI 助手悬浮按钮
2. **对话界面**：点击按钮展开对话框，支持与 AI 交互
3. **组件建议**：AI 根据用户描述提供建议的组件类型
4. **组件添加**：用户可以选择组件，AI 助手会向工作流中添加相应的组件

### AI 助手技术实现

- AI 助手通过 wujie 通信机制与微前端子应用交互
- 支持添加多种类型的组件（条件判断、数据处理、API调用等）
- 实时反馈组件添加结果

## 项目结构

```
src/
├── components/           # Vue 组件
│   ├── AIAssistant.vue  # AI 助手组件（新增）
│   ├── WorkflowEditorFrame.vue
│   └── WujieWrapper.vue
├── composables/          # Vue 组合式函数
│   ├── useWorkflowData.js
│   └── useWorkflowCommunication.js
├── views/               # 页面视图
│   ├── WorkflowEditor.vue
│   ├── WorkflowManagement.vue
│   └── TemplateManagement.vue
├── store/               # Pinia 状态管理
└── styles.css           # 全局样式
```

## 安装和运行

```bash
# 安装依赖
pnpm install

# 开发模式运行
pnpm dev

# 构建生产版本
pnpm build
```

## 微前端通信

主应用与子应用之间通过 wujie 提供的通信机制实现数据交换：

1. 主应用向微应用传递工作流数据
2. 微应用向主应用发送保存请求
3. 通过事件总线进行实时通信
4. AI 助手与微应用的组件添加通信
