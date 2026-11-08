# 实施状态

核查日期：2026-11-08。本文件是状态索引，不是测试报告。2026-11-08 整理：将 2026-10-24 至 11-07 的逐日实施日志压缩为事实索引；过程叙事、参数细节与当日验证输出见 git log 与 changes/ 归档，不再在此堆积。

## 已接入（摘要）

- node-catalog/index.json 登记 16 类节点；defaults.json 12 类可生成默认值；node-schemas 16 份 Draft-07 Schema。NodeCatalog/NodeSchemaRegistry 启动即检查缺失与非法资源（NC-02）。
- 前端模板直接 import 同一份 JSON：深拷贝默认值、数组整体替换、拒绝未知类型；前后端生成清单按 aiCreatable 派生；AI knowledge 在散文缺失时仍返回契约（NC-01/03/04）。
- 单一事实源钉子三件套：前端 inputs 由 x-gaia-form-inputs 派生（defaults 无副本，2026-10-26 收口）；节点尺寸前后端镜像由 WorkflowLayoutEngineNodeSizeContractTest 钉住；动态输出（condition/branches）三端口径（运行时 getOutputParameters / 校验 inferOutputFields / 画布变量引擎）由 specs/node-contracts/fixtures/ 共享样例双端红灯（NC-06）。
- 校验链：WorkflowDslValidator S1 结构 / S2 拓扑（MULTI_START、MULTI_END 均 error）/ S3 schema+端口 / S4 引用；草稿 normalizeDoc 与落版 canonicalize 全入口共用 NodeDataNormalizer；画布保存/AI 工具/落版同一链路（P-03）。
- 画布布局收口后端 ELK layered（WorkflowLayoutEngine：NETWORK_SIMPLEX + 层内居中对齐 dagre 观感、固定 RANDOM_SEED 确定性）；前端 headless 布局链已删除，仅手动「自动整理」保留 FlowGram 内置 dagre；`POST /api/agent/session/{key}/auto-layout` 为验收/运维入口。
- 版本模型（2026-11-04 单身份改版，用户决策）：版本只由「发布」产生，编辑器「保存」退役（本地 IndexedDB 兜底）；发布按内容键路由——恰好等于旧版本则 set-current 指针回拨，否则 applyDsl 生成新版本即生效；is_current 归一化无条件执行（含无 CAS 路径，2026-11-04 修复多 CURRENT 数据完整性）；内容键为全字段比对（拖动即「未发布的修改」，2026-11-04 深夜用户决策改 B）；回滚=指针回拨不产生新版本行（NC-08 口径）。
- AI 侧：画布草稿工具（node add/update 支持 parentId 落 loop 容器、connect 容器内边、get(canvas) 回执含子流程入出参 schema）；ask_user 多轮编排；测试用例 AI 三端点（ai-generate / ai-assertions / ai-diagnose，AI 只起草不落库）；版本说明 AI 代拟（LLM 失败/超时回退确定性摘要）；autoLayout 工具走 ELK。
- llm 凭证策略（2026-10-25 用户决策）：AI 生成时由 get(target=knowledge, nodeType=llm) 的 platformDefaultModel 三值原样填入、必填不自编，**无任何运行时注入**；平台默认单源 AgentModelConfigService.getPlatformDefaultLlmConfig（模型管理全局默认 > llm_config > yml，2026-10-26 修掉两条配置链）；前端经 `GET /api/agent/models/node-default` 预填空位。注意该端点返回明文 apiKey——与节点 inputsValues 明文携带凭证为同一既定暴露面（用户决策）。
- 编辑器呈现层：偏好系统 gaia.editor.prefs（主题/背景/强调色/工具栏位置/密度/添加方式五开关）；图标与副标题单源 nodes/node-visuals.tsx；工具栏「视图/编辑/插入/运行」分组 + 齿轮收纳；侧栏仅表单 + 精简头；description 可空（16 个 schema 根级声明，NodeSchemaDescriptionOptionalTest 钉住不降校验强度）；Schema 查看器（契约⇄实例双栏，前端 import 后端 schema 无第二套规则）；节点 ··· 菜单「导出 JSON」；历史时间线纯版本里程碑（快照不进 UI，撤销走 Ctrl+Z）。
- 2026-11-08：W6 规范债收口——`PUT /api/workflow-version/update` 不再允许修改既有版本 workflowData（NC-08「正式版本不可原地改正文」），仅放行元数据（如描述）更新；回归测试 WorkflowVersionUpdateImmutabilityTest。

## 逐日事实索引

