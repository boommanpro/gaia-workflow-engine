# 任务与验收

全部完成于 2026-10-29。

- [x] 前端规则单一化：`apps/console/src/nodes/derived-outputs.ts`（deriveConditionOutputs / deriveBranchesOutputs /
      fieldsOfDerivedOutputs）；`document/upstream-variables.ts` condition/branches 分支改用同一函数。
- [x] 前端画布接入：condition/branches `form-meta.tsx` 增加 `createEffectFromVariableProvider` effect
      （派生 schema 进 FlowGram 变量引擎，变量选择器与 `{{ }}` 模板校验同源可见）+ formatOnSubmit 物化 outputs。
- [x] 后端派生物化：`NodeDataNormalizer.normalize` 新增 condition/branches case（deriveBooleanOutputs 整体重算、幂等）；
      canvas 回推 / agent add/update / canonicalize 全部入口自动覆盖（SessionWorkflowDraftService 既有 normalize 调用点）。
- [x] 契约放行：condition.schema.json / branches.schema.json 增 outputs 属性（严格 boolean 形状 + 派生字段说明）；
      node-catalog/defaults.json condition/branches 补 `outputs:{type:object,properties:{}}`（前端模板经共享 import 自动跟随）。
- [x] 三端空名口径统一：`WorkflowDslValidator.inferOutputFields`、`ConditionNode/BranchesNode.getOutputParameters`
      跳过空 key/分支 id（与 canonicalizer legalPortsOf 同口径）。
- [x] 跨端 parity 契约：`specs/node-contracts/fixtures/dynamic-node-outputs.json`（6 组样例）；
      后端 `NodeDataNormalizerDynamicOutputsContractTest` 4 项（归一化=运行时 getOutputParameters=inferOutputFields 三层相等 +
      幂等 + 物化产物过严格 schema + canonicalize 为存量无 outputs 草稿补齐）；
      前端 `nodes/__tests__/derived-outputs.test.ts` 引用同一份 fixture。
- [x] 规范落地：spec.md NC-06 增补动态输出物化条款；checklist.md 增加动态输出三端核对项；status.md 记录实现证据。

## 验收命令与结果（2026-10-29 实测）

```bash
# 后端全量
cd apps/api/gaia-workflow && mvn -pl gaia-workflow-app -am test
# → 383 tests, 0 failures, 0 errors, 1 skipped（既有跳过）——BUILD SUCCESS

# 前端全量
cd apps/console && npx vitest run
# → Test Files 26 passed, Tests 181 passed

# 类型检查（改动文件 0 错误；30 个既有错误均在未改动文件：ModelManagement.tsx 等 9 个已提交文件）
cd apps/console && npm run ts-check

# Lint（本次改动文件）
cd apps/console && npx eslint src/nodes/derived-outputs.ts src/nodes/condition/form-meta.tsx \
  src/nodes/branches/form-meta.tsx src/document/upstream-variables.ts src/nodes/__tests__/derived-outputs.test.ts
# → 0 errors, 0 warnings
```

## 未验证范围

- 浏览器端到端：真实画布打开 condition 草稿、下游节点变量选择器选 `if_pass`、模板引用不再报 Unknown——
  本环境无运行服务，未实测；由前端 vitest（规则层）与 ts-check（类型层）覆盖到 pure function / form-meta 声明层。
- `wf_087b971f1357` 真实草稿的全链路（模型生成引用 → 打开 → 试运行 → 发布）未回归。
- 存量库 condition/branches 草稿的物化补齐规模统计未执行（触达保存/归一化入口时自动补齐）。
