# 画布自动布局收口：后端 ELK layered（2026-10-29）

## 问题

用户实测：AI 生成的画布「打开就一坨」。根因不是后端没有布局代码，而是三处硬伤：

1. **尺寸失配（数学上必然重叠）**：画布真实节点宽 360（llm/http/code 高 390），
   旧后端布局步长 X=320/Y=200、碰撞盒 240×120 —— 同列两个 llm 节点垂直重叠 190px，
   相邻列水平重叠 40px（`WorkflowDslCanonicalizer` 旧 autoLayout / `CanvasPlacement` 旧常量）。
2. **层内按插入顺序堆叠**：无交叉最小化、无子树聚拢，分支图连线大量交叉。
3. **触发面窄**：`autoLayoutIfUntouched` 只在包围盒宽高比 ≥6（一字长蛇阵）时重排，
   宽扁乱图永远漏网；旧前端 `normalize-dsl.ts`（缺坐标才布局）实际无调用方，
   编辑器初始化自动布局被注释 —— 后端给什么坐标画布就渲染什么。

## 行业对标（2026-10-29 核查）

| 产品 | AI 生成/导入坐标来源 | 整理能力 |
|---|---|---|
| n8n AI Builder | 构建器直接写 [x,y] 列距启发式（~200/140px），无布局引擎，社区长期抱怨布局乱 | 清理视图 |
| Dify | 坐标存 DSL/模板（人工排好），AI 不产坐标 | 前端整理节点 = dagre |
| Coze Studio | 模板带坐标（同 FlowGram 栈） | FlowGram 插件 = dagre |
| Langflow | — | 前端 elkjs（ELK layered ^0.9.3） |

共识：不让 LLM 输出坐标（语义生成与几何布局分离）；坐标在数据落盘时即存在；
质量天花板是 ELK layered（Sugiyama 五阶段 + 端口约束 + 真实节点尺寸）。

## 决策（方案 A，用户确认）

后端接入 ELK layered（`org.eclipse.elk:org.eclipse.elk.core|alg.layered:0.10.0`，
纯 Java headless，EPL-2.0；guava 显式钉 33.3.1 —— elk.graph 声明的是 [15.0,) 开区间）。

- **引擎**：`gaia-workflow-app/.../service/WorkflowLayoutEngine.java`。
  尺寸表镜像 `apps/console/src/nodes/<type>/index.ts` 注册表（唯一事实源在前端，
  NC-01；`WorkflowLayoutEngineNodeSizeContractTest` 直接解析 TS 源码断言一致防漂移）。
  condition/branches 用 ELK 端口约束（EAST 按声明顺序）；节点按 id 排序建图 + 固定
  RANDOM_SEED → 确定性；ELK 异常时回退内置简单分层，布局永不阻断落版链路。
- **接线点**：① canonicalize 缺坐标兜底；② `autoLayoutIfUntouched`（保留
  layoutUserTouched 让位语义，删除 ratio≥6 门槛 —— 确定性保证已整理的图不跳）；
  ③ agent `autoLayout` 工具；④ `CanvasPlacement` 搭建期增量落点步长修正为
  520/470、碰撞盒 360×390（只保不重叠，美观交给 run 结束重排）。
- **前端清理**：删除无调用方的 headless 布局链 `document/layout.ts` +
  `normalize-dsl.ts` + `WorkflowDocument.autoLayout` + CanvasBinding/CanvasContext
  的 autoLayout 契约（P-07：不并行维护两套布局定义）。手动「自动整理」按钮保留
  FlowGram 内置 dagre（tools.autoLayout，真实尺寸 + 动画，与后端 ELK 各自可用）。

## 边界与未决

- loop 容器内 blocks（渲染层生命周期）v1 不参与布局，容器当叶节点。
- force=false（只补缺失坐标）沿用旧语义：已有坐标不动，可能与补位坐标局部交叠
  （部分缺坐标是罕见输入）。
- 手动整理（dagre）与 AI 产物（ELK）布局风格存在差异，未收到一致性诉求前不统一。
- 未验证：真实模型端到端生成后的画布目测、存量草稿重开回归。

## 验证

见 `specs/node-contracts/status.md` 2026-10-29 条目。