- 2026-10-24：NodeDataNormalizer 吸收模型常见写法（http api.* 提层、start 扁平 outputs 提 properties、code 入参键回填 + 带 language 裸 script 归一）；ChainParser 放行条件/分支多出边汇合；SpEL `.length/.size` 内置访问器；GraalJS fat jar 类加载修复。
- 2026-10-25：编辑器渲染一致性双侧修复（http api.url 包装、template token 空格收敛、fillStaticOutputs 整体对齐 x-gaia-outputs、引用校验前移 + TEMPLATE_REF_FIELD warning、code 入参类型传播、render-compat 存量展示修复）；llm outputMode=text/json 全链路（schema/运行时/校验/表单/提示词五层）；对象输出声明引用驱动补全；SSE 断线对账自愈；凭证策略五批演进收敛为「AI 生成时填入」；30 对话全节点评测（16/30 通过，14 失败归因对话模型编排能力而非平台缺陷）；AgentSkillCatalog 种子按 classpath 内容同步。已知渲染层边界：`.length` 在 PromptEditor 行内徽标显示 Unknown（flowgram 变量树不暴露 length，node_modules 渲染层残余）。
- 2026-10-26：end 顶层唯一（MULTI_END，变更归档 2026-10-26-end-node-uniqueness）；llm 表单双源漂移收口（inputs 由扩展派生、FormInputs.order 按契约行序）；凭证三字段统一 fatal；平台默认配置单源 + node-default 端点。
- 2026-10-28：assignee 节点全量移除（前端注册/后端枚举/校验链；render-compat stripRemovedNodes 幂等剥离存量草稿并过滤悬空边）。
- 2026-10-29：动态输出物化（变更归档 2026-10-29-dynamic-node-output-materialization）；画布布局收口 ELK（尺寸单一来源前端注册表 + 契约测试）。
- 2026-10-30：gaia_workflow_version.source_session 溯源列（SqliteColumnMigrator PRAGMA 探测幂等补列）；版本说明 AI 代拟端点。
- 2026-11-03：ELK 两轮调参对齐 dagre 观感（层间距 ≥100、NETWORK_SIMPLEX、层内居中后处理，观感钉子测试）；历史统一时间线（快照+版本合并展示，「设为生效」直切移除，线上切换唯一入口=编辑器发布生效）。
- 2026-11-04：单身份版本模型（六写入点盘点 W1-W6 后收敛）；多 CURRENT 数据完整性修复；时间线收敛纯版本；内容键标准两轮迭代定为全字段比对；编辑器头部收纳（发布 API 回工作流管理页、测试用例进工具栏）；编辑器 UX 方案一基线（偏好系统/图标单源/工具栏重组/主题 token 化）。
- 2026-11-05：卡片副标题重写（修复 6 处取数字段与 schema 不一致导致的「永不显示」）；description 可空；Schema 查看器；卡片宽 360→300（前端 13 注册表 + 后端 NODE_SIZES + CanvasPlacement 三端同步）。
- 2026-11-06：工具栏/侧栏/节点菜单交互更新；测试用例面板重设计 + AI 三端点。用户决策记录：画布节点交互重设计（芯片紧凑/n8n 方块/双击全面板）暂缓不做。
- 2026-11-07：交互审计 53 项修复（弹窗遮罩竞态/数据守卫/会话与编辑器交互）；测试用例 run workflowCode 分支存量 500 修复（Lombok 实体 toString 误当 JSON 解析）；侧栏精简头；面板统计/操作分两行防跳动；runAll/runOne 补错误反馈与 loading 态。
- 2026-11-08：W6 规范债收口（见已接入末条）；ts-check 29 个既有错误清零并纳入 CI verify（Semi Select 显式泛型实例化 `<Select<T>>`、runtime client DI rebind 显式断言）；运行时 console 扫描收口——后端启动+运行期 WARN/ERROR 清零（networknt x-gaia-* 扩展键注册 NonValidationKeyword、mybatis log-impl StdOutImpl→Slf4jImpl 消 SQL 全量转储），前端 7 路由加载与编辑器/chat 交互 0 告警（useLanguage 订阅微任务化消除 render-phase 跨组件更新、flowgram sortAll stub 警告精确静音补丁 plugins/flowgram-compat.ts）；包管理收口 pnpm（onlyBuiltDependencies 放行 esbuild/core-js）；docs 目录整体移除、checklist 命令 npm→pnpm、本文件瘦身（逐日日志压缩为事实索引）。

## 未完成及注意事项

| 规范 | 当前边界 | 后续验收 |
|---|---|---|
| NC-01/03/04 | 非全部画布创建、端口、动态输出统一 | 逐节点接入及一致性测试 |
| NC-02 | validateParams 对目录外类型可能返回空问题 | 所有调用入口先校验类型；不得单独依赖该返回值 |
| NC-05/06 | 未完成统一编译、草稿分级、递归子图和公共绑定语义 | 同文档跨入口一致，图与引用整链回归 |
| NC-07 | 未完成证据失效和完整有限修复协议 | 修改后测试状态过期、结构化错误与预算验证 |
| NC-08 | version 为元数据，NodeCatalog 仍按 type 索引；~~W6 /update 可原地改已发布正文~~（2026-11-08 已收口，见已接入） | type/version 解析、执行产物锁定、发布并发与迁移测试 |
| NC-09 | 未完成知识派生和数据库覆盖冲突同步 | 来源哈希、冲突处理和生成内容只读 |

尚无 contracts/nodes/<type>/v<version> 目录，不得因设计建议而复制一套平行定义；先提交明确迁移计划。

其他运行时注意：`.length/.size` 引用校验已放行但 flowgram 变量树不暴露（渲染层残余，见 2026-10-25 条）；模型管理页全局默认与节点内凭证为同一配置链（getPlatformDefaultLlmConfig），禁用默认条目时回退且不返回空凭证。

## 验证记录的边界

首批实施记录（`docs/node-catalog-p1-implementation.md`，已随 docs 目录移除，git 历史可检索）记录前端 90 项测试及构建通过，后端相关测试通过，前端类型检查未通过。未执行浏览器端到端、真实模型评测、全量后端测试和数据库迁移。本次不把旧记录作为重新验收结果。

后续更新本文件时附代码入口、执行命令及日期；未完成项只有在代码与测试都有证据时才能移入已接入。逐日日志压缩后，新增条目请保持一行事实 + 验证数字的粒度，不再展开过程叙事。
