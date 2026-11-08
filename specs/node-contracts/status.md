# 实施状态

核查日期：2026-10-24。依据当前源码和首批实施记录；本次规范整理未重跑业务测试。此文件是状态索引，不是测试报告。

## 已接入

- node-catalog/index.json 登记 16 类节点；defaults.json 提供 12 类可生成节点默认值，数量不是永久约束。
- NodeCatalog/NodeSchemaRegistry 使用目录加载既有 Schema，启动检查缺失和非法资源。
- 前端模板直接导入同一 JSON，深拷贝默认数据、整体替换数组、拒绝未知类型。
- 前后端生成清单按 aiCreatable 派生；AI knowledge 在散文缺失时仍可返回契约。
- code、condition、http、llm、workflow 画布创建已调用共享默认值，其他类型不能据此视为完成接入。
- HTTP 规范化保留规范 body/timeout；前端节点创建不再隐式调用扁平输入转换。
- 2026-10-24（会话 b6e34195 真实模型评测驱动，入口 `gaia-workflow-app/.../service/NodeDataNormalizer.java`）：
  归一化新增吸收模型常见写法——http 的 `api.{headers,body,params,timeout}` 搬回顶层、`body.json` 裸字符串包成 template；
  start 的 `outputs` 下扁平声明提进 `properties`；code 的 `inputsValues` 键自动补进 `inputs.properties`、
  `script` 裸字符串**且带平级 `language`** 时归一为对象（无 language 的裸字符串保持既定决策：契约拒绝）。
  引擎侧 `gaia-workflow-base/.../node/ChainParser.java`：「并发分支交叉」校验只约束无条件扇出，条件/分支节点的多出边汇合放行；
  `base/tools/CollectionLengthAccessor` 让 SpEL 支持 `.length/.size`，`JsonStringTypeConverter` 让模板里的数组/对象渲染为 JSON；
  `infra/.../code/GraalJsEngines` 修复 fat jar 下 GraalJS 类加载并把入参还原为原生 JS 值。
  验证命令：`mvn -B -pl gaia-workflow-app -am test`（301 项通过，1 项既有跳过）；相关单测：NodeDataNormalizer{Http,Start,Code}Test、
  ChainParserBranchMergeTest、CollectionLengthAccessorTest、JsFunExecNodeTest。
- 2026-10-25（会话 b9019b24 编辑器渲染一致性实证，前后端双侧修复）：
  · http `api.url` 裸字符串 → template 包装（`NodeDataNormalizer.normalizeHttp`，与 body.json 对称；引擎 parseUrl 双形状兼容，
    canonicalizer `apiUrlOf` 已兼容）；归一化末尾新增全类型 `canonicalizeTemplateWrappers`——已是包装形状的 template 值统一收敛
    `{{ a.b }}` → `{{a.b}}`（前端渲染层拆段不 trim，带空格显示 Unknown）。
  · 固定输出对齐：`fillStaticOutputs`（llm/http）由「只补缺」改为「properties 整体对齐 x-gaia-outputs」——AI 自声明的 llm 额外输出
    （如 riskLevel）运行期恒 null，残留会诱导下游断裂引用。
  · 引用校验前移：`WorkflowDslValidator.referenceIssues`（S4 公开子集，ownerFilter 过滤）；node update 时「引用不存在节点」当场拒绝、
    字段级问题随回执警告；node add 时全部按「加入 + 精确警告」。模板字段级新增 TEMPLATE_REF_FIELD **warning**
    （只查首段；length/size 为运行时内置访问器，跳过）。
  · code 入参类型传播：`NodeDataNormalizer.propagateInputTypes`（ref 指向上游已声明输出时拷贝类型，SessionWorkflowDraftService
    add/update 时调用），覆盖 inferDeclaredType 对 ref 一律 string 的占位。
  · llm 表单 required 口径对齐：`node-schemas/llm.schema.json` x-gaia-form-inputs.required 收敛为仅 `prompt`
    （凭证运行时注入；旧 5 项口径曾让表单四个空字段挂必填红星）。
  · llm 结构化输出（2026-10-25 第二批，outputMode=text/json）：
    - 契约：llm.schema.json 增 `outputMode`（text=固定 result 默认；json=outputs.properties 声明集即输出字段），
      defaults.json llm 默认 outputMode=text；
    - 运行时：`LlmNode.parseStructuredOutput`（直接 parse → 剥 markdown 围栏 → 截取首末花括号，失败节点 FAILED 带修复指引）；
      `LlmNodeParser` 按模式注入输出白名单（text=[result]；json=声明集，复用 CodeNodeParser.parseNodeParameters，
      引擎 parseOutputResult 过滤机制与 code 节点一致）；
    - 校验：normalizer json 模式保留声明集不压平；`inferOutputFields` json 模式按声明推断（引用检查/变量查询跟随）；
      canonicalizer json 模式缺 outputs 声明 fatal（带修复示例）；
    - 前端：llm 节点新增专属 formMeta（输出模式 Radio + json 模式复用 code 的 JsonSchemaEditor 声明 outputs）；
      `upstream-variables.ts` llm json 模式按声明推断；
    - 提示词：node-data-rules.md/SKILL.md 结构化输出范式（替换「llm+code 解析」二段式）。
    - 画布试运行凭证注入（2026-10-25 第三批，用户实测「缺少 apiHost 配置」报错驱动）：
      编辑器「试运行」链路此前不注入 llm 平台默认凭证（`/api/task/run` → WorkflowTaskServiceImpl、
      `/api/task/runNode` → SingleNodeExecutor 均原样执行画布 schema）——修复为与 agent 试跑/落版同源
      （canonicalizer fillLlmDefaults 唯一实现，只补缺失项，模型配置不可用不阻断）；
      附带修复 llm text→json 切换时残留的 result 声明（json 模式归一化剥除，null 输出曾误导前端变量面板）。
      验证：mvn 全量 318 通过（1 既有跳过）；模拟前端 TaskRun 请求实测——无凭证 llm 草稿整流
      success（json 模式解析 + 条件分流正确，end_neg 输出 category/priority）、单节点 success
      （sentiment/category/priority 正确解析，残留 result 已不再出现）。
    - 对象输出声明的引用驱动补全（2026-10-25 第四批，会话 84bf1596 用户实证「下游引用
      code 的 buyer.country 显示 Unknown」驱动）：code 声明 buyer:{type:object} 不写 properties 时
      前端变量树无子字段——新增 `NodeDataNormalizer.completeObjectOutputDeclarations`（文档级，
      扫描 ref 深路径 + 模板 token，把被引用而未声明的 object 子字段补进声明，length/size 跳过，
      已声明不覆盖），接入草稿 normalizeDoc 与落版 canonicalize；前端 render-compat 同口径
      （存量会话展示立即生效）。前端 llm 表单顶部增加「凭证留空=运行时注入平台默认」提示
      （空输入框曾被理解为没配置完）。
      验证：mvn 全量 319 通过；前端 vitest 113 通过（新增补全用例 + store 对账用例）；
      浏览器实测会话 84bf1596——llm_4 prompt 的 buyer.country/email 徽标正常渲染，Unknown 0 处。
    - SSE 连接对账自愈（2026-10-25，长活 tab 跨后端重启漂移）：订阅 onOpen（含重连）时拉取
      服务端草稿与本地比对——结构（节点 id 集+边集）一致仅对齐版本号（alignServerDocVersion，
      后端重启会重置计数），漂移则整卡替换；applyServerOps 补上文档契约承诺的 store 级
      baseVersion 门禁（此前只在调用方检查）。前端 vitest 含 store-server-align 用例。
    - llm 凭证改由 AI 生成时填入（2026-10-25 第五批，用户决策「不要后端运行时注入」）：
      GetToolExecutor get(target=knowledge, nodeType=llm) 附带 platformDefaultModel
      （modelName/apiHost/apiKey，来自 AgentModelConfigService.getLlmConfig）；提示词
      （node-data-rules/SKILL/schema description）改为「三个值原样填进 inputsValues，必填不自编」；
      **移除全部运行时注入**——DraftRunService.fillLlmDefaults、RunToolExecutor 单节点注入、
      canonicalize 落版注入（含 LlmDefaults/重载）、画布 /task/run 与 /task/runNode 注入；
      LlmNode 报错文案同步更新。注意两点：① get 工具对节点的 apiKey/apiHost 读取脱敏保持不变
      （AI 写入后回读不可见，防泄漏）；② 知识库配置源为 agent_config 的 llm_config 条目，
      与会话引擎 activeModelId 是两条配置链——不一致时 AI 填的是 llm_config 的值。
      验证：mvn 全量 319 通过；E2E 实测——指示 AI 按新规范填 84bf1596 会话的 3 个 llm 节点，
      草稿 inputsValues 均已带 modelName/apiHost/apiKey（表单可见）。既有空凭证草稿不再被兜底，
      试运行会报缺配置（错误文案带修复指引），由 AI/用户填入。
    - 端到端（2026-10-25 会话 4b58ae41 真实模型）：新建对话 51s 生成「llm outputMode=json 声明 level/advice」工作流，
      条件节点直接引用 llm_1.level、end 引用 level/advice，AI 自跑两组试运行通过（真实 LLM 调用 + JSON 解析进 memory）。
      前端无头 Chromium（Playwright）验证：4 节点全渲染、输出模式控件与声明编辑器可见、变量引用 0 断裂。
      注：ZCode 内嵌浏览器 webview 当日出现 ResizeObserver 失效（flowgram 层 0×0、节点不渲染，与应用代码无关，
      HEAD 冷构建同症状、无头浏览器正常），浏览器内人工验收需换外部浏览器或重启内嵌浏览器。
  · 前端接入侧形状收敛：`apps/console/src/document/render-compat.ts`（裸 url/body.json 包装、template token 空格收敛、
    llm required 对齐——存量会话与版本历史的展示修复），挂载于 `WorkflowDocument.fromJSON` 与编辑器原始数据入口；
    模板校验对 `<collection>.length/.size` 尾段放行（与 CollectionLengthAccessor 同口径）。
  验证：后端 `mvn -B -pl gaia-workflow-app -am test`（309 项通过，1 项既有跳过；新增 NodeDataNormalizerRenderShapeTest、
  WorkflowDslValidatorReferenceIssuesTest）；前端 `vitest run src/document src/agent/node-templates`（34 项通过，含 render-compat 5 项）、
  `tsc --noEmit`（改动文件无错误）。浏览器实证（会话 b9019b24）：4 个 http 节点 URL/模板 token 正常渲染、llm 必填红星消失、
  编辑器标题显示会话名；剩余 Unknown/Undefined 均为该会话草稿中真实断裂的引用（llm 非 result 字段、buyer 无 properties 声明），
  属数据本身问题，新生成路径已由引用前移校验拦截。未验证：真实模型新会话生成回归、`.length` 在 PromptEditor 行内徽标的
  显示（校验已放行，徽标仍显示 Unknown——flowgram 变量树不暴露 length，属 node_modules 渲染层残余）。

