# Gaia 节点契约与 AI 生成体系重构设计

日期：2026-10-24。状态：总体方案已批准，首批目录接入已实施，其余阶段未完成。本文保留设计时的调研快照；其中缺陷与路径描述不自动代表最新状态，也不代表批准清库或改写已有工作流。

长期开发约束见 [项目规范](../specs/README.md)，实际完成边界见 [实施状态](../specs/node-contracts/status.md)。后续 AI 编码从根目录 AGENTS.md 开始，不将本文的历史盘点当作当前验收结论。

## 1. 决策摘要

推荐采用“版本化节点契约包 + 多端适配 + 统一编译校验 + AI 工具闭环”，而不是继续扩充提示词，也不是替换 FlowGram 或 Java 引擎。

核心原则：统一业务事实，不强迫所有节点拥有相同字段，不把 UI、执行逻辑和业务知识全部塞进 JSON Schema。

- 节点字段、默认值、端口、输出、能力和可执行样例归属一个节点契约包。
- 前端负责编辑体验，后端负责权威校验与执行，AI 消费契约而不另维护字段规则。
- 画布数据结构保留 FlowGram 的 id/type/data/meta/blocks/edges；第一阶段不重命名全部业务字段。
- 草稿允许缺少待填参数，但不允许结构损坏；运行和发布必须经过相同的严格门禁。
- 显式区分 DSL 格式版本、节点契约版本、草稿修订号和发布版本。
- 用可重放测试衡量生成质量，不用“JSON 合法”或“模型说成功”代替业务成功。

## 2. 调研范围和证据边界

本次只读分析当前工作区，包含已有未提交修改，基准最近提交为 ba727956；没有运行服务、读取实际数据库或执行测试。以下缺陷为静态路径证据，涉及并发、第三方编辑器显示及线上知识漂移的结果仍需复现。

已有 docs/gaia-node-schema-governance-plan.md 记录过严格化和零兼容决策，但其历史盘点与当前源码不同。本文以当前代码为准，不重复将已完成的 Schema 严格化列为从零建设，也不继承旧文档的清库授权。

开源对标为本次读取的官方 main/master 源码与文档，不等于稳定发行版能力；未取得三个项目统一的固定提交快照。实施前必须固定参考提交和依赖版本。

## 3. 当前架构到底是什么

### 3.1 四套相互协作、尚未统一的定义

| 层 | 当前权威位置 | 负责什么 | 尚未统一的部分 |
|---|---|---|---|
| 画布 | apps/console/src/nodes、form-meta | 注册、控件、端口、默认值、容器 | 节点独立手写，继承默认校验方式不同 |
| 参数契约 | 后端 resources/node-schemas | 16 类节点 data 的 Draft-07 约束 | 不能完整覆盖图、引用作用域、执行语义 |
| 引擎 | ChainParserManager、各 NodeParser、Chain | 解析、绑定、调度、运行输出 | 参数读取与表单/Schema 不完全一致 |
| AI | 工具定义、知识种子、技能文件、提示词、模板 | 选节点、生成参数、改图、试跑 | 同一字段和行为仍在多处描述 |

前端画布注册 18 类；AI 可生成 12 类；后端枚举 19 类，其中 4 类标注节点不解析，其余 15 类注册解析器；参数 Schema 为 16 类。数量不同并非天然错误：可执行、仅容器内部、仅编辑展示、允许 AI 创建应当是显式能力，而不是要求清单数量相等。

### 3.2 代表节点的现状

| 类型 | 当前主要参数 | 关键语义 |
|---|---|---|
| start | outputs | 声明工作流输入 |
| end | inputs、inputsValues | 绑定工作流输出 |
| llm | inputsValues 中 prompt/modelName 等、timeout | 特定字段支持模板，固定 result 输出 |
| http | api、headersValues、paramsValues、body、timeout | 并不采用与 LLM 相同的字段路径 |
| code | script、inputs、inputsValues、outputs | 输出声明影响对执行结果的提取 |
| condition/branches | conditions 或 branches | 动态端口参与控制流 |
| loop | data.loopFor/loopOutputs；节点级 blocks/edges | 子图、局部作用域、循环控制 |
| variable | assign | 变量赋值与输出推断 |
| workflow | workflowId、inputs/outputs/inputsValues | 当前存在按子流程当前版本解析的行为 |

这些差异可以保留。问题不是 http 和 llm 的字段名不同，而是多个地方各自解释同一个字段。

### 3.3 目前已有的基础

