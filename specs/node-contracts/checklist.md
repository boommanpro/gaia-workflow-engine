# 节点开发检查单

每次新增或修改节点，复制适用项到变更任务；不适用项说明理由，不能仅机械勾选。

## 修改前

- [ ] 阅读本目录 spec.md 与 status.md，确认现有资源位置和未实现边界。
- [ ] 检查工作区改动，不覆盖其他任务；核实注册、Schema、默认值、执行器和 AI 消费入口。
- [ ] 判断是否改变持久化形状、引用语义、端口或执行结果；破坏性变化先提出迁移与版本方案。

## 定义与实现

- [ ] 在现有目录登记能力与 Schema，不另建类型名单。
- [ ] 只在 node-schemas 修改字段约束，只在共享 defaults 修改默认数据。
- [ ] 画布 onAdd 复用默认值，保留必要 ID、布局和标题行为。
- [ ] 执行器实际支持所有宣称的枚举、绑定和输出；未支持能力不对 AI 宣传。
- [ ] 复杂 UI 可以专用，但不维护独立参数协议。
- [ ] 不在提示词复制字段表，不写凭证，不增加未知类型回退和静默修复。
- [ ] 数组替换、深拷贝、规范化幂等、端口与作用域变化有明确处理。

## 验证

- [ ] 有效配置、缺字段、错类型、非法枚举、未知类型、默认数据隔离均有测试。
- [ ] 输出、控制流、引用或容器变化有整链/子图回归，不仅测试独立解析器。
- [ ] AI 知识查询不依赖散文是否存在，且返回规则与运行校验同源。
- [ ] 有前端创建、保存重开、运行入口相关验证；无环境时明确列出未验证范围。
- [ ] 类型检查、单测和构建分别报告；不以其中一项替代另一项。

## 命令入口

在 apps/console 中运行：

```bash
npm test -- src/agent/node-templates/__tests__
npm run ts-check
npm run build
```

在 apps/api/gaia-workflow 中运行：

```bash
mvn -B -pl gaia-workflow-app -am -Dtest=NodeCatalogTest,GetKnowledgeCatalogTest,NodeKnowledgeContractTest,NodeSchemaBadcaseCorpusTest -Dsurefire.failIfNoSpecifiedTests=false test
```

这些是当前测试入口，不表示覆盖所有改动；执行语义、发布和迁移变化必须增加对应测试。类型检查曾有失败记录，不可不运行就假定本次错误都是历史问题。

## 交付

- [ ] 更新 status.md 的实现证据及未完成项；原则改变时按 changes 流程更新规范。
- [ ] 报告实际命令与结果，不复用旧测试数字充当本次结果。
- [ ] 未经授权不提交、不部署、不清库；保留迁移前数据与用户已有改动。