- 2026-10-25（30 对话全节点覆盖评测，入口 `scripts/e2e-conversations/`，记录见
  `docs/node-coverage-30-conversations-2026-10-25.md` 执行记录一节；该文档已随 docs 目录移除，git 历史可检索）：
  引擎侧修复——HttpNode Accept-Encoding 收敛 gzip（raw deflate ZipException）、DraftRunService 补
  WorkflowDslValidator 门禁（end 零入度假成功封堵）、JSONNull Jackson 序列化（/status 500）、
  TaskInfo/NodeReport 并发容器（report 轮询 CME）、LoopNode 空体 fail fast、`<loopId>_locals` 引用白名单；
  工具侧——node add/update 支持 parentId 落入 loop 容器（自动骨架+自动接线+骨架 id 归一）、
  connect 容器内边写 loop 节点级 edges、data.blocks/edges 搬运归位、get(canvas) 回执 publishedWorkflows
  清单+入出参 schema（子流程可发现可映射）；知识侧——condition/branches 布尔输出语义、llm json 完整范式、
  loop 三步范式写入 SKILL/node-data-rules/schema description/主提示词；
  基建——AgentSkillCatalog 种子文件按 classpath 内容同步（原 seed-if-missing 使资源更新永不生效）。
  结果：16/30 对话通过（C20 负向、C21 坏 JSON、C22 超时、C29 测试回归、C30 巡检修复等健壮性场景全绿），
  14 个失败全部归因对话模型（Qwen3.6-35B-A3B 本地）编排能力边界而非平台缺陷；
  前端 Playwright 实证 C07/C15/C24 编辑器 0 Unknown/0 Undefined。
  验证：`mvn -B -pl gaia-workflow-app -am test`（322 通过，1 既有跳过）。

- 2026-10-26（用户反馈「前端和后端都能出现多个 end」，变更记录 [changes/archive/2026-10-26-end-node-uniqueness](../changes/archive/2026-10-26-end-node-uniqueness/proposal.md)）：
  end 顶层唯一与 start 对称——后端 `WorkflowDslValidator` 新增 `MULTI_END` error（nodeId 点名全部 end、文案指引分支汇合）、
  `SessionWorkflowDraftService.addNode` 对第二个 start/end 当场拒绝并指引改接（批量 add 路径作为 items[i] 警告回执）；
  前端 `document/validate.ts` 新增 `MULTI_END`、`wujie-communication` 宿主添加入口加守卫；
  架构师提示词（zh/en）与知识种子 end 条目由「至少一个 / 可以多个」改为「有且仅有一个」。
  不新增 node-catalog 基数字段（图语义沿用 MULTI_START 实现位置）；存量多 end 草稿不自动改写，下次保存/试跑/落版被打回。
  验证：`mvn -B -pl gaia-workflow-app -am test`（334 通过，1 既有跳过；新增 WorkflowDslValidatorTest.multiEnd、
  SessionDraftStartEndUniquenessTest 4 项）；前端 `vitest run`（129 通过，新增 document/validate.test.ts 5 项）；
  `tsc --noEmit` 改动文件 0 错误（29 个既有错误均在未改动文件）。未验证：浏览器端到端、存量库多 end 版本统计。