- NodeSchemaRegistry 将同源契约用于参数校验和 AI knowledge 返回。
- 前端 contract.test.ts 直接读取后端 Schema，检查部分模板与类型清单。
- NodeDataNormalizer、WorkflowDslValidator、WorkflowDslApplyService 已有规范化、图校验和落版机制。
- 工具已能返回 issues/fixHint，试跑有失败节点及测试产物。
- AI 修改会话草稿；正式发布目前由用户保存触发，不能与历史自动保存工具混淆。

因此应增量收敛现有模块，而不是另建一套并行系统。

## 4. 问题与优先级

| 优先级 | 静态证据 | 设计上的处理 |
|---|---|---|
| P0 | 前端 normalize.ts:54–64 先删除 body/timeout 再判断是否规范 | 取消生产路径重复归一化，立即补幂等回归 |
| P0 | DraftRunService 与 WorkflowDslApplyService 使用不同校验组合 | 运行、测试、发布共用 CompileService |
| P0 | 校验把孤立节点视为不执行，Chain 却启动所有零入度节点 | 明确唯一入口及可达执行计划 |
| P0 | 循环子图未获得顶层等价校验，未知内部节点可能被跳过 | 递归编译、局部符号表、未知类型拒绝 |
| P0 | 通用引用读取仅取前两段，变量赋值输出映射另有路径 | 统一绑定解析器和输出验证 |
| P1 | NodeSchemaRegistry 缺文件/加载异常后继续放行 | 可执行节点缺契约时启动失败 |
| P1 | node add 首错软放行，update 更严格 | 改成显式草稿/执行状态，不按错误次数决定合法性 |
| P1 | get variables 将非当前节点近似作上游 | 使用编译器作用域服务 |
| P1 | 知识库只补缺，契约却随部署升级 | 生成内容与人工覆盖分层、哈希冲突管理 |
| P1 | 保存基准取保存时 revision，版本可原地修改 | 贯通读取时 revision，发布快照不可变 |
| P1 | 边去重忽略端口、数组 merge 语义不一致 | 统一命令协议及数组整体替换规则 |

“提示词太多”只是表象。更直接的原因是正确性规则没有唯一归属，模型收到的文档、执行反馈和编辑器行为不一致。

## 5. 开源对标与采用边界

| 项目 | 已核实事实 | 建议借鉴 | 不直接照搬 |
|---|---|---|---|
| FlowGram 框架 | registry/formMeta 支持渲染与校验分离，data 由业务定义 | 保留画布扩展和变量组件 | 不能认为框架自动统一了后端业务语义 |
| FlowGram Desktop | 官方仓库中的 React/Tauri 2/Rust 应用；前后端共享 atomic-nodes.json，包含字段、默认值、输入输出和副作用；支持按需查契约及运行前验证 | 节点目录作为共同来源，按需暴露完整契约，运行入口强制门禁 | 不迁移到 Rust；目录 version 不等于完整旧版本执行器绑定 |
| Dify | 前端节点专用配置与后端类型/版本模型；当前主分支有规划、节点构建、后处理和结构检查的生成器 | 规划与参数构建分离、结构化错误 | 不复制前后端双份字段定义；版本解析的 latest 回退不适合本项目严格复现目标 |
| n8n | 节点实例 typeVersion，节点描述驱动参数 UI；AI Builder 有结构、配置及综合校验 | 节点版本锁定、描述驱动基础表单、分层校验 | 不引入全部节点插件生态及自有表达式语言；部分 AI Builder 源码属于 .ee，需审查许可证 |

本方案是对这些机制的组合设计，不宣称任一项目已经完整实现本方案，也不依据源码可见性判断可直接复制许可证受限实现。

## 6. 三种方案比较

### A. 继续加固现有 Schema 和提示词

优点：局部变化小；短期能消除一批坏例。缺点：表单、执行器、知识、变量语义仍多点维护，新增节点成本没有根本下降。适合作为阶段零止血，不适合作为终态。

### B. 节点契约包 + 多端适配 + 统一编译器（推荐）

优点：保留 FlowGram/Java 投资，契约集中，复杂节点仍可定制，能逐节点迁移。代价：需要目录构建、编译边界、公共变量服务和契约测试，不能只修改几个 JSON 文件。

### C. 整体替换为外部工作流引擎或全面重写 DSL

优点：可直接利用目标生态。代价：执行语义、部署、权限、历史数据、UI 和许可证影响很大；不能自动解决自身节点质量。当前不推荐。

## 7. 目标架构与职责

节点契约源 → 构建和一致性验证 → 不可变目录产物 → 前端适配 / AI 契约查询 / 后端编译与执行。

