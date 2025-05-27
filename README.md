## flowgram-ai-rule-engine

### ① 项目定位

一个可视化的规则引擎前端画布程序，期望具备以下功能
1. 代码节点
2. 分支节点
3. 测试运行
4. 配套的java后端
5. 可以微前端或者web-components运行，进而支持跨前端语言

### ② 为什么会基于flowgram.ai再次开源一个项目？

官方的demo-free-layout更新较慢，提PR再使用较慢，并且不适用于我的场景。

### ③ 功能介绍
link: https://boommanpro.github.io/flowgram-rule-engine/

在官方版本的基础上实现以下功能

1. 新增code节点
2. 增加note节点，仿官方注释功能
3. 增加全局导入和导出功能
4. 新增单个节点支持增加注释和注释修改，节点名称修改功能
5. 增加单个节点的运行和导出节点内容功能
6. 优化组件变量能力
7. condition组件优化
   - 支持false功能
   - 支持left和right的表达式功能
   - 支持与和或的功能

感兴趣的同学可以一起二次开发，服务端（Java版本）后续会开放出来，敬请期待

## 时间线

2025.5.27 重构代码分支，该代码仅维护apps/demo-free-layout目录，其余和官方保持一致

截图如下:

![img.png](images/img.png)