- 2026-10-26（用户反馈：llm 表单顶部蓝色说明要去掉、凭证三字段强制必填、手动添加的 llm 节点与 AI 添加的看起来不一样且无默认值）：
  · 根因：后端 `NodeDataNormalizer.alignFormInputs` 把 AI 节点的 `data.inputs` 整体替换为 llm.schema.json 的
    `x-gaia-form-inputs`（带 required / extra.formComponent），而前端手动添加走 defaults.json 里另存的一份裸 `inputs`
    （无 required、无 formComponent）——两份拷贝漂移（P-01 违背），手动节点 prompt 不是大编辑器、无必填星、凭证为空；
    后端 Hutool JSONObject 不保序，AI 节点表单行序还被打乱。
  · 单一事实源收口：前端 `agent/node-templates` 的 `cloneDefaultData` 对有 `x-gaia-form-inputs` 扩展的类型由扩展派生
    `inputs`（`formInputsSchemaOf/formInputOrderOf`），defaults.json 删除 llm `inputs` 副本；`render-compat` 对存量 llm
    inputs 按内容（不比键序）整体对齐契约；`FormInputs` 新增 `order` 按契约顺序渲染行（数据键序不再影响显示），并透出
    schema description 做字段 tooltip。
  · 凭证必填：llm.schema.json `x-gaia-form-inputs.required` = modelName/apiKey/apiHost/prompt，描述改为「必填、新建自动带入
    平台默认」；后端 canonicalizer 三字段统一 fatal（此前 modelName 仅 warning、apiHost 不查），一次点名全部缺项并附 update 修复示例。
  · 默认值同源：`AgentModelConfigService.getPlatformDefaultLlmConfig()`（模型管理全局默认条目 > llm_config > yml）成为 llm
    节点凭证唯一来源——AI `get(target=knowledge)` 的 platformDefaultModel 改用它（修掉 status 里记录的「两条配置链」），
    新增 `GET /api/agent/models/node-default` 给前端；llm 表单打开时空凭证位自动带入（只填空位、只读不写），`onAdd`
    命中缓存时直接带入；顶部蓝色说明撤掉。注意该端点返回明文 apiKey——与节点 inputsValues 明文携带凭证（10-25 决策）同一暴露面。
  · 知识种子 llm 条目：「凭证不填、落版注入」改为「必填、取 platformDefaultModel 原样填入」，示例去掉手写 `inputs`
    （平台自动对齐，不再要求模型照抄字段表，NC-04）。
  验证：`mvn -B -pl gaia-workflow-app -am test`（342 通过，1 既有跳过；新增 WorkflowDslCanonicalizerLlmCredentialTest 5 项、
  AgentModelConfigServicePlatformDefaultTest 3 项）；前端 `vitest run`（151 通过；contract 测试改为 inputs 逐字段等于扩展 +
  登记守卫 + defaults 无副本，新增 platform-default 7 项、orderInputKeys 3 项，render-compat llm 用例改为整体对齐）；
  `tsc --noEmit` 改动文件 0 错误（基线 29 不变）。临时 SQLite 真实启动实测：node-default 返回已注册的 yml 模型；在模型管理
  新建条目并设为默认后 node-default 立即跟随；禁用该条目后回退不返回空凭证。未验证：浏览器内手动添加 llm 节点的实际渲染
  （预填闪动、必填星、行序）；存量多 end / 旧 inputs 草稿在真实库上的回归。

- 2026-10-28（用户决策：负责人节点整体删除）：
  assignee（负责人标注节点）从前端注册、后端枚举与校验链全量移除——console 删除 `nodes/assignee/`（注册/渲染/表单/类型）与
  `assets/icon-assignee`，`WorkflowNodeType`/节点 i18n/initial-data 示例/`wujie-communication` 分配人映射/
  run-node-panel 不支持清单同步清理；后端 `NodeTypeEnum` 删 `ASSIGNEE`（含 NO_PARSE），`SingleNodeExecutor`、
  `WorkflowDslCanonicalizer` 注释与清单收敛。存量数据处理：assignee 是无端口标注节点（不产生连线、无执行语义），
  前端 `document/render-compat.ts` 新增 `stripRemovedNodes`——旧草稿/版本历史载入时剥离该类节点并防御性过滤两端引用边
  （无损、幂等，保持「无变化返回原引用」契约）；后端不再放行：`WorkflowDslValidator` 对 assignee 报 UNKNOWN_TYPE、
  canonicalizer 对 AI 产出 fatal 打回（历史已发布版本若含 assignee，引擎 ChainParser 会明确报「不支持的节点类型」，
  需重新保存后运行）。知识库 seed（node-knowledge.json）本无 assignee 词条；NodeKnowledgeContractTest 增加缺席守卫
  防止回归。测试资源删除孤儿夹具 `test/resources/nodes/assignee.json`。
  验证：`mvn -B -pl gaia-workflow-app -am -Dtest=NodeParserTest,NodeExecutionL2Test,SingleNodeExecutionTest,
  AiCreatableTypesContractTest,NodeKnowledgeContractTest,WorkflowDslValidatorTest,NodeCatalogTest,
  NodeSchemaBadcaseCorpusTest,GetKnowledgeCatalogTest test`（90 通过 0 失败，含新增
  WorkflowDslValidatorTest.assigneeIsDeletedType 回归）；前端 `vitest run src/document/__tests__/render-compat.test.ts`
  （9 通过，新增存量剥离 2 项）；`npm run ts-check` 结果见交付说明。未验证：浏览器端到端打开含 assignee 的存量草稿、
  真实库中存量 assignee 版本的分布统计。

- 2026-10-29（用户会话实证「condition_1.if_pass 后端合法、前端画布查不到」，变更记录
  [changes/archive/2026-10-29-dynamic-node-output-materialization](../changes/archive/2026-10-29-dynamic-node-output-materialization/proposal.md)）：
  condition/branches 动态输出物化，画布变量引擎与引擎运行时口径拉齐——
  · 前端 `nodes/derived-outputs.ts` 单一规则纯函数；condition/branches form-meta 用
    `createEffectFromVariableProvider`（variable 节点 infer-assign 同机制）把派生 schema 喂进 FlowGram 变量引擎
    （变量选择器 + `{{ }}` 模板校验同源可见），formatOnSubmit 物化进 data.outputs；
    `document/upstream-variables.ts` 改用同一函数（前端规则拷贝归一）。
  · 后端 `NodeDataNormalizer` deriveBooleanOutputs 整体重算 outputs.properties（幂等；canvas 回推/agent
    add/update/canonicalize 全入口覆盖）；condition/branches schema 放行派生 outputs（严格 boolean 形状）、
    catalog defaults 补空 outputs（前端模板经共享 import 自动跟随）；
    `inferOutputFields` 与 `ConditionNode/BranchesNode.getOutputParameters` 对空字段名跳过（与 legalPortsOf 同口径）。
  · 跨端 parity：specs/node-contracts/fixtures/dynamic-node-outputs.json 共享样例；
    后端 NodeDataNormalizerDynamicOutputsContractTest 断言归一化产物=运行时 getOutputParameters=inferOutputFields
    （4 项，含物化产物过严格 schema、canonicalize 为存量无 outputs 草稿补齐）；
    前端 nodes/__tests__/derived-outputs.test.ts 引用同一份 fixture。
  验证：`mvn -pl gaia-workflow-app -am test`（383 通过，1 既有跳过）；前端 `vitest run`（181 通过，26 文件）；
  `npm run ts-check` 改动文件 0 错误（30 个既有错误均在未改动文件）；改动文件 eslint 0 错误 0 警告。
  未验证：浏览器端到端（真实画布选变量/模板徽标）、wf_087b971f1357 全链路回归、存量草稿物化规模统计。