| 单元 | 唯一职责 | 输入与输出 | 不能做的事 |
|---|---|---|---|
| NodeCatalog | 解析指定 type/version 的定义 | 节点键 → 契约包 | 不执行工作流 |
| FrontendAdapter | 契约映射 FlowGram 注册与表单 | 契约、草稿 → UI、编辑命令 | 不发明字段默认值 |
| WorkflowCommandService | 原子应用编辑命令 | revision、命令 → 新草稿、差异 | 不执行有副作用节点 |
| WorkflowCompiler | 结构、语义、图和作用域检查 | 文档、目录 → ExecutionPlan 或 issues | 不请求模型和外部业务接口 |
| BindingResolver | 解析常量、引用、模板 | 已编译绑定、运行上下文 → 类型化值 | 不执行任意表达式代码 |
| NodeExecutor | 一个节点版本的运行行为 | 类型化输入、配置、上下文 → 输出 | 不直接修改定义 |
| AIGenerationService | 规划、查契约、改草稿、消费反馈 | 用户目标、工具结果 → 编辑命令 | 不绕过门禁直接写正式版本 |

复用现有 WorkflowDslValidator/ApplyService/NodeToolExecutor，通过抽取职责演进，避免“新旧两套服务永久并存”。

## 8. 节点契约包设计

### 8.1 建议目录

contracts/nodes/<type>/v<version>/ 下包含 definition.json、data.schema.json、ui.json、examples、tests，以及可选迁移声明。

共享结构位于 contracts/common；生成输出进入前端 generated 目录及后端构建资源，不手工编辑生成结果。前端路径继续使用 apps/console。

先沿用 Draft-07，公共引用采用 definitions 和本地 $ref；不在未验证工具兼容性前混用新草案的 $defs 关键字。构建时打包引用，运行期禁止远程解析 $ref。

### 8.2 契约分层

| 层 | 内容 | 消费方 |
|---|---|---|
| 身份与能力 | type/version、执行/展示/容器、可生成、允许父容器 | 全端 |
| dataSchema | 节点持久化业务字段，严格未知字段规则 | 前端验证、后端、AI |
| defaults | 无副作用、无虚假业务值的初始配置 | 前端与 AI 创建 |
| ports | 静态端口或动态端口解析器标识 | 连线 UI、编译器 |
| outputs | 静态输出或动态输出解析器标识 | 变量 UI、引用检查、输出检查 |
| bindings | 允许绑定的字段路径、常量/引用/模板模式 | 编辑器、编译器、执行器 |
| semantics | 作用域、控制流类型、副作用、超时重试能力 | 编译器与运行策略 |
| ui | 分组、控件、可见条件、国际化键 | 前端适配器 |
| ai | 用途、边界、示例引用，不重写字段约束 | 契约工具 |
| fixtures | 完整有效例、缺字段例、边界例、执行断言 | 自动测试 |

动态逻辑通过白名单 resolver ID 指向版本化代码，不在 JSON 中嵌入 JavaScript 或 Java。数据结构可生成，算法不能假装靠 Schema 自动完成。

### 8.3 默认值与有效样例不能混为一谈

- 新建 HTTP 节点可以缺 URL；这意味着草稿尚未配置，不应偷偷补一个可请求的网址。
- defaults 只能保证结构合法；examples/valid 必须通过完整参数与语义检查。
- 字段 required 仍只有一套声明；缺失业务字段在 draft 模式标记 incomplete，在 runnable 模式为 error。字段类型错误或未知字段在两种模式都拒绝。
- 不再维持“人一套、AI 一套”的业务 Schema；模型接口不支持完整 JSON Schema 时仅降级传输表达，后端权威校验不降级。

草稿降级采用契约中的显式 incompletePaths 与公共错误码白名单，不根据自然语言推断：仅业务字段缺失、尚未连通、缺起止节点、未选择凭证可降级；已有值的类型、包装判别字段、未知字段、重复 ID、未知版本、悬空边/引用、非法容器、无权限引用均为硬错误。动态端口尚不可推导时不允许连到假定端口；前端未完成的输入留在本地表单缓冲，创建端口与连线作为同一事务提交。普通图环和已确定的类型不兼容始终拒绝。每个降级错误须有 draft/runnable 双模式测试。

### 8.4 新增一个节点的开发契约

开发者提交一个节点包、一个执行器、必要的专用控件和通过的 fixtures。不得再手改全局类型枚举、AI 节点类型散文、静态输出映射及另一份默认模板。

