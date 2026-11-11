# 项目规范

本目录是 gaia-workflow-engine 的长期开发规范入口，不存放运行时节点 JSON，也不替代测试。根目录 [AGENTS.md](../AGENTS.md) 引导代码智能体读取这里。

## 阅读顺序

1. [开发原则](principles.md)：跨模块约束。
2. [节点契约规范](node-contracts/spec.md)：带稳定编号的规则及验收场景。
3. [开发检查单](node-contracts/checklist.md)：新增、修改节点时的操作门禁。
4. [实施状态](node-contracts/status.md)：当前已接入范围与未实现能力。
5. [变更管理](changes/README.md)：改变规范时如何提出、实施和归档。

## 存放约定

```text
AGENTS.md
specs/
  README.md
  principles.md
  node-contracts/
    spec.md
    checklist.md
    status.md
  changes/
    README.md
```

- spec.md 是已批准的要求；每条标注立即适用或目标约束，不能将规范存在当成实现完成。
- status.md 记录实现证据，不复制规范正文或长期保存易漂移的字段枚举。
- changes 下按变更建目录；不为已批准的目录接入重新虚构待批准提案。
- 历史调研与实施记录不再保留在仓库（docs 目录已于 2026-11-08 移除），需要时从 git 历史检索；代码注释中的文档名引用按历史出处理解。
- 运行时节点定义继续位于后端 resources/node-catalog 和 node-schemas；没有批准迁移前不再新增平行 contracts 目录。

## 冲突处理

本规范约束后续代码修改。代码说明当前行为，测试提供已验证证据，status.md 说明差距；三者冲突时必须显式核实，不能用规范覆盖事实，也不能以旧实现为理由绕过原则。历史 docs 中与当前规范冲突的建议不得直接作为新代码依据。规范变更需记录理由、影响、测试与批准状态。

## 开源参考与本项目选择

2026-10-24 核查官方文档，以下是目录组织参考，不是宣称本项目已安装对应工具。来源为移动文档，后续采用 CLI 时需再次核对版本。

| 参考 | 官方组织方式 | 本项目采用部分 |
|---|---|---|
| OpenSpec | openspec/specs 保存系统规范，openspec/changes 保存提案及增量规范，完成后归档 | 长期规范与变更过程分离 |
| GitHub Spec Kit | .specify 存原则、模板和脚本；根 specs 存功能 spec、plan、tasks 等 | 根 specs 作为可发现入口，原则与领域规格分层 |

本项目使用轻量自有约定，既不是 OpenSpec CLI 目录，也不是完整 Spec Kit 工程。不增加空配置、命令文件或工具依赖。根 AGENTS.md 是本项目的通用选择，不是把旧版 OpenSpec 入口当作其当前要求。

官方来源：
- https://openspec.dev/docs/setup
- https://openspec.dev/docs/quickstart
- https://openspec.dev/docs/supported-tools
- https://raw.githubusercontent.com/Fission-AI/OpenSpec/main/docs/migration-guide.md
- https://raw.githubusercontent.com/github/spec-kit/main/templates/plan-template.md
- https://github.github.io/spec-kit/guides/evolving-specs.html
- https://github.github.io/spec-kit/quickstart.html

历史背景：节点契约完整架构设计（2026-10-24）与首批实施记录原存于 docs/ 目录（gaia-node-contract-architecture-design-2026-10-24.md、node-catalog-p1-implementation.md），该目录已于 2026-11-08 整体移除，需要时从 git 历史检索。