- 2026-10-29（用户实测「AI 生成画布打开就一坨」，调研与决策记录
  `docs/canvas-auto-layout-elk-2026-10-29.md`（已随 docs 目录移除，git 历史可检索），方案 A 用户确认）：
  画布布局收口到后端 ELK layered——旧 BFS 分层步长（X=320/Y=200、碰撞盒 240×120）小于画布真实节点尺寸
  （宽 360、llm/http/code 高 390），重叠是数学必然；且 `autoLayoutIfUntouched` 的宽高比 ≥6 门槛让宽扁乱图
  永远漏网。改动：
  · 新增 `WorkflowLayoutEngine`（ELK 0.10.0 纯 Java headless，EPL-2.0；guava 钉 33.3.1 防 elk.graph 开区间漂移）：
    按类型真实尺寸布局、condition/branches 出边端口约束（EAST 按声明顺序）、节点按 id 排序 + 固定 RANDOM_SEED
    保证确定性（run 结束重排不跳动）；ELK 异常回退内置简单分层，不阻断落版/草稿链路。
  · 尺寸单一来源：唯一事实源保持前端 `nodes/<type>/index.ts` 注册表（NC-01），
    `WorkflowLayoutEngineNodeSizeContractTest` 解析 TS 源码断言后端镜像逐类型一致（P-01 可测试派生）。
  · 接线：canonicalize 缺坐标兜底、`autoLayoutIfUntouched`（保留 layoutUserTouched 让位，删 ratio 门槛）、
    agent autoLayout 工具（经 `WorkflowDslCanonicalizer.applyLayout` 委托）全部走 ELK；
    `CanvasPlacement` 搭建期增量步长修正 520/470、碰撞盒 360×390。
    新增 `POST /api/agent/session/{key}/auto-layout`（AgentSessionRunController，autoLayoutIfUntouched
    改返回 boolean）：接口建草稿（push-draft）后的验收/运维入口，未来前端「整理」可切此端点统一 ELK。
  · 前端删除无调用方的 headless 布局链：`document/layout.ts`、`normalize-dsl.ts`、`WorkflowDocument.autoLayout`、
    CanvasBinding/CanvasContext 的 autoLayout 契约（P-07 不并行维护两套布局）；手动「自动整理」按钮保留
    FlowGram 内置 dagre。loop 容器内 blocks v1 不参与布局（容器当叶节点）。
  验证：`mvn -B -pl gaia-workflow-app -am test`（357 通过 0 失败，1 既有跳过；含合并树上并行会话的新增契约测试；
  新增 WorkflowLayoutEngineTest 10 项——菱形/条件端口/确定性/重排幂等/missing-only/长蛇收敛/环/孤立节点，
  WorkflowLayoutEngineNodeSizeContractTest 1 项，SessionDraftLayoutRevisionTest 更新为「宽扁图也重排」+ 保留让位语义）；
  前端 `npm test`（181 通过 26 文件）、`npm run ts-check`（29 个既有错误均在未改动文件，改动文件 0）、
  `npm run build`（rsbuild 产物正常）。未验证：真实模型端到端生成后的画布目测、存量草稿重开回归、
  ELK 在 Spring Boot fat jar 中的启动实测（本机 mvn test 已在 classpath 验证，fat jar 打包仅差 deploy 验证）。

- 2026-11-03（用户验收反馈「间距太少」两轮 + 「前端（dagre 整理）效果好」，对标调参）：
  · 第一轮（列贴列）：ELK 相邻层间距是独立选项 `SPACING_NODE_NODE_BETWEEN_LAYERS`（默认仅 20px），
    首版漏设——补设并回归断言「链式图相邻列净距 ≥100」。
  · 第二轮（对齐 dagre 观感，探针对比实验选定参数）：① NODE_PLACEMENT_STRATEGY=NETWORK_SIMPLEX
    （dagre 定位即 network simplex，Gansner 论文同源）——默认 BK 放置按「覆盖子节点」拉伸，分支群
    整体下沉 457px、主链浮上方；NS 下分支群中心与分支源节点中心对齐。② 间距收敛 100/100（对齐
    dagre nodesep/ranksep），边走廊压到 10（画布自绘连线不消费 ELK 边路由，大边距只会撑大列距，
    列距从 480~530 参差收敛为均匀 460）。③ 新增 `centerNodesTowardNeighborMidpoint` 层内居中后处理
    ——复刻 dagre position 阶段的 balance 内核（目标=邻居中点，clamp 同层不重叠，两轮双向扫描），
    补上 ELK 缺的「主干向分支群中点收拢」一步；只动 y 不动 x，分层与交叉结果保持 ELK 原样，确定性不变。
  · 测试：conditionBranchesNoOverlap 改为规范合法形状（condition 出边全带 fromPort、分支汇合同一 end
    ——无端口出边本就会被校验 fatal，原测试图是非法形状），新增「分支群中心与条件节点中心偏差 ≤100」
    观感钉子（无后处理时偏差 210）；15/15 通过。接口验收（/tmp 脚本对运行中后端实测）：9 节点三分支图
    分支群中心与条件中心偏差 0、列距均匀 460、主链围绕同一轴心，浏览器截图目测与前端 dagre 整理一致。
  验证：`mvn -B -pl gaia-workflow-app -am -Dtest=WorkflowLayoutEngineTest,WorkflowLayoutEngineNodeSizeContractTest,
  SessionDraftLayoutRevisionTest test`（15 通过）；重启后端 + push-draft/auto-layout/document 接口实测 +
  IAB 截图目测。未验证：真实模型生成的复杂图（深嵌套/多汇合点）目测、本轮改动的前端回归未重跑（无前端改动）。

- 2026-10-30（用户决策：落版记来源会话 + AI 起草版本说明，发布门槛不变）：
  · 版本溯源：`gaia_workflow_version` 新增 `source_session` 列——会话页「保存为版本」
    （SessionDraftPublishService → WorkflowDslApplyService.ApplyOptions.sourceSession）落版时记录
    产出该版本的会话 key；REST 直接落版（编辑器专家模式）为 null。存量库迁移由
    `SqliteColumnMigrator`（ApplicationRunner，PRAGMA table_info 探测后 ALTER ADD COLUMN）
    幂等补列，新库走 schema.sql。
  · 版本说明建议（AI 只起草、用户落版）：新增 `POST /api/agent/session/{key}/version-desc-suggestion`
    （VersionDescSuggestionService）——当前草稿 vs 目标工作流生效版本的 diff 交 LLM 概括成
    ≤20 字一句话（复用 LlmCompletionService，10 秒超时独立守护线程），LLM 失败/超时回退
    WorkflowDiffService.summarize 确定性摘要，无结构变更不花模型调用直达固定文案；
    保存弹窗（ArtifactPanel）打开时预填描述框，等待期用户已打字则不覆盖。
    原默认文案「AI 生成」（用户不改就原样入库）替换为空 + placeholder。
  验证：`mvn -B -pl gaia-workflow-app -am test`（365 通过 0 失败，1 项既有跳过；新增
  VersionDescSuggestionServiceTest 5 项——LLM 优先/失败回退/更新场景计数/无变更跳过 LLM/空草稿、
  SqliteColumnMigratorTest 2 项——补列幂等/新列可写）；前端 `npm test`（181 通过 26 文件）、
  `npm run ts-check`（改动文件 0 错误，29 个既有错误均在未改动文件）。
  未验证：浏览器端到端（弹窗预填实际交互、LLM 真实调用延迟体验）、存量库重启后
  source_session 迁移实测（单测覆盖迁移逻辑，未在真实 gaia_workflow.db 上执行）。