CI 检查目录、前端适配器、执行器注册一一符合能力要求：展示节点不要求执行器，内部控制节点必须受父容器约束。未实现的能力不得向 AI 宣传。

## 9. 文档、版本与运行模型

### 9.1 文档格式

保留现有 nodes/edges/globalVariable 与节点级 blocks/edges。增加 schemaVersion 和节点 typeVersion；编辑布局继续放 meta。contracts 的 catalogDigest 随发布和运行记录保存，不要求每次拖动画布都改变业务版本。

新格式需增加明确的扩展区，不能靠放宽全部 additionalProperties 保留未知业务字段。第三方画布元数据先由适配器隔离。

### 9.2 四类版本

| 字段 | 含义 | 变化条件 |
|---|---|---|
| schemaVersion | 工作流文档格式 | 容器、引用或顶层结构变化 |
| typeVersion | 节点行为和契约 | 参数、输出或执行语义不兼容变化 |
| revision | 可变草稿并发控制 | 每个成功编辑事务 |
| releaseId | 不可变发布快照 | 用户正式发布 |

未知节点版本直接拒绝执行，不静默使用 latest。新节点选当前推荐版本；已发布节点保留原绑定。单纯标签翻译不增加执行版本，但产物摘要可变化。

发布另保存 executionLock：逐节点的契约、默认值、动态解析器和执行器产物摘要，以及全局 compilerVersion、bindingSemanticsVersion、runtimeArtifactDigest。运行必须解析该锁定产物，历史产物不可原地覆盖；缺失时拒绝运行或显式升级为新发布版本。语义修复即使保持字段兼容，也必须产生新产物身份。UI 内容摘要与执行摘要分离。保留旧运行产物不意味着允许已撤销权限或存在安全风险的版本继续执行；此类版本可以禁用，但不能静默替换。该机制保证内部语义可追溯，不承诺外部 API 和模型输出确定性。

### 9.3 定义与运行实例分离

- WorkflowDefinition：不可变业务定义。
- ExecutionPlan：经编译的入口、依赖、作用域、端口、绑定和执行器版本。
- RunContext：每次运行独立的变量值、状态、取消信号与报告。
- 不缓存带运行状态的 ChainNode 作为可重用定义；先用执行计划适配现有 Chain，逐步收窄旧模型职责。

### 9.4 执行语义必须先定下来

- 顶层唯一 start，入口不再是任意零入度节点；展示节点不参与执行。
- 顶层 end 明确工作流结果，不再以最后完成节点覆盖整流结果。
- 未连接的可执行节点在草稿允许，在运行/发布时报错；后续若支持禁用节点，必须有显式字段与语义。
- 普通图禁止环，循环只通过 loop 容器表达；子图同样递归检查。
- 分支后引用必须证明该输出在当前位置可用；仅拓扑上“存在上游路径”不等于所有分支都赋值。无法证明时要求显式合流/默认值策略，不静默变 null。
- 暂不引入新 join 节点；第一版拒绝不安全的分支跨引用，合法合流场景通过现有明确绑定表达。

## 10. 绑定、端口与变量统一

第一阶段继续使用 constant/ref/template 的既有标准包装，不再新增 AI 扁平简写；历史转换只留在显式导入适配器，并返回迁移报告。

ref 路径保留数组表达，支持对象深层路径和数组索引的明确规则；节点、全局、循环局部引用由作用域符号表区分，缺失与 null 分开处理。若新增 scope 标记或改变老路径解释，必须提升 schemaVersion，不靠猜测兼容。

模板仅绑定已批准的变量引用。代码与已有表达式语言属于明确节点能力，不允许通用绑定解析器执行任意 SpEL 或脚本。

可见变量接口必须接受 nodeId、容器路径和草稿 revision；同时返回类型、必达性、来源和可空性。前端选择器、AI get(variables)、单节点试跑面板都消费同一语义结果，前端可缓存而不另写推断分支。

边身份包含 fromNode、fromPort、toNode、toPort；动态端口由条件/分支 ID 推导。重命名端口以事务同时更新边，删除端口若存在引用则返回影响列表，不静默丢线。

输出解析器用于编译期推断；执行器返回值仍需按最终输出 Schema 验证。不能把代码节点声明 outputs 视为它实际一定返回该字段。

## 11. 编辑与校验协议

### 11.1 编辑命令

保留 node/edge 工具名称作为兼容入口，内部统一转成版本化命令：addNode、updateNode、removeNode、connect、disconnect。后续增加批量事务，但不要求模型重写整张图。

