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
  [docs/node-coverage-30-conversations-2026-10-25.md](../../docs/node-coverage-30-conversations-2026-10-25.md) 执行记录一节）：
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

[首批实施记录](../../docs/node-catalog-p1-implementation.md) 记录前端 90 项测试及构建通过，后端相关测试通过，前端类型检查未通过。未执行浏览器端到端、真实模型评测、全量后端测试和数据库迁移。本次不把旧记录作为重新验收结果。

后续更新本文件时附代码入口、执行命令及日期；未完成项只有在代码与测试都有证据时才能移入已接入。