- 2026-11-03（呈现层改版：历史统一时间线，移除「设为生效」直切，纯前端）：
  · 背景：原「画布历史」弹窗分「本会话版本 vN / 落版版本 vN.M」两区，两套 vN 编号同框；
    「回滚到此」与「设为生效」并排一词两义，「设为生效」一键直切线上。产品调研
    （Dify 草稿/发布、Replit checkpoint/commit 混排时间线）后用户确认：合并为一条时间线。
  · 实现（apps/console，后端零改动）：CanvasHistoryPopover 重构为 CanvasHistoryTimeline
    （纯内容）+ Popover 壳——快照=紧凑行（时间+来源+AI 摘要，不再编号 vN）、版本=里程碑
    卡片（v 号+生效中 Tag+描述+来源 meta：source_session→会话落版 / createdBy=user→手动保存 /
    其余→编辑器落版）；过滤 chips 全部/仅版本；动作统一为 载入/对比（快照对比复用
    DeltaDetailsView 本地渲染，版本对比仍走 getVersionDiff）。「设为生效」直切按钮移除，
    set-current 端点保留——线上切换唯一入口改为编辑器头部「载入旧版 → 预览态 → 发布生效
    （Popconfirm 确认）」（指针回拨，不产生新版本行，符合 NC-08「回滚恢复旧指针」）。
  · 会话侧「载入」：canvas-draft-sync 新增 loadVersionIntoSessionCanvas（getVersionById →
    store.replace reason='import' → push-draft source='rollback'，streaming 拒绝）——只改会话
    草稿不动 is_current；会话入口按钮「画布历史 vN」→「历史 · 未保存圆点」，显示条件放宽为
    快照>0 或已绑定 workflowCode。数据模型、校验链、发布门槛、draft_<sessionKey> 机制零改动。
  · GaiaWorkflowVersion TS 类型补 diffJson/sourceSession（后端实体早已返回）。
  · 同日迭代（用户反馈「载入一次多一条版本」）：载入在数据层仍记 reason='import' 快照（撤销链
    与「当前」标记完整性需要），但其内容与被载入的里程碑完全相同——渲染层按内容键隐藏
    （versionContentKey 走与快照相同的 fromJSON→toJSON 序列化管线，字符串直接比对；指纹不匹配
    时兜底显示），被载入的里程碑高亮「当前」（按内容判定，替代原 viewingVersionId 的 id 判定，
    编辑器/会话两场景统一），编辑器首次打开的幽灵 import 行同样消失。快照标签「载入版本」→
    「载入」（「版本」一词收归里程碑）。CanvasHistoryPopover/Timeline 的 viewingVersionId prop
    移除（editor.tsx 调用点同步）。
  验证：前端 `npm run ts-check`（改动文件 0 错误，总数 29 与基线一致均在未改动文件）、
  `npm test`（188 通过 27 文件，新增 canvas-history-popover.render.test.tsx 7 项——混排同列/
  无设为生效/里程碑动作与来源 meta/仅版本过滤/未落版引导/底部说明/载入不留行）、`npm run lint`
  （改动文件 0 error）。浏览器实测（localhost:3001 + 48080 真实数据）：会话页「历史」弹窗
  （快照行+未落版引导+底部说明）；编辑器 wf_087b971f1357（3 版本）时间线里程碑与来源 meta
  正确、载入 v1.2 → 头部「预览 v1.2 · 生效 v1.1」+「发布生效」→ 确认弹窗文案正确后取消；
  迭代后复验——刷新编辑器幽灵「载入版本」行消失、v1.1 标「生效中+当前」且无载入按钮，
  载入 v1.2 后时间线零新增行、v1.2 里程碑标「当前」、v1.1 恢复载入按钮。
  未验证：确认弹窗点「确认发布」后的 set-current 实际切换（避免动真实数据，端点行为未改动）；
  会话侧旧版「载入」的浏览器端到端（单测与代码链路已覆盖，未找绑定工作流的会话实测）；
  en-US 界面仅静态文案检查未切语言实测。

- 2026-11-04（单身份改版：版本只由「发布」产生，编辑器「保存」退役）：
  · 背景与决策：全量盘点版本表 6 个写入点（W1 草稿镜像 / W2 新建工作流 v1.0 即生效 /
    W3 apply 链路即生效 / W4 编辑器 create 不生效 / W5 set-current 指针 / W6 update 无前端入口），
    结合 Dify/Coze（版本=发布）与 Replit/Voiceflow（版本=commit+环境）对标，用户确认收敛为
    单身份模型——时间线上每个里程碑 = 一次用户显式发布，「保存了但不生效」状态从产品里删除。
  · 实现（apps/console，后端零改动）：
    ① editor.tsx 正式模式「保存」按钮移除（本地 IndexedDB 自动持久化 + beforeunload 守卫承担
    "别丢"职责），W4 前端停用（createVersion 调用、前端算版本号、首版特判、三次 listVersions
    回捞全删）；② 常驻「发布生效」按钮按内容键路由（document/version-content.ts 共享模块，
    fromJSON→toJSON 同管线字符串比对）：画布恰好等于某旧版本 → Popconfirm → set-current
    指针回拨；否则 → 确认弹窗（版本说明，有归属会话时 AI 代拟预填）→ applyDsl 生成新版本即生效
    （版本号后端统一编排）；无编码首存并入发布入口（编码弹窗文案改发布语义）；③ 头部状态徽标
    三态：✓与生效版本一致（vX）/ 预览 vX · 线上 vY / ●有未发布的修改（悬停说明已本地保存），
    替代 vN 三态标签与未保存角标；④ EditorHeader 的 currentVersionId prop 与父组件同名 state
    连根移除（内容键判定取代 id 记账）；⑤ 里程碑来源 meta 补 createdBy=system →「初始创建」
    （W2 初始版）；⑥ i18n 新增 12 key、清理 5 个无引用 key（saveAsNewVersion/versionEffective/
    previewLabel 等）。
  验证：`npm run ts-check`（改动文件 0 错误，总数 29=基线）、`npm test`（189 通过 27 文件，
    新增里程碑来源 system 用例）、`npm run lint`（改动文件 0 error）。浏览器实测
    （wf_087b971f1357）：刷新后头部「历史 + ✓与生效版本一致（v1.1）+ 发布生效[置灰]」，保存按钮
    消失；指针路径端到端——载入 v1.2 → 徽标「预览 v1.2 · 线上 v1.1」→ 发布生效 → Popconfirm
    「将 v1.2 设为生效版本」→ 确认 → 生效中切 v1.2、徽标转一致；再载入 v1.1 → 发布生效 →
    恢复 v1.1（数据净零变化）。
  未验证：apply 生成新版本路径的编辑器端到端点击（flowgram 画布节点自动化操作受限未能制造
    脏画布；弹窗/路由为静态+类型验证，applyDsl 端点与会话页「保存为版本」同源且久经浏览器验证）；
    draftMode（/chat 精修）头部回归未浏览器实测（代码路径未动，保存草稿控件保留）；
    en-US 仅静态检查。遗留规范债：W6 /update 端点可原地改已发布版本正文，与 NC-08 精神冲突
    （无前端入口，建议后续收口或加只读约束）。