命令携带 baseRevision 和 operationId。数组默认整体替换，对象字段按明确路径更新；不使用 lodash merge 的隐式数组索引合并。重放同 operationId 返回原结果，冲突不重复执行。

批量编辑先在隔离草稿上应用，完成后统一检查，再一次提交。允许同批次节点互相引用，避免逐条提交制造临时悬空引用。失败返回问题，不半应用。

### 11.2 分层校验

| 层 | 规则 | 是否可离线 |
|---|---|---|
| L0 | JSON、类型版本、唯一 ID、契约完整性 | 是 |
| L1 | dataSchema、值包装、枚举、字段类型 | 是 |
| L2 | 节点跨字段约束、端口和输出推断 | 是 |
| L3 | 递归图、入口、可达性、容器、引用作用域及类型 | 是 |
| L4 | 子流程版本、模型能力、凭证引用与权限 | 需要资源目录；不触发业务请求 |
| L5 | 隔离单节点及整流测试、业务断言 | 否；必须遵守副作用策略 |

validate、草稿 run、测试用例、任务执行、发布都调用同一编译链。不同阶段只允许明确的政策差异：发布不强制实时请求外部接口，但不能跳过 L0–L4；运行前重新校验当前权限，真实请求失败作为运行错误记录。

### 11.3 统一问题结构

每条问题包含 code、severity、stage、nodeId、containerPath、JSON Pointer path、expected、actualSummary、repairability、suggestion 和 contractVersion；附文档 revision，避免修复旧错误。

repairability 分为 deterministic、needs_model、needs_user、not_repairable。不得返回凭证明文及敏感实际值。

确定性修复只处理已证实不改业务意图的变换，如生成边 ID、布局和无歧义默认值；必须返回 before/after 差异。不得自动猜 URL、凭证、输出字段或用户业务条件。

## 12. AI 生成闭环

### 12.1 标准步骤

需求识别 → 简短执行计划 → 查询相关节点契约 → 原子修改草稿 → 编译校验 → 有限修复 → 测试与断言 → 展示证据和待配置项 → 用户发布。

规划只决定节点选择、依赖、输入输出和风险；参数构建使用选定版本的真实契约。初期仍用现有 Agent 工具循环，不马上引入多个 Agent；只有评测证明有收益，才考虑并行构建互不依赖节点。

### 12.2 工具面

- 扩展 get：提供精简目录、单节点完整定义、有效例、可见变量和能力限制。
- 保留 node/edge：全部进入统一命令服务，禁止直接写正式版本。
- 增加明确 validate 能力，返回全部相关结构化问题，不依赖真正运行才能知道字段错误。
- run/test_case：复用现有机制，运行入口仍自行编译，不能相信模型已经 validate。
- 模型支持严格结构化输出时启用；不支持时采用同一服务端门禁，不能把供应商 strict 参数当成可靠性保障。

### 12.3 修复预算

默认最多 3 轮修复，可配置；同错误码与字段路径连续两轮无进展则停止，向用户解释缺少的信息。预算按工具轮次、token、费用和测试副作用共同约束。

独立记录“结构有效、配置就绪、测试通过、业务断言通过”，不统一显示一个成功。存在凭证或真实样本缺失时标记待验证，不生成虚假的通过结论。

测试证据绑定 draftRevision、semanticDigest、executionLockDigest、测试输入摘要、断言版本及模拟/真实环境标识。业务字段、绑定、子流程或运行依赖变化后原证据保留为历史，但当前候选状态变为待重测；纯布局变化只有在 semanticDigest 不变时可复用，并明确标注原测试修订号。发布不强制外部真实测试，但不得把旧候选通过记录归给新候选。

## 13. 提示词与知识维护

### 13.1 三层内容

- 手工系统策略：任务边界、工具流程、安全与沟通方式；不列举各节点字段和枚举。
- 契约派生知识：字段、端口、默认值、示例和版本；构建生成，禁止数据库手改此部分。
- 手工领域知识：何时选择节点、业务模式、反例；只能引用契约标识，不复制参数表。

目标不是把所有知识删除，而是让“改一个字段”不再要求同时改中英文提示词、技能文件和节点种子。

### 13.2 数据库覆盖与同步

继续保留数据库加载优先和文件回退能力，但对内容分类：生成契约只读；人工策略允许覆盖。

每份人工覆盖记录 sourceHash、overrideBaseHash、contentHash、status。源更新且用户无修改时升级；双方均变化则标记冲突并展示差异，不静默覆盖。运行时采用最后已批准版本并提示过期；缺兼容契约则禁用对应节点，不混搭新旧版本。

