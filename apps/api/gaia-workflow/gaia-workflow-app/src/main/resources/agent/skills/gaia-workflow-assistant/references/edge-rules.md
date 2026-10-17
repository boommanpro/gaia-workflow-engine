# 出边铁律（violate = 运行必然失败）

- fromPort 必须用 conditions[].key / branches[].id / else
- 绝不能写 true/false——端口匹配不到时下游全 canceled 但状态仍 succeed
- 每个声明的 key 必须有出边（否则该场景静默不执行）
- else 兜底出边强烈建议（未命中时下游不执行=结果为空）
- 正反两组输入都要 run(target=workflow, inputs) 验证：未命中分支的下游会出现在 notExecuted 里