- 2026-11-04 晚（用户实测反馈修复：多 CURRENT 数据完整性 bug + 时间线收敛为纯版本）：
  · 后端修复（is_current 归一化）：WorkflowDslApplyService.apply 的无 CAS 路径（编辑器「发布生效」
    不传 expectedRevision）此前直接以 is_current=1 落行并跳过清旧归一化——同一工作流累积多个
    is_current=1（wf_087b971f1357 实发三条：v1.0/v1.4/v1.5）。修复为归一化无条件执行
    （清旧 workflow_code 维度 + 设新 id 维度两条 UPDATE）。会话保存带 CAS 落行 0 历来走归一化，
    故此前未暴露。存量脏数据经 PUT set-current/197 归一（CURRENT 唯一 → v1.5）。
  · 时间线收敛（用户决策「仅仅需要版本功能」）：快照（回滚/修改节点/AI 每轮等前端变动记录）
    不再进入历史 UI——CanvasHistoryTimeline 只渲染版本里程碑；过滤 chips、AI 摘要批量拉取、
    快照对比弹窗、载入快照 Popconfirm 全部移除（撤销仍走 Ctrl+Z，引擎快照机制保留）。
    「当前」按内容键判定，同键多版本（连续发布仅坐标不同）取最新命中唯一标记。
  · 内容键忽略节点坐标（canvasContentKey，document/version-content.ts）：纯拖动是排版不是
    内容变更——随意移动节点不再产生「可发布差异」，编辑器发布按钮保持置灰（起因：用户拖动后
    点发布产生了仅坐标不同的 v1.3/v1.4/v1.5 垃圾版本）。里程碑「当前」与发布路由共用该键。
  · i18n 清理 22 个无引用 key（timelineAll/VersionsOnly、snapshotReason* 族、rollbackConfirm* 等）。
  验证：后端 `mvn -pl gaia-workflow-app -am test`（366 通过 0 失败，含新增回归钉子
    noCasPathStillNormalizesIsCurrent——无 CAS 路径归一化两条 UPDATE 必须无条件执行）；
    前端 `npm test`（192 通过 28 文件，新增 version-content 单测 4 项——坐标剥离/参数敏感/
    双管线一致/空输入兜底，渲染契约重写 7 项——快照不进 UI/无设为生效/里程碑动作与来源/
    内容键当前唯一标记/未落版引导/底部说明/初始创建）、`npm run ts-check`（本次改动文件 0 错误；
    总数 56 中 27 为并行开发新文件的既有错误，如 node-visualts/editor-prefs-panel/prefs.* 类型未接入）。
    浏览器复验：头部「✓ 与生效版本一致（v1.5）」发布置灰；时间线 6 张里程碑、生效中×1、当前×1、
    载入×5（v1.0-v1.4）、无快照行无过滤 chips。
  未验证：拖动节点后发布按钮保持置灰的浏览器端到端（画布自动化拖动受限；坐标剥离有单测覆盖，
    且用户复测即可）；运行中后端进程仍为修复前代码，**需重启后端**使归一化修复生效（数据已归一，
    重启前再从编辑器发布仍可能累积多 CURRENT）。

- 2026-11-04 深夜（两项收口：后端重启生效 + 一致性标准改 B「完全按直觉」）：
  · 后端重启落地：旧 jar（11-03 19:48 启动，SIGTERM 未退出，kill -9 后以新 jar 重启，pid 36261）
    ——归一化修复运行时验证：对 wf_087b971f1357 真实 apply 一次（v1.7，desc「归一化修复运行时验证」，
    内容与 v1.6 全同），生成后 CURRENT 唯一（v1.6 被正确清零）；21:12 旧代码造成的双 CURRENT
    已先经 set-current 归一。
  · 一致性标准改 B（用户决策，推翻同日晚间的「坐标剥离」标准）：内容键恢复全字段比对（含
    meta.position）——拖动节点即产生「未发布的修改」，可发布携带新坐标的新版本；防垃圾版本
    的职责交还给发布确认弹窗的差异说明（AI 代拟版本说明）。version-content.ts 的坐标剥离移除，
    canvasContentKey=全字段序列化；同键多版本 tie-break（取最新命中）保留为确定性防御。
    单测同步反转（坐标移动必须改变键），渲染测试注释更新。
  验证：`npm test`（192 通过 28 文件）、ts-check 本次改动文件 0 错误（其余错误在并行开发文件）；
  浏览器刷新后画布与 v1.7 全字段一致 → 徽标「✓ 与生效版本一致（v1.7）」发布置灰。
  未验证：拖动后徽标即时翻转的浏览器端到端（画布自动化受限；单测已锁行为，用户拖动即可复测）。


- 2026-11-04 深夜二（头部收纳：测试用例进工具栏、发布API 回工作流管理页）：
  · 编辑器头部「发布为 API」按钮及其私有弹窗/handlePublish/5 个死状态整体移除——API 发布/文档/
    重置/下架能力本就完整存在于工作流管理页行内「更多 → API 文档」（ApiDocModal，未发布可在弹窗
    内原位发布），编辑器不再重复入口；「测试用例」从头部移进画布工具栏运行组（DemoTools 新增
    testWorkflowCode prop，TestCaseSheetButton 新增 toolbar 图标变体并顺手 i18n 化 editor.testCases，
    画布取数经 useClientContext 就地封装）。模板编辑器不传（无运行组）。
  · 过程记录（git stash 事故与恢复）：验证类型基线时误用 git stash 对比，与用户并行改动
    （run-history-panel.tsx）冲突导致 pop 受阻——经分离 stash、格式化等价合并后全量恢复，
    diff 确认仅存预期差异（IconPulse），stash 已清空；lesson：并行开发期禁用整库 stash 类操作。
  验证：`npm test`（192 通过）、ts-check 改动文件无新错误（test-case-panel 的 5 个 TS2589 为
    既有 Semi 类型深度问题，HEAD 上即存在）；浏览器复验——编辑器头部只剩「历史/状态徽标/发布生效/
    添加节点/试运行」，测试用例图标按钮确认在 .demo-free-layout-tools 工具栏运行组内。
  未验证：测试用例 SideSheet 从工具栏打开的面板功能回归（数据面未改动）；/workflows 行内
    「更多 → API 文档」发布链路（ApiDocModal 未改动）。

- 2026-11-04（编辑器 UX 方案一基线落地，docs/editor-ux-benchmark-proposal-2026-11-03.md §4.6 用户确认方向，纯前端展示层、DSL 零改动）：
  · 偏好系统 `gaia.editor.prefs`（localStorage，单键 JSON）：主题(跟随应用/浅/深)、画布背景(点阵/无，网格待插件级支持)、
    强调色(4 预设，写 --g-workflow-line/port-color)、工具栏位置(默认下部居中/左下/顶部/左侧)、节点密度(紧凑=仅渲染表单头+224px 胶囊)、
    节点添加方式五开关(左栏面板/工具栏按钮/端口+/右键菜单/拖线)；齿轮弹层 components/editor-prefs-panel。
  · 图标单源 `nodes/node-visuals.tsx`：24px 线性 SVG + 六类分类色(--g-nodecat-*)，节点头/节点面板/LightCanvas 三处消费收敛，
    移除 img 位图依赖（assets 旧图标文件保留未删）；节点头新增副标题摘要（llm 模型名/http host/code 行数等，只读派生）。
  · 工具栏重组 components/tools：视图/编辑/插入/运行四段 + 「···」溢出(只读/报告/DSL/快捷键帮助 Modal)；小地图独立左下；
    位置随偏好实时移动。左侧节点面板 components/node-palette-rail（搜索+分类+点击放置，与右键菜单同创建链路）。
  · 主题 token 化：--ge-* 变量 + [data-theme=dark] 覆盖（头部/工具栏/节点卡/表单头），编辑器页随应用深色模式。
  · SelectorBoxPopover 硬编码英文接入 t()；i18n zh/en 增 ~60 key（语言包字面量改 as I18nLanguage 断言以携带自定义键）。
  验证：`npx tsc --noEmit`（30 个既有错误均在未改动文件，改动文件 0，与基线一致）；`npm test`（192 通过 28 文件；
  首轮出现过 version-content 2 例失败，单文件与全量复跑均绿，判定为一次性运行抖动）；`npx eslint 改动文件`（0 error，
  prettier 警告已 --fix）。未验证：浏览器端到端（深色/工具栏移位/紧凑/左栏放置的实际交互）、`npm run build`、e2e replay。
  未实施（后续分期）：连线样式偏好、画布网格背景、左栏真拖拽放置(现为点击放置)、节点悬停快捷操作/菜单增强/分组折叠描述（P1 余项）。