AI 每次运行记录策略版本、契约 digest、模型配置引用和工具版本。日志保留完整结构用于调试，但密钥、敏感头和个人数据按策略脱敏。

## 14. 前端落地

- 保留 FlowGram 注册扩展点与 Semi 控件，不另造画布，也不把复杂表单强行改成通用 JSON 编辑器。
- 标量、枚举、绑定、超时等普通字段由 ui.json 生成基础控件。
- 条件、循环、代码、提示词和子流程使用专用控件；它们只负责 UI，仍写同一契约路径。
- 引用重命名、数组更新、默认值、错误提示和输出推断从节点私有代码上移到公共适配层。
- 前端生产校验应采用经验证支持 Draft-07 的实现；当前自实现测试校验器不能作为完整标准实现。具体库需在实施时检查依赖后选定。
- 服务端返回的目录 digest 与前端产物不一致时提示刷新并禁止不兼容编辑；离线仅可使用本地匹配版本，不能默默使用最新定义。

## 15. 发布、快照与并发

草稿继续可变，发布版本不可变；当前草稿镜像如暂时复用版本表，必须显式标记 kind 并与正式发布查询隔离，后续再迁出，不要求首期一次性拆全库。

读取草稿时保存 baseReleaseId、baseWorkflowRevision、draftRevision；编辑用 draftRevision，发布用读取时的 baseWorkflowRevision，不能发布时临时读取最新 revision 冒充基准。

发布请求同时携带 expectedDraftRevision。服务端先冻结该修订的不可变候选与内容摘要，对该候选编译；最终事务同时检查正式基准和草稿修订未变化，写入的必须是被编译的同一候选。任一变化即返回冲突，不能改为发布最新草稿。发布回执携带 publishedDraftRevision 与内容摘要；会话关联更新也使用条件更新，避免清除随后产生的新草稿。

版本号分配、插入快照、当前指针更新和 revision 增长在同一事务处理；冲突返回明确错误和可比较差异。主表 current_version_id 为唯一权威，冗余 is_current 删除或作为事务内派生缓存。

正式版本不允许原地改内容；修改必须新建版本。被当前指针或历史运行引用的版本不能直接硬删。

发布时锁定子流程 releaseId，运行记录保存实际主流程、递归子流程及契约快照摘要，并限制递归深度、检测调用环。凭证只存引用和版本标识，不把密钥复制进快照。

## 16. 安全与副作用

节点契约声明 pure/read/write/code 等能力，后端策略决定执行权限；这不是信任节点自行声明，执行器注册必须匹配审核后的能力。

- HTTP 节点通过现有网络策略或新增受控出口阻止 SSRF，处理重定向和私网目标校验。
- 凭证用 credentialRef/modelProfileRef 表达，运行时解密注入，AI 仅获可用标识和能力。
- 代码节点使用进程/容器级隔离、资源与时间限制；仅校验脚本字符串不构成沙箱。
- 测试默认模拟或只读；写操作需授权及幂等策略，不能为验证生成质量直接发送消息或修改业务系统。
- 取消定义为协作取消状态，不能把 Future.cancel 等同于外部请求已停止；报告区分请求取消和确认终止。

以上是接入约束，不要求本轮重构顺带实现完整新安全平台；缺隔离能力的节点在自动测试中禁用真实执行。

## 17. 分阶段实施与退出条件

| 阶段 | 工作 | 退出条件 |
|---|---|---|
| P0 固定基线 | 保存当前改动基线，复现高风险路径，补规范化/变量/子图/入口回归 | 有可重复失败例；不存在以旧文档代替当前验证 |
| P1 契约目录 | 收敛类型、默认值、输出、端口；先迁 http/llm/code/condition | 四类节点的人/AI 创建同源，缺契约不能运行 |
| P2 编译语义 | 公共编译入口、绑定解析、递归子图、动态输出、命令事务 | 相同文档在试跑/任务/发布得到一致硬错误 |
| P3 AI 与知识 | 按需契约、派生文档、显式校验、有限修复、提示词同步 | 不再手改字段散文，错误能定位修复，评测无退化 |
| P4 全量迁移 | 其余执行节点和展示节点分类、节点版本、正式发布事务 | 全节点契约覆盖、真实数据库并发测试通过 |
| P5 发布验收 | 对比基线、灰度开关、升级/回滚演练 | 达到双方确认的质量门槛，才能移除旧入口 |

