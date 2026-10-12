# Agent 行为 Benchmark（提示词 & 知识库的质量回归）

> 核心理念（对标 dsh）：**不搞 LLM 打分，把提示词/知识当"带 golden 的回归资产"**。
> 每次修改提示词、知识条目、校验规则后跑一遍，分数不回退。

## 组成

| 组件 | 命令 | 成本 | 防什么 |
|---|---|---|---|
| 静态 gate | `python3 scripts/benchmark/knowledge-gate.py` | 毫秒级 | 知识条目旧教学回归（true/false 出边、multi-condition、start inputs / end outputs 反义术语）、提示词关键教学缺失 |
| 行为任务集 | `python3 scripts/benchmark/run-benchmark.py` | 每任务约 1-3 分钟（真模型） | 端到端行为回退：轮次膨胀、结构错误、输出错误、AI 落版违规 |

## 静态 gate

- 扫描 `seed/node-knowledge{,-en}.json` 与 `agent/prompt-{zh,en}.md`
- 黑名单来自实证事故（每条都对应一次真实翻车，见 `gaia-agent-reliability-diagnosis` 记忆）
- 中英条目集合必须一致
- **新增知识条目时同步在 gate 里加该条目的结构断言**

## 行为任务集

任务定义在 `e2e-tasks/*.json`。字段：

```jsonc
{
  "name": "contains-check",
  "message": "发给 agent 的用户原话",
  "limits": { "maxToolCalls": 30 },
  "structure": [                       // 最终草稿结构断言
    { "check": "noEmptyNodes" },       // 无空壳节点
    { "check": "endHasInputs" },       // end 有 inputsValues
    { "check": "edgeFromPortIn", "ports": [...] }  // fromPort 白名单
  ],
  "expectOutputs": [ { "result": true }, { "result": false } ]  // 试运行输出断言
}
```

评分口径（结果 JSON，`/tmp/gaia-benchmark-result.json`）：
`passed / toolsUsed / runsUsed / warnings / structureOk / outputsOk / versionsCreatedByAi`

基线对比：`--baseline previous.json`（轮次 +5 以上或警告数回退则 ⚠）。
LLM 非确定性：正式回归建议每任务跑 2-3 次取通过率。

## 何时跑

- 改 `prompt-zh.md` / `prompt-en.md` / `seed/node-knowledge*.json` / `WorkflowDslCanonicalizer` / 工具 schema 后
- CI 里先跑静态 gate（毫秒级），行为集按需手动/夜间跑
