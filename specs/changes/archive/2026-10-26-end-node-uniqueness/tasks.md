# 任务与验收

全部完成于 2026-10-26。

- [x] 后端 `WorkflowDslValidator` 新增 `MULTI_END` error（`gaia-workflow-app/.../service/WorkflowDslValidator.java`）。
- [x] 后端 `SessionWorkflowDraftService.addNode` 拒绝第二个 start/end（`.../agent/session/SessionWorkflowDraftService.java`）。
- [x] 前端 `document/validate.ts` 新增 `MULTI_END` error；`utils/wujie-communication.ts` 宿主添加入口加唯一性守卫。
- [x] 提示词 `agent/prompt-workflow-architect-{zh,en}.md`、知识种子 `seed/node-knowledge.json` end 条目措辞同步。
- [x] 规范：`specs/node-contracts/spec.md` NC-06 明确 end 唯一；`status.md` 记录实现证据。

## 测试

- 新增 `WorkflowDslValidatorTest.multiEnd`（两个 end → MULTI_END；分支汇合单 end 零 error）。
- 新增 `SessionDraftStartEndUniquenessTest`（4 项：第二个 end/start 被拒、删后可再加、其他类型不受限）。
- 新增前端 `src/document/__tests__/validate.test.ts`（5 项：MULTI_END / 汇合 valid / MULTI_START 与 NO_END 口径不变 / `WorkflowDocument.addNode` 守卫）。

## 验收命令与结果

```bash
# apps/api/gaia-workflow
mvn -B -pl gaia-workflow-app -am test
# → Tests run: 334, Failures: 0, Errors: 0, Skipped: 1（既有跳过），BUILD SUCCESS

# apps/console
npx vitest run            # → 19 files / 129 tests passed
npx tsc --noEmit          # → 29 个既有错误，全部位于本次未改动文件（ModelManagement.tsx 等）；改动文件 0 错误
```

## 未验证

- 浏览器端到端（画布上通过 AI 对话触发第二个 end 的实际回执展示）未做。
- 存量数据库中多 end 的历史版本未扫描统计。