每阶段独立可交付；P2 的正式运行切换必须等所有要运行的节点已有适配，不能“迁了一半就让另一半绕过门禁”。不自动升级第三方 FlowGram，不承诺跨越未知兼容差异。

## 18. 数据迁移与回滚

默认非破坏策略：只读盘点 → 备份与摘要 → 生成迁移副本及差异 → 全量验证 → 用户确认 → 切换。无版本旧数据标记 legacy-unversioned，只在能证明契约兼容时转换，无法证明则只读显示并要求修复。

不继续增加运行时宽松兼容。显式导入器可以一次性转换已知旧格式，输出迁移报告并保留原文，之后只存规范形。

迁移发布内容一律生成新 releaseId，保存 migrationId、sourceReleaseId、原摘要和新摘要；旧发布与历史运行关联不变。对子流程依赖自底向上生成 oldReleaseId → newReleaseId 映射，重写新父副本的锁定引用；任何依赖无法迁移或存在调用环时整组切换阻断。验证完依赖闭包后事务切换根工作流当前指针，回滚只恢复旧指针，不反向改写历史正文。可变草稿生成新修订，不冒用正式发布身份。

若用户确认所有存量都可丢弃，可另选一次性重建方案；必须单独确认数据库和提示词覆盖范围。本次不执行清库。

回滚以不可变原快照和功能开关恢复；新版本产生的数据不能交给旧程序静默解析，必要时保持只读。首次执行新语义前并行比较旧/新编译结果，不双执行有副作用工作流。

## 19. 测试与质量评价

### 19.1 契约测试

每节点必须有：有效样例、缺字段、错类型、非法枚举、未知字段、默认值结构检查、输出一致性、版本未知拒绝。动态节点增加端口重命名、子图作用域和真实输出检查。

跨端同一 fixture 使用标准校验器得到相同结果；不要求错误原文相同，要求错误码、路径和严重级别一致。生成产物重建后无差异；修改业务字段无需同步手改提示词。

### 19.2 关键回归

- 已规范 HTTP body/timeout 经过两次处理不变；归一化不改变输入对象。
- 含零入度代码节点的无连线图不执行该代码。
- 引用三段路径、变量赋值整链输出、数字/布尔/对象常量类型不丢失。
- 同起终点不同端口的边保留；数组缩短不残留元素。
- 循环内部坏节点被拒绝，局部变量不泄漏，循环输出合法引用不过度误判。
- 人工编辑、AI 修改、导入、测试、发布不产生语义分叉。
- 真实数据库并发发布不会重复当前版本、覆盖旧基准或留下孤儿版本。
- 编辑器保存重开、全局变量、循环与子流程在浏览器验证；不是只跑单元测试。

### 19.3 AI 评测

建议首批固定 60 个任务：20 个基础流程、15 个引用/分支、10 个循环/子流程、10 个修改修复、5 个缺信息或拒绝猜测；高风险坏例单独扩充。每任务至少运行 3 次，记录模型版本与采样配置，模型支持时固定随机种子。

评价：首次编译通过率、预算内编译通过率、业务断言通过率、未解决问题诚实率、平均修复轮数、输入输出 token、费用、延迟、误改无关节点率和提示词维护点数量。模拟测试与真实测试分开统计。

尚无实测基线，不承诺提升百分比。建议讨论用门槛：契约与跨入口确定性回归全部通过；所有副作用/安全坏例零违规；固定基准业务成功率不低于旧链路，目标达到 90%；预算内编译通过率目标 95%。这是拟定验收标准，不是当前成绩，需在基线测量后确认。

## 20. 推荐确认的决策

1. 采用方案 B，保留 FlowGram + Java，采用增量适配而非重写。
2. 第一阶段保留现有节点 data 字段，统一来源和语义；不另建 AI 专属 DSL。
3. 取消按错误次数软放行，改为明确的草稿完整度与执行门禁。
4. 未知节点版本拒绝执行；唯一 start 作为入口，end 定义结果；发布不可变。
5. 默认保留存量，不执行清库；需要零兼容重建时另行确认。
6. 先完成 P0/P1 与首批四类节点验证，再推进复杂控制流、全量发布治理。

确认后应进一步产出分阶段实现任务与改动清单，再开始代码修改。本文所列新模块、接口与字段均为拟议设计，不描述为已经实现。

## 附录 A：本地核查定位

前端根目录：apps/console/src。后端应用根目录：apps/api/gaia-workflow/gaia-workflow-app/src/main/java/cn/boommanpro/gaia/workflow/app。