- 2026-11-05（呈现层改版二批：卡片摘要重写 + description 可空 + Schema 查看 + 工具栏/顶部栏归位，对标 Coze/Dify 视觉稿用户确认）：
  · 副标题摘要重写 `nodes/node-visuals.tsx`：卡片头部一行只放「决定行为的关键参数」——llm 显示解包后的
    模型名+温度+JSON 输出、http 显示 `METHOD host/path`（url 解包 template/constant）、code 显示 `函数名 · 语言`
    （替代“JS·N 行”）、start/end/variable/workloop 显示真实变量名/引用名、loop 显示遍历路径+上限；
    同时修复 6 处取数字段与 schema 不一致导致的「永不显示」：start 读 outputs（原误读 inputs）、end 读 inputs（原误读
    outputs）、llm modelName 未解包装、http url 未解包装、variable 读 assign（原误读 assigns）、workflow 读
    workflowName（原误读 workflowCode）。condition/branches 不再显示「N 个条件/分支」计数（卡片主体逐条渲染）。
    前端测试：`src/nodes/__tests__/node-visuals.subtitle.test.ts` 13 项钉住全部口径。
  · description 可空：`form-components/form-content` 去掉 `value || 默认文案` 兜底——画布空描述整行不渲染（零占位）、
    侧栏显示「双击添加描述」引导；画布双击变单行 Input（Enter/失焦保存、Esc 还原）、侧栏 TextArea（原有），
    编辑事件 stopPropagation 不再误开表单面板。schema 侧配套：16 个 node-schemas 根级补声明可选 string
    `description`（此前 data 根级 additionalProperties:false，改过描述的草稿发布/试跑会被 S3 判 INVALID_PARAM——
    后端测试 `NodeSchemaDescriptionOptionalTest` 钉住「可选放行/类型错拒绝/未知字段仍拒绝」，不降校验强度）。
  · Schema 查看（P-01/NC-04）：新增 `agent/node-templates/schemas.ts` 直接 import 后端 16 个 schema JSON、
    `components/node-schema-view`（树视图 + 全屏左右对照弹窗）；侧栏面板页签化「表单/参数 Schema/实例 JSON」，
    卡片头部 ⤢（原「导出 JSON」按钮升级为契约⇄实例双栏视图）。契约只读派生，前端不复制第二套规则。
  · 工具栏单胶囊分组 `components/tools`：历史（撤销/重做，走 ctx.history 与 ⌘Z 同源）· 视图（−/%/＋ 三件套 + 适应 +
    小地图）· 布局（自动布局回归）· 插入 · 变量 Dock · 运行（历史/保存/试运行/测试用例）·「⋯」溢出（交互模式
    鼠标/触控板）；删除旧 ZoomSelect 单下拉。文档级动作（发布/版本历史）归顶部栏。
  · 顶部栏归位 `editor.tsx`：工作流名就地编辑（点击变输入框，随下次发布生效）；版本状态徽标移到名称旁；
    草稿模式合并为一枚「会话草稿 · 未保存」徽标；齿轮置尾；「专家模式」标签移入偏好面板。
  · 卡片宽度 360→300：base-node + 13 个节点注册表 meta.size 同步，后端镜像 `WorkflowLayoutEngine.NODE_SIZES`
    与 `CanvasPlacement.BOX_W` 同步（契约测试 WorkflowLayoutEngineNodeSizeContractTest 钉住），蛇形列距测试常量跟随。
  验证：前端 `npm test`（213 通过 30 文件，新增 subtitle 13 项）；`npm run ts-check`（改动文件 0 错误，31 个既有
  错误均在未改动文件：ModelManagement/test-case-panel Semi 类型深度等基线）；eslint 改动文件 0 error。后端
  `mvn -B -pl gaia-workflow-app -am -Dtest=WorkflowLayoutEngineNodeSizeContractTest,WorkflowLayoutEngineTest,
  NodeSchemaBadcaseCorpusTest,NodeCatalogTest,SessionDraftLayoutRevisionTest,NodeSchemaDescriptionOptionalTest test`
  （35 通过 0 失败）。浏览器实测（localhost:3001 /editor/wf_087b971f1357，DOM 断言）：开始「输入 input · score」、
  结束「输出 result」、条件节点无计数副标题、空描述零占位 + 侧栏引导行、卡片 ⤢ 弹窗契约树⇄实例双栏、侧栏三页签、
  工具栏/顶部栏新布局全部就位。未验证：截图级视觉走查（IAB webview 对 flowgram 画布截图超时，需外部浏览器人工目测）、
  后端运行时（WorkflowLayoutEngine/CanvasPlacement 改动需重启后端进程才对布局 API 生效）、真实发布链路带 description
  草稿的端到端（单测覆盖校验语义）。
  并行协调记录：本批与另一会话（vardock 验证）在同一工作区交错 stash/restore 两次；已从 stash 完整恢复双方改动，
  stash 条目（vardock-verify*）保留未动，后续如 pop 冲突以工作区现状为准。

