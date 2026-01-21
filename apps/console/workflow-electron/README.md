## 环境要求
node version v18.20.7
pnpm version 9.12.0

## 项目描述
当前项目是一个electron-egg的demo代码，你需要再此基础上进行迭代维护。
electron-egg的官方文档是：https://www.kaka996.com/pages/132909/
其中服务端启动：https://www.kaka996.com/pages/74c87a/#crossprocess

后端：gaia-workflow
前端编辑器：workflow-editor
前端管理端：workflow-manage

目标：使用electron构建桌面版，集成后端，集成前端
效果：在mac os上用户仅需点击程序即可完成所有操作，不需要安装其他环境

## 项目修改操作
1. 修改package.json和cmd/bin.js文件，将前端编辑器和管理端的打包和测试替换原本的frontend
2. 修改electron/preload/lifecycle.js和electron/main.js 完成服务端的自启动和loading动画加载，及服务端启动完毕后才加载前端页面