- nodes/index.ts:28–48：画布注册。
- document/types.ts:96–112：可生成节点集合。
- agent/node-templates/normalize.ts:54–64、129–132：HTTP 规范化路径。
- document/validate.ts:14–18、227–235：HTTP URL 读取路径。
- document/workflow-document.ts:123–161：数组合并与边去重。
- agent/node-templates/__tests__/contract.test.ts:130–233：现有契约测试。
- service/NodeSchemaRegistry.java:47–81、112–129：16 类契约加载与缺失放行。
- service/AgentSkillCatalog.java:202–271：知识来源及只补缺策略。
- agent/tool/impl/NodeToolExecutor.java:59–139：新增节点与软放行。
- agent/tool/impl/GetToolExecutor.java:147–182：变量及知识获取。
- service/DraftRunService.java:77–107：草稿试跑与超时路径。
- service/WorkflowDslValidator.java:103–143、224–282、374–414：顶层校验、可达性、引用。
- service/WorkflowDslApplyService.java:70–128、165–245：正式落版。
- agent/session/SessionDraftPublishService.java:62–152：发布基准与会话关联。
- controller/system/GaiaWorkflowVersionController.java:161–203：版本修改、删除、切换。
- 基础模块 model/Chain.java:572–641、1151–1181：输出、入口与引用解析。
- 基础设施模块 extend/node/loop/LoopNodeParser.java:73–100、212–229：子图解析。
- 基础设施模块 extend/node/variable/VariableNode.java:33–49、107–129：赋值与公开输出映射。

行号对应本次工作区读取，后续修改可能改变位置。

## 附录 B：官方参考资料

以下均为调研读取的官方来源；移动分支链接只作为本次证据入口。

1. FlowGram 官方仓库：https://github.com/bytedance/flowgram.ai
2. Desktop 身份与架构：https://github.com/bytedance/flowgram.ai/blob/main/apps/desktop/README.md
3. FlowGram 节点注册：https://flowgram.ai/en/guide/free-layout/node
4. Desktop 契约目录：https://raw.githubusercontent.com/bytedance/flowgram.ai/main/apps/desktop-backend/catalog/atomic-nodes.json
5. Desktop 前端适配：https://raw.githubusercontent.com/bytedance/flowgram.ai/main/apps/desktop/src/lib/atomic-nodes.ts
6. Desktop 工具：https://raw.githubusercontent.com/bytedance/flowgram.ai/main/apps/desktop-backend/src/tools.rs
7. Desktop 运行校验：https://raw.githubusercontent.com/bytedance/flowgram.ai/main/apps/desktop-backend/src/runtime.rs
8. Dify 节点工厂：https://raw.githubusercontent.com/langgenius/dify/main/api/core/workflow/node_factory.py
9. Dify LLM 配置：https://raw.githubusercontent.com/langgenius/dify/main/web/app/components/workflow/nodes/llm/default.ts
10. Dify 工作流生成器：https://raw.githubusercontent.com/langgenius/dify/main/api/core/workflow/generator/runner.py
11. Dify DSL 版本：https://raw.githubusercontent.com/langgenius/dify/main/api/services/dsl_version.py
12. n8n 节点接口：https://raw.githubusercontent.com/n8n-io/n8n/master/packages/workflow/src/interfaces.ts
13. n8n 节点版本：https://docs.n8n.io/integrations/creating-nodes/build/reference/node-versioning/
14. n8n 参数描述：https://docs.n8n.io/integrations/creating-nodes/build/reference/node-base-files/standard-parameters/
15. n8n 结构校验：https://raw.githubusercontent.com/n8n-io/n8n/master/packages/@n8n/ai-workflow-builder.ee/src/tools/validate-structure.tool.ts
16. n8n 配置校验：https://raw.githubusercontent.com/n8n-io/n8n/master/packages/@n8n/ai-workflow-builder.ee/src/tools/validate-configuration.tool.ts
17. n8n 综合校验：https://raw.githubusercontent.com/n8n-io/n8n/master/packages/@n8n/ai-workflow-builder.ee/src/validation/programmatic.ts

## 附录 C：方案自检

- 区分当前事实、源码推论、目标设计与待测指标；未宣称测试执行通过。
- 不把节点集合数量差异直接判为错误，使用能力分类解释。
- 保留草稿可编辑性，同时不降低执行与发布契约。
- Schema 管结构，编译器管语义，执行器管行为，三者不相互冒充。
- 不把模型结构化输出、Schema 默认值、目录版本号当成运行正确性保证。
- 不重写用户已有文件，不提交代码，不执行数据清理；批准前只交付方案。