- 2026-11-06（画布工具栏/侧边栏/节点菜单交互更新 + 测试用例面板重设计含 AI，纯展示层 + 测试用例 AI 端点，节点契约零改动）：
  · 工具栏：删除「⋯ 更多」溢出菜单（InteractiveOverflow，仅交互模式两项无使用价值）——交互偏好（鼠标/触控板）
    迁入齿轮设置弹层「工作区」分组（RadioGroup，存储键 workflow_prefer_interactive_type 不变）；运行组顺序改
    变量·测试用例·运行历史·试运行（2026-11-06 用户决策：测试用例移到运行历史前）。清理 .gaia-tools-overflow
    CSS 与 tool.more i18n 键。
  · 图标单源：新增 assets/icon-test-case（list-checks 勾选清单）、icon-run-history（scroll-text 运行日志）、
    icon-variable（{x} 变量符号）、icon-sparkles（AI 入口），均 Lucide 几何 ISC、currentColor 线性 SVG，
    与 IconAutoLayout 同套路（JSX 字面量，icon={X} 传元素）；三处入口替换（变量按钮弃用 PNG 位图）；
    RunHistoryButton 补齐缺失的 Tooltip/aria-label。
  · 节点「···」菜单新增「导出 JSON」（node.toJSON() 下载 <nodeId>.json，侧边栏页签退役后实例 JSON 唯一出口）；
    顺带修复 delete 项反向逻辑（原 !!(canDelete?.() || deleteDisable) 在 canDelete 返回真值时反而禁用，
    现为 deleteDisable===true || canDelete===false 才禁用——当前无 registry 定义 canDelete，行为无实际变化）。
  · 侧边栏仅保留表单（node-form-panel 删除 表单/参数Schema/实例JSON 页签与 FormHeader——FormHeader 在侧栏态
    返回 null，标题/⌈查看Schema⌉/··· 只在画布卡片；新增右上幽灵 ✕；底部「测试此节点」保留）。
  · 测试用例面板重写（SideSheet 460→520）：状态统计条 + 操作行 + 用例卡（状态图标/✓n✗n 摘要/可展开断言明细，
    期望 vs 实际等宽对齐，真实图标替代 emoji）；全量 i18n（testCase.* 55 键 zh/en）+ --ge-*/--g-nodecat-* token。
  · AI 三能力（TestCaseAiService，LlmCompletionService 复用，「AI 起草、用户确认」边界——AI 不落库）：
    POST /test-case/ai-generate（场景文本输入定向生成，空 prompt 则模型自行设计边界用例——2026-11-06 用户
    要求；画布摘要只含节点清单/连线/start-end 参数声明，刻意不含节点配置值，凭证零暴露）、
    /test-case/ai-assertions（依据最近实际输出建议断言，勾选合并进 expected）、
    /test-case/ai-diagnose（失败断言→结论+可采纳期望值修复）；op 白名单/条数封顶/围栏剥离收敛。
  验证：前端 `npm test`（216 通过 31 文件，新增 test-case-panel/index.render.test.tsx 3 项——列表统计/AI 定向
    生成勾选只存所选/非法 JSON 保留现场）、`npx tsc --noEmit`（改动文件新增错误 0；test-case-panel 剩 5 个
    TS2589 为 HEAD 同类 Semi 泛型深度问题，status 2026-11-04 已记录）、eslint 改动文件 0 error；
    后端 `mvn -B -pl gaia-workflow-app -am -Dtest=TestCaseAiServiceTest,NodeCatalogTest,
    GetKnowledgeCatalogTest,NodeKnowledgeContractTest,NodeSchemaBadcaseCorpusTest test`
    （36 通过 0 失败，TestCaseAiServiceTest 6 项）。浏览器实测（localhost:3001 /editor/wf_087b971f1357，
    headless Chromium DOM 断言）：工具栏顺序 变量(824)<测试用例(865)<运行历史(913)<试运行(947)、无「更多」、
    三新图标 svg 渲染；侧边栏无页签/有测试条与幽灵✕；节点···悬停出「导出 JSON」；设置弹层滚动交互行；
    测试用例面板 AI 输入区（textarea+提示文案）。未验证：AI 端点运行时（48080 后端进程仍为旧代码，需重启后
    新端点才可用；服务层已有单测覆盖）、真实 LLM 调用生成质量、深色主题走查、en-US 切换实测。
  用户决策记录：画布节点交互重设计（芯片切换紧凑/n8n 方块/双击完全面板/删设置紧凑开关）本轮不做
    （视觉稿 docs 外会话记录，用户评价效果不好暂缓）；紧凑模式开关保留在设置弹层。
  11-07 补记（用户实测「AI 生成报 Not Found」）：根因是 48080 仍跑 11-05 旧 jar（新端点 404，Spring 默认
    错误体的 error:"Not Found" 被面板 Toast 透传）。已 mvn package 重新打包并原样重启（同 cwd、同
    java -jar 命令，旧进程 SIGTERM/kill -9，新进程日志 /tmp/gaia-backend-48080.log）。复验：ai-generate
    200；浏览器端到端（3001 → 编辑器 → 测试用例 → AI 生成，输入场景「空输入兜底与超长文本」）真实 LLM
    返回 5 条定向建议、勾选区与「保存所选（5）」正常渲染；list/run/models-health 200；新进程日志真实
    ERROR 0（grep 命中 94 条为 SQL 行转储噪音）。未验证：保存所选入库的真实写库（留用户操作，走既有
    /test-case/create）；ai-assertions/ai-diagnose 的真实 LLM 调用（服务层单测覆盖，未实测）。
  11-07 补记二（用户实测「全部运行没反应」）：根因是 run 接口 workflowCode 分支存量 bug——旧代码
    `JSONUtil.parseObj(runCase(...).toString())` 把 Lombok 实体 toString（"WorkflowTestRun(id=...)"）当
    JSON 解析，首次有启用用例时必抛 "A JSONObject text must begin with '{'" → 500；此前该工作流无用例，
    循环不执行故从未暴露。修复：改 List<WorkflowTestRun> 直传 Jackson（与单用例分支同口径）。前端
    runAll/runOne 补齐错误反馈（非 2xx/error 字段 → Toast）与 loading 态（全部运行按钮、单卡运行 Spin），
    消除「静默无反应」。已重启后端复验：/run workflowCode 分支 200、5 条用例真实执行（failed 均为断言
    未过——AI 草稿期望值质量问题，如 equals "null"，属 ai-diagnose 修复场景，非链路错误）；浏览器端到端
    ——点击全部运行后统计 0 通过/5 失败/0 未运行实时更新、断言明细与 AI 诊断入口渲染；ai-diagnose 真实
    调用返回 diagnosis+fix 结构、ai-assertions 返回合理建议（result contains "及格"）。验证：前端 vitest
    面板 3 项过、eslint 0 error；后端重新打包重启（mvn package -DskipTests）。
  11-07 补记三（用户反馈：侧栏无头太丑）：FormHeader 侧栏态从「返回 null」改为渲染精简头——
    logo 芯片（分类色单源 getIcon）+ 可编辑标题（TitleInput 新增 singleClickEdit：侧栏单击进入编辑，
    画布卡片保留双击避免与拖拽误触冲突）+ 运行状态点 + 关闭按钮（并入头部右侧，移除 NodeFormPanel
    浮层幽灵 ✕）；⤢ 查看 Schema / ··· 菜单仍只在画布卡片，页签不回归。验证：ts-check 改动文件 0 错误、
    vitest 216 全过、eslint 0 error；浏览器实测（3001，dev server 曾停止已重新拉起）——侧栏头部
    芯片（逻辑橙）/关闭/无页签/标题显示正常，单击出输入框，改名「-改」后画布卡片同步、还原同步无残留。
  11-07 补记四（用户反馈「全部运行后按钮被挤到下一行」，视觉稿确认方案 A）：根因是统计与操作同单行
    flexWrap——「失败」标签条件渲染（0 失败不显示 → 运行后凭空 +70px）、loading 转圈 +16px，行宽突变即
    换行。修复（test-case-panel）：统计/操作分两行；三个统计标签常驻（失败 0 时 opacity .5 灰态，只改
    文字不增删）+ 右侧「N 条」计数；操作行 nowrap，「全部运行」minWidth 96 预留 loading 宽度。视觉稿
    （会话 visualization testcase-actions-redesign，4 变体可交互验证）现状复现跳动 43→79，A/B/C 三方案
    900/420 宽零跳动；用户选定 A。验证：vitest 面板 3 项过、eslint 0 error、ts-check 改动文件非 TS2589
    错误 0；浏览器真实运行复验——统计 0失败/5未运行 → 5失败/0未运行 + loading 中，按钮 y=108 全程不变。

## 未完成及注意事项

| 规范 | 当前边界 | 后续验收 |
|---|---|---|
| NC-01/03/04 | 非全部画布创建、端口、动态输出统一 | 逐节点接入及一致性测试 |
| NC-02 | validateParams 对目录外类型可能返回空问题 | 所有调用入口先校验类型；不得单独依赖该返回值 |
| NC-05/06 | 未完成统一编译、草稿分级、递归子图和公共绑定语义 | 同文档跨入口一致，图与引用整链回归 |
| NC-07 | 未完成证据失效和完整有限修复协议 | 修改后测试状态过期、结构化错误与预算验证 |
| NC-08 | version 为元数据，NodeCatalog 仍按 type 索引 | type/version 解析、执行产物锁定、发布并发与迁移测试 |
| NC-09 | 未完成知识派生和数据库覆盖冲突同步 | 来源哈希、冲突处理和生成内容只读 |

尚无 contracts/nodes/<type>/v<version> 目录，不得因设计建议而复制一套平行定义；先提交明确迁移计划。

## 验证记录的边界

首批实施记录（`docs/node-catalog-p1-implementation.md`，已随 docs 目录移除，git 历史可检索）记录前端 90 项测试及构建通过，后端相关测试通过，前端类型检查未通过。未执行浏览器端到端、真实模型评测、全量后端测试和数据库迁移。本次不把旧记录作为重新验收结果。

后续更新本文件时附代码入口、执行命令及日期；未完成项只有在代码与测试都有证据时才能移入已接入。
