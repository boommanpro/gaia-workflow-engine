# Gaia 节点 Schema 治理：分析、业界对标、治理方案与验收方案

> 2026-10-24 · 状态：**已执行完毕（阶段 1-4 全做）**，验收结果见文末「执行记录」。
> 范围：`apps/api/gaia-workflow`（引擎 15 解析器、11 份 node-schemas、AI 工具链）、`apps/console`（FlowGram 前端）。
>
> **终版决策（2026-10-24 用户确认）**：
> - D1 schema 力度：**全严格**（`additionalProperties:false`，人机同规，无双视图）；
> - D2 code.language：默认 `javascript`，枚举保留 js 系/java/groovy，python 待引擎支持后入枚举；
> - D3 node add 校验：**软启动**（首错 warning+fixHint，同错二次拒绝）；
> - D4 模板引用未知节点：升 **error**（后端拦截 + 模型 violations 回喂 + 前端弹错）；
> - D5 `chain`：全库存量 0 个（21 版本 + 68 产物实测），直接删除；
> - D6 范围：**阶段 1-4 全做**；
> - **零兼容约束**：库存量均为测试数据，可删除；DB 种子表（agent_skill_file / agent_tool_definition / agent_prompt_config）一并清空重建，消除"只补缺不覆盖"漂移。

---

## 0. 结论（TLDR）

1. **11 份 JSON Schema 名存实弱**：全部 `additionalProperties: true`，真实约束只有 required、少量类型和 1 个 enum（branches.logic）。真正的规则——operator 12 枚举、http method 枚举、script language 枚举、bodyType 枚举、prompt 必须 template、ref 的 content 必须是数组、end 键声明一致性——**全部活在 6 份散文知识源里**，schema 一个都没表达。
2. **同一规则最多重复 6 处且已实际漂移**：`workflow` 类型后端已放行（2026-10-23）但提示词/技能清单未更新；node-knowledge 宣传 19 种类型但可建只有 12 种；工具 schema 缺 `items[].ref/id`（执行器和提示词都支持）；前端 `GENERATABLE_NODE_TYPES` 与后端 `SUPPORTED_TYPES` 方向相反。
3. **校验漏斗错位是 AI 出错的直接原因**：`node add` 完全无校验且静默归一，`edge` 工具不校验 fromPort 合法性，错误要等到 run 预检甚至运行时才爆——AI 无法把"动作"和"反馈"关联，历史事故（fromPort 写 true/false 静默 canceled、占位 url 空跑通过、引用不存在字段静默 null 假成功）全部源于此。
4. **三套节点默认值互相矛盾**（画布 onAdd / AI node-templates / initial-data）：code.language `jsReturn` vs `javascript`；string-format.language `spel-standard` vs `spel-vue`；画布新建 http 节点天然违反自家 schema 的 `api.required=[method,url]`。
5. **业界对标**：FlowGram 本身（本项目所用框架）的"一份 JSON Schema 驱动表单+校验+变量引擎"已是同类最优；与 n8n AI Builder 的差距在**工具化校验闭环**（细粒度工具入参 strict 校验、validate 自检、程序化 lint、确定性 auto-fix、文档即工具）。治理方向不是换框架，而是**把 schema 收紧成单一事实源 + 把校验前置到生成点 + 知识源由 schema 派生**。

---

## 1. Schema 全量盘点（字段级）

### 1.1 类型清单的四个口径

| 口径 | 位置 | 内容 | 数量 |
|---|---|---|---|
| 引擎枚举 | `NodeTypeEnum.java:11-30` | start end condition code note group comment branches string-format variable http llm loop block-start block-end continue break **chain** workflow assignee | 20 |
| 引擎解析器 | `ChainParserManager.java:32-46` | 上述去掉 note/group/comment/assignee(NO_PARSE) 和 chain(未注册→运行时"不支持的节点类型") | 15 |
| JSON Schema | `node-schemas/*.schema.json` + `NodeSchemaRegistry.java:43-45` | start end code branches condition string-format variable http llm loop workflow | 11 |
| AI 可建 | `WorkflowDslCanonicalizer.SUPPORTED_TYPES:44-46` | 11 种 + comment | 12 |

另：前端 `nodeRegistries`（19 项注册）、前端 `GENERATABLE_NODE_TYPES`（含 assignee 不含 workflow，与后端方向相反）、node-knowledge.json（19 条目，含 assignee/block-*/break/continue/comment/group）。`chain` 是死枚举（无 parser 无 schema）。

### 1.2 字段级清单（schema 声明 vs 引擎实际读取 vs 前端实际写入）

图例：✅=读取/声明且被消费；⚠️=声明但无人读（死字段/漂移）；`R`=required；`E`=已有 enum；❗=引擎读但 schema 未声明。

#### start（schema: `outputs` R）
| 字段 | schema | 引擎读 | 前端写 | 问题 |
|---|---|---|---|---|
| title | string | ✗（画布展示） | ✓ | 无 |
| outputs.{type,properties} | object | ✅ `outputs.properties[].{type,default,isPropertyRequired}`（StartNodeParser:18-26） | ✅ 侧栏 JsonSchemaEditor | properties 内部无任何约束；缺 properties 项→S3b fatal |
| outputs.properties[].default | ❗ | ✅（缺省时 Normalizer 按 type 补零值） | ✓ | schema 未声明 |

#### end（schema: `inputsValues` R）
| 字段 | schema | 引擎读 | 前端写 | 问题 |
|---|---|---|---|---|
| title | string | ✗ | ✓ | |
| inputsValues | object R | ✅（EndNodeParser:18-28，`{constant\|ref}` 包装） | ✅ FormInputs | **空对象也过 schema**；"键必须声明在 inputs.properties"未表达（S3b 兜底） |
| inputs.{type,properties} | object|null | ✅ 表单声明生成 Parameter | ✅ 自动补声明 | |

#### llm（schema: `inputsValues` R）
| 字段 | schema | 引擎读 | 前端写 | 问题 |
|---|---|---|---|---|
| title | string | ✗ | ✓ | |
| inputsValues | object R | ✅ 6 键：modelName/apiKey/apiHost/temperature/systemPrompt/prompt（LlmNode:105-136） | ✅ prompt-editor | **required 只到对象级**：缺 prompt 过 schema、run 预检才 fatal；prompt 必须 `type:template` 未表达（constant 也能过 schema，知识库明文要求 template） |
| inputs | object | ✗（运行时只读 inputsValues；`x-gaia-form-inputs` 由 Normalizer 整体替换对齐） | ✅ 由 schema `x-gaia-form-inputs` 驱动表单 | 声明在 schema 但语义只属前端 |
| outputs | object | ✗ 固定输出 `result` | ✅ | outputs 与 `x-gaia-outputs:["result"]` 的一致性无校验 |
| timeout.{timeout,retryTimes} | integer | ✅（默认 30000/1） | ✅ | 无 min/max |
| `x-gaia-form-inputs` | 扩展键 | ✗（Normalizer 单一事实源对齐 inputs） | ✅ 驱动表单 | **元数据非约束**：其 required 不参与 draft-07 校验 |

#### http（schema: `api` R，api 内 method/url R）
| 字段 | schema | 引擎读 | 前端写 | 问题 |
|---|---|---|---|---|
| title | string | ✗ | ✓ | |
| api.{method,url} | string / `{}` | ✅（HttpNodeParser:25-61） | ✅ 画布 onAdd 只给 `{method:'GET'}` 无 url | **method 无枚举**（`Method.valueOf` 运行时炸）；**url 空 schema 任意类型**；**画布新建即违反自家 required**（保存时 fatal——刻意但矛盾） |
| headersValues / paramsValues | object | ✅ 值可为裸串或 `{constant\|ref}` 包装 | ✅；插件同时回写派生 `headers`/`params`（JSON Schema） | schema 未声明 headers/params（靠 additionalProperties 容忍）；**AI 模板与画布两套形状并存** |
| body.{bodyType,json} | string / `{}` | ✅ 仅 bodyType=JSON(忽略大小写) 时消费 json（HttpNode:194-221） | ✅ onAdd `{bodyType:'JSON'}`，AI 模板 `{bodyType:'none'}` | **bodyType 无枚举**（合法 none/JSON）；json 任意类型 |
| timeout.{timeout,retryTimes} | integer | ✅（默认 10000/1） | ✅ | |
| inputs / outputs / inputsValues | ⚠️ | **✗ 不读**（历史遗留：旧归一化曾把扁平字段收进 inputsValues，引擎从不读，NodeDataNormalizer:59-63 专门负责搬走） | 部分 | **死字段**，最坑 AI 的历史事故来源之一 |

#### code（schema: `script` R，script.content R）
| 字段 | schema | 引擎读 | 前端写 | 问题 |
|---|---|---|---|---|
| title | string | ✗ | ✓ | |
| script.{language,content} | string / string | ✅（CodeNodeParser:26-70：null/jsReturn/javascript/js→GraalJS，java/groovy→动态编译） | ✅ | **language 无枚举**——python 等过校验、运行期才 Unsupported；三处默认值不一致：画布 `jsReturn`/AI 模板 `javascript`/initial-data `java` |
| inputsValues + inputs.properties | object | ✅ 声明 key→Parameter，无值默认 REF `[key]`（CodeNodeParser:91-113） | ✅ infer 插件由 inputsValues 反推 inputs | 值包装形状未表达；属性值非对象→ClassCastException |
| outputs.properties | object | ✅ **输出白名单**（未声明键被丢弃——"跑成功拿不到值"事故源） | ✅ | "白名单"语义未表达；`outputsValues` 引擎读但 **schema 未声明**（❗） |

#### condition（schema: `conditions` R，items.key R）
| 字段 | schema | 引擎读 | 前端写 | 问题 |
|---|---|---|---|---|
| conditions[].key | string R | ✅（结果写 `result[key]`，出边 fromPort=key） | ✅ | |
| conditions[].value | object | ✅ `{type,content,operator,left,right}`；left/right ref→content 数组、constant→任意（ConditionNodeParser:45-112） | ✅ 画布默认 `{type:'expression',content:''}` | **operator 12 枚举未表达**（contains/not_contains/eq/ne/gt/lt/ge/le/is_empty/is_not_empty/is_true/is_false）；**未知 operator 运行时 log.warn+静默 false**；left/right 包装形状未表达 |

#### branches（schema: `branches` R，items.id R）
| 字段 | schema | 引擎读 | 前端写 | 问题 |
|---|---|---|---|---|
| branches[].id | string R | ✅（出边 fromPort=id） | ✅ | |
| branches[].title | string | ✅ 展示 | ✅ | |
| branches[].logic | string **E**[and,or] | ✅（**唯一存在的 enum**；未知/ null→静默 false，BranchesNode:86-87） | ✅ | 已达标，可作其余字段的范本 |
| branches[].conditions[] | array（无 items schema） | ✅ 同 condition | ✅ | **items 无 schema**——condition 的规则全部未继承 |

#### loop（schema: **无任何 required**）
| 字段 | schema | 引擎读 | 前端写 | 问题 |
|---|---|---|---|---|
| loopFor | `{}` 任意 | ✅ `{type:ref,content:数组}\|{constant}`（LoopNodeParser:103-150） | ✅ 表单 required | 空 schema；loopFor 缺→S3b warning |
| loopOutputs / outputs | object | ✅ / 部分 | ✅ BatchOutputs 插件 infer | |
| maxLoopCount | integer | ✅ `Integer.parseInt` **非数字运行时 NumberFormatException**；0=不限 | ✗ **前端无入口** | 无 minimum；只在 schema 声明，人机都改不到 |
| inputsValues | ⚠️ | **✗ 不读** | ✓ | 死字段 |
| blocks / edges | array | ✅ 但读的是**节点级** `node.blocks/node.edges`，schema 声明在 **data 级**（FlowGram 序列化 blocks 在节点顶层） | ✅ 节点级 | **schema 位置误导**（data.blocks/data.edges 实际不存在） |

#### variable（schema: **无任何 required**）
| 字段 | schema | 引擎读 | 前端写 | 问题 |
|---|---|---|---|---|
| assign[].operator | string | ✅ | ✅ 默认 `declare` | 无枚举（合法值未成文） |
| assign[].left | `{}` 任意 | ✅ ref 对象→引用左值逐层写 memory，否则当变量名字符串 | ✅ AssignRows | 形状未表达 |
| assign[].right | `{}` 任意 | ✅ `{type,content,schema}` | ✅ | 形状未表达；**data 缺失→NPE**（VariableNodeParser:24 无 null 保护） |
| inputsValues / outputs | ⚠️ | **✗ 不读** | ✅ infer 插件写 outputs | 死字段 |

#### string-format（schema: `script` R，script.content R）
| 字段 | schema | 引擎读 | 前端写 | 问题 |
|---|---|---|---|---|
| script.{language,content} | string | ✅ 只认 `spel-standard/spel-vue/thymeleaf-text`，**其他值运行期 RuntimeException**（StringFormatCode:32-44） | ✅ | **language 3 枚举未表达**；两处默认值不一致（画布 `spel-standard`/模板 `spel-vue`）；Normalizer 有别名归一但未知值原样放行给引擎炸 |
| inputsValues + inputs | object | ✅ | ✅ | 知识库要求"inputsValues 的 type 必须 ref"未表达 |
| outputs | object | ✅ 输出 `formatStringResult` | ✅ Normalizer 自动补声明 | "必须含 formatStringResult" 只是 `x-gaia-outputs` 元数据，**不校验** |

#### workflow（schema: **无任何 required**）
| 字段 | schema | 引擎读 | 前端写 | 问题 |
|---|---|---|---|---|
| workflowId | `{}` 任意 | ✅ 空→运行时 IllegalArgumentException；S3b fatal | ✅ 存 workflow code 字符串 | **无 required 无类型**；缺失要等 run 预检 |
| workflowName | string | ✅ | ✅ 选择器联动写 | |
| workflowDescription | ❗ | ✅（WorkflowNodeParser:23-47） | ✅ | **schema 未声明** |
| workflowDefinition | ❗ | ✗（前端调试缓存） | ✅ | schema 未声明（可标注 x-gaia-frontend-only） |
| inputs/outputs/inputsValues | object | ✅ 子流程参数映射 | ✅ | 值包装形状未表达 |

#### 无 schema 的 9 个类型
- `block-start/block-end/break/continue`：有 parser、不读任何 data → 应补"空 data"trivial schema（让 AI 知道不需要塞字段）。
- `note/group/comment/assignee`：NO_PARSE 标注类。comment 在 AI 可建清单；assignee 前端可建但后端不在清单（且 node-knowledge 还在宣传）。
- `chain`：死枚举，无 parser 无 schema，出现即运行时异常。

### 1.3 跨节点的通用形状（schema 完全没表达的部分）

1. **值包装（IFlowValue）**：`{type:"constant",content:任意}` / `{type:"ref",content:[nodeId,field,...]}` / `{type:"template",content:"...{{ nodeId.field }}..."}` / 裸字符串（部分字段容忍） / 前端还有 `expression` 态。后端 `RefType` 枚举只有 ref/constant，引擎在特定字段额外认 template。**这是 AI 出错率最高的形状，schema 里一次都没出现。**
2. **inputs（声明）+ inputsValues（取值）二元结构**：声明驱动 Parameter 生成与表单渲染，值必须键键对应——一致性规则散在 S3b。
3. **timeout 共享形状**：`{timeout:ms, retryTimes:n}`（http/llm），已有但可提取 $defs 复用。
4. **outputs 即输出契约**：code 的白名单语义、x-gaia-outputs 的固定输出语义。

---

## 2. 问题诊断：AI 为什么生成出错（8 个根因）

| # | 根因 | 证据 |
|---|---|---|
| R1 | **schema 弱约束，真规则活在散文里**：唯一 enum 是 branches.logic；operator/method/language/bodyType/prompt-template/ref 形状全部缺失。AI 看"官方 schema"以为合规即能跑 | §1.2 各表；knowledge 文档明文的规则 vs schema 缺失对照 |
| R2 | **知识源 6 份重复且漂移**：http 规则 6 处、fromPort 规则 6 处；workflow 类型三清单未收录；items.ref/id 提示词有工具 schema 无；技能文件"只补缺不覆盖"与工具 schema"强制覆盖"策略相反 | prompt-zh:47 / node-data-rules.md:3 / AgentToolRegistry:571 / AgentSkillCatalog:267-272 |
| R3 | **宽容归一化让"正确答案"不唯一**：Normalizer 16 条规则 + 前端 normalize.ts 双份（扁平/嵌套、ref 简写、语言别名、杂交修复）。模型每次生成被静默改写，学不到收敛的规范形 | NodeDataNormalizer.java:21-514；normalize.ts:53-276 |
| R4 | **校验漏斗错位**：①工具入参层 data 自由 object 不校验 → ②node add 无校验+静默修补 → ③node update 有校验 → ④run 预检（业务+端口）→ ⑤运行时。**edge 工具不查 fromPort**（true/false 静默 canceled 事故的成因）。反馈离动作太远，AI 无法归因 | NodeToolExecutor:42-83 vs 85-113；EdgeToolExecutor 全文无校验；SKILL.md:39 |
| R5 | **三套默认值矛盾**：code.language、string-format.language、http 新建违反 required、GENERATABLE vs SUPPORTED 方向相反 | §1.2；contract.test.ts 只锁部分 |
| R6 | **引擎静默容忍**：未知 operator→false、未知 logic→false、dangling ref→null（假成功）、未知 language→运行期。AI 收不到负反馈，RepeatToolGuard 记录 Qwen 同参复读 8~67 次 | ConditionNode:74-78；BranchesNode:86-87；LlmNode:295-310；RepeatToolGuard:19-22 |
| R7 | **跨节点规则无 schema 载体**：fromPort∈声明端口、每 key 必须有出边、ref 指向存在节点+字段——已有程序化校验（S4/checkEdgePorts）但 edge 工具调用时不触发 | WorkflowDslValidator S4；checkEdgePorts:455-582 |
| R8 | **扩展键是元数据不是约束**：x-gaia-outputs/x-gaia-form-inputs 的 required 与输出契约不参与校验 | llm.schema.json:41-52；networknt 不执行扩展键 |

---

## 3. 业界横向对标

### 3.1 总表

| 平台 | 节点 Schema 机制 | 单一来源 | 变量引用形状 | AI 生成方式 | 防错手段 |
|---|---|---|---|---|---|
| **n8n** | TS 类声明 INodeTypeDescription（前后端共用） | ✅ | 类型化端口 ai_* + 自由表达式 | 多 agent + 20+ 细粒度工具逐节点构建 | **Zod strict 工具入参；validate_structure 自检工具；8 类程序化 lint；确定性 auto-fix（唯一才修、歧义上抛）；文档即工具** |
| Dify | 前端 TS 四件套 + 后端 Pydantic（手写 panel） | ❌（三处约定） | value_selector 数组 + 上游可见性校验 | 官方无；社区生成 YAML 导入 | DSL version 兼容校验；checkValid |
| Coze Studio | FlowGram 画布 schema + Go NodeAdaptor 转换层 | 半（两层各自权威） | 变量树 + provider 注册 | 公开资料未见 | **转换即校验**；input/output-tree-validator |
| LangFlow | Python 类 inputs/outputs → template 序列化 | ✅（后端为源） | Handle 带 input_types/output_types | Flow Builder 为 agent 设计 | **模板深拷贝实例化**；类型歧义即报错 |
| FlowGram | 节点物料 + IFormItemMeta + inputs/outputs JSON Schema | ✅ | **IFlowValue 四态（constant/ref/expression/template）** | 框架不提供（宿主决定） | **一份 schema 驱动表单+校验+变量引擎** |
| ComfyUI | INPUT_TYPES 元组 | 半（**双格式割裂=反面教材**） | `[node_id, slot]` | 社区 LLM 生成 | VALIDATE_INPUTS 提交前校验 |
| Windmill | main 函数签名自动推断 JSON Schema | ✅（零手写） | 步骤输出引用 + schema 跨步骤传播 | 脚本级生成 | schema 传播锁 |
| Activepieces | Property builder + Zod/TS 同文件 | ✅ | `{{variables}}` 模板 | 公开资料未见 | StaticPropsValue 类型化校验 |

### 3.2 对 Gaia 的映射结论

- Gaia 已站在 FlowGram 上（前端 `@flowgram.ai@1.0.12`），**框架层的最优实践（IFlowValue 四态、schema 驱动表单）已部分具备**（llm/end 用 `data.inputs` 驱动表单），但后端契约（node-schemas）与前端注册表、AI 知识源完全脱节。
- 与 n8n 的差距不在画布/引擎，而在 **AI 生成闭环**：n8n 每个工具入参 strict 校验、有独立 validate 工具、生成后程序化 lint + 确定性 auto-fix、节点文档作为一等工具供给。Gaia 的 `node` 工具 `data` 是自由 object，add 不校验，知识靠 6 份散文。
- ComfyUI 的教训直接命中 Gaia 现状：**同一节点多种合法形状（扁平/嵌套、简写/标准、三套默认值）= 变相的双格式割裂**，是 LLM 生成错误率的最大放大器。
- 12 条共性最佳实践中 Gaia 已具备：结构化 ref（IFlowValue.ref 数组）、模板基线（node-templates）、错误回喂格式（violations path 级）、复读熔断（RepeatToolGuard）。缺失：schema 收紧、生成点校验、确定性 lint 清单、知识源派生、默认值统一。

---

## 4. 治理方案（4 个阶段）

> 原则：**单一事实源 = node-schemas/*.schema.json（draft-07 + $defs + x-gaia-* 扩展）**；散文知识只讲"何时用/注意事项"，参数形状一律由 schema 派生；校验前移到生成点；静默容忍改为最早暴露。

### 阶段 1：schema 收紧（纯 schema + 校验器，不改引擎行为）

1.1 **通用 $defs**（新增 `node-schemas/_defs.json` 或内嵌每份）：
- `$defs.flowValue`：anyOf[constant / ref(content array) / template / 裸 primitive]，附 description 说明各字段适用的类型子集；
- `$defs.timeout`：`{timeout: integer≥1000, retryTimes: integer 0-10}`；
- `$defs.parameterSchema`：inputs/outputs 的 JSON-Schema-of-JSON-Schema 浅约束。

1.2 **逐节点收紧**（保持 `additionalProperties: true`，避免存量爆炸；strict 视图另出，见 3.3）：
- llm：`inputsValues.properties` 显式声明 6 字段（prompt/systemPrompt 必 `type:object` 且内部 enum[template]；temperature number 0-2）；required 表达到 `inputsValues` 的 properties 级（prompt required）；
- http：method enum[GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS]；api.url type string+minLength 1；body.bodyType enum[none,JSON]（按引擎实现）；headersValues/paramsValues additionalProperties=$defs.flowValue；删除死字段 inputs/outputs/inputsValues（移入 `x-gaia-legacy: [...]` 标注）；
- code：script.language enum[null,javascript,js,jsReturn,java,groovy]；补声明 outputsValues；inputsValues properties=$defs.flowValue；outputs.description 写明"输出白名单"；
- condition：conditions[].value 内部结构化（operator enum 12 值、left/right=$defs.flowValue）；branches.conditions[] items 同构（消除"branches 无 items schema"）；
- string-format：script.language enum 3 值；outputs.required=[formatStringResult]；
- loop：**删除 data.blocks/data.edges 误导声明**；loopFor=$defs.flowValue；maxLoopCount minimum 0；删除死字段 inputsValues；
- variable：assign.items 结构化（operator enum、left/right=$defs.flowValue）；删除死字段 inputsValues/outputs（outputs 移 `x-gaia-frontend-derived`）；
- workflow：workflowId type string+minLength 1 且 required；补声明 workflowDescription；workflowDefinition 标注 `x-gaia-frontend-only`；
- end：inputsValues minProperties 1；
- 新增 4 份 trivial schema（block-start/block-end/break/continue：properties 仅 title）；`chain` 从 NodeTypeEnum 移除或加 schema（先查存量库有无 chain 节点）。

1.3 **x-gaia-* 语义升级**（不改 draft-07 校验器，用 S3b 消费）：
- `x-gaia-outputs`：校验 outputs.properties 必须包含所列键（code/string-format/http/llm）；
- `x-gaia-legacy` / `x-gaia-frontend-only` / `x-gaia-frontend-derived`：文档化"谁读谁写"，为阶段 3 的 strict 视图做数据。

### 阶段 2：校验前移 + 默认值统一

2.1 **node add 走与 update 相同的双重校验**（NodeSchemaRegistry.validateParams + businessFieldIssues 单节点探针）。失败策略软启动：首轮 warning+fixHint 随回执返回，同节点同错第二次升级拒绝（复用 RepeatToolGuard 计数思路）——避免打断既有 agent 流程。
2.2 **edge 工具即时校验 fromPort**：`fromPort ∈ {condition keys / branches ids / else}`，非法即拒绝并回 `合法端口列表`（针对历史上最疼的 true/false 静默 canceled 事故）。
2.3 **默认值统一到单一来源**：
- `node-templates/`（AI 路径）与画布 `onAdd` 由同一份 defaults 驱动（前端生成或后端下发），契约测试从"部分锁定"升级为全字段快照；
- code.language 统一 `javascript`（AI 模板现状，且为引擎合法值；jsReturn 保留为合法别名）；string-format.language 统一 `spel-standard`；
- 画布 http onAdd 补 `api.url:''` 并由前端 REQUIRED_FIELDS 高亮（消除"新建即违反自家 required"）。
2.4 **四处类型清单收敛**：前端 GENERATABLE_NODE_TYPES、后端 SUPPORTED_TYPES、工具描述 nodeTypes、node-knowledge 条目集 → 由后端清单暴露 API/生成脚本统一，契约测试快照断言四者一致；`workflow` 补进提示词/技能清单；`assignee` 从 node-knowledge 移出或标注"仅画布标注节点"。

### 阶段 3：AI 交互面收敛（对标 n8n）

3.1 **node/edge 工具的 data 按类型走 strict 视图校验**：NodeSchemaRegistry 增加 `strictSchema(type)`（additionalProperties:false 的编译期派生视图），ToolArgsValidator 升级支持 $defs/anyOf/enum 嵌套（或 data 直通 networknt 全量校验），violations 以现有 path+fix 格式回喂。add 与 update 同口径。
3.2 **知识源派生**：node-knowledge.json 的"参数/JSON 结构示例"段由 schema + node-templates 自动生成（CodeNodeKnowledgeContractTest 模式推广到全部类型：**每个模板经"创建→normalize→run 预检"冒烟**）；SKILL references 的字段表同源生成；散文只留"何时用/坑"。
3.3 **确定性 auto-fix 分级入回执**：Normalizer 每次改写都在工具回执中返回 `repairs:[{path, from, to}]`（让 AI 看到被修了什么，下一轮学会规范形）；歧义场景（ref 多匹配）不猜、上抛。
3.4 **get(knowledge) 增强**：返回 strict 视图 schema + 可执行 example（由模板派生）+ `x-gaia-outputs`。

### 阶段 4：静默失败治理（存量清障 + 引擎行为收敛）

4.1 condition/branches 未知 operator/logic：parse 期由"静默 false"改为抛错（schema enum 已拦新增，此处兜底旧数据与非 AI 入口）。
4.2 code 未知 language：parse 期抛错（现为运行期）。
4.3 引擎 NPE/ClassCastException 加固：VariableNodeParser data null 保护、CodeNodeParser 属性值类型检查、LoopNodeParser maxLoopCount 容错——统一转 ChainException 带节点 id。
4.4 存量扫描脚本：跑全库工作流版本 validate（只读），diff 治理前后 error 集合，逐条确认"新增拦截=真错误"。

---

## 5. 验收方案

### 5.1 静态验收（CI 可持续执行）
- A1 全部 schema（11+4 份）通过 JSON Schema 元校验（draft-07 合法性 + 项目自定义 lint：每节点必须有 description、枚举字段必须有 enum 或显式 `x-gaia-free` 豁免）；
- A2 契约测试：前端 node-templates/画布 onAdd 全字段快照 vs schema（required 通过、enum 通过、无死字段写入）；
- A3 清单一致性：四处类型清单快照相等；node-knowledge 条目 ⊆ 合并清单且标注一致；
- A4 现有单测（LlmNodeRetryTest、ChainCooperativeCancelTest 等）与 console e2e 全绿。

### 5.2 语义验收（错误语料集）
- 从 §2/F 节历史事故提炼 ≥30 条 badcase 语料：fromPort=true/false、script.language=python、inputsValues.url（http 旧口径）、prompt type=constant、ref content 写字符串、ref 指向不存在节点/字段、end 空 inputsValues、llm 自创 inputs 声明、string-format 缺 formatStringResult、variable operator 拼错、maxLoopCount="abc"、dangling edge、自环……
- **断言：每条 badcase 必须在 add/update/edge/run 四级中最早一级被拦截**，violations 含 path+可执行 fix；任何一条不得推迟到运行期才暴露（运行期 schema 类错误率 = 0 是硬指标）。

### 5.3 AI 实测验收（量化，治理前先跑基线存档）
- 固定 10 个任务 prompt（难度分级：单节点 / 分支 / 循环 / 子流程 / 综合改写）× 每任务 10 次，指标：
  - 首次工具调用合法率（无 INVALID_ARGS）；
  - run 预检一次通过率（目标 ≥80%，基线对比提升 ≥30 个百分点——以基线实测为准再定靶）；
  - 平均工具轮次 / 任务；
  - RepeatToolGuard 熔断次数 = 0；
  - 运行期 schema 类错误 = 0。
- 回归对比：治理前后同语料集，人工抽查产物质量无退化。

### 5.4 兼容性验收
- 全存量工作流版本 validate 前后 diff：新增拦截逐条人工确认为真错误；误伤率 <2% 且提供一键修复建议；
- 治理期间不改 DSL 顶层结构（nodes/edges/globalVariable 不动），不引入版本字段（本期不做 DSL 版本化，列为后续项）。

---

## 6. 待确认决策点

| # | 决策 | 建议 |
|---|---|---|
| D1 | schema 收紧力度：保持 `additionalProperties:true`（宽松+strict 工具视图）vs 直接 false | **推荐宽松+strict 视图**（存量安全，AI 路径严格） |
| D2 | code.language 默认值统一为 `javascript` 还是 `jsReturn` | **javascript**（引擎合法、AI 模板现状、语义直白） |
| D3 | node add 校验失败：硬拒绝 vs 软启动（首轮 warning+fixHint，同错二次拒绝） | **软启动** |
| D4 | TEMPLATE_REF_UNKNOWN（模板引用未知节点）warning→error | 保持 warning（动态模板误伤风险），但在 run 输出为空时联动提示 |
| D5 | `chain` 死枚举：移除 vs 补 schema | 先查库存量，无则移除 |
| D6 | 执行范围：阶段 1-4 全做 vs 先 1+2 | **建议先 1+2**（收益最大风险最小），3、4 视 5.3 基线效果排期 |

---

## 附录：证据索引（关键文件）

- schema：`gaia-workflow-app/src/main/resources/node-schemas/*.schema.json`（11 份）
- 注册/校验：`NodeSchemaRegistry.java`、`WorkflowDslValidator.java`、`WorkflowDslCanonicalizer.java`、`NodeDataNormalizer.java`
- 引擎解析：`ChainParserManager.java`、`infra/extend/node/**/*Parser.java`（15 个）
- AI 链路：`AgentToolRegistry.java:569-653`、`NodeToolExecutor.java`、`EdgeToolExecutor.java`、`RunToolExecutor.java`、`ToolArgsValidator.java`、`RepeatToolGuard.java`
- 知识源：`agent/prompt-workflow-architect-{zh,en}.md`、`agent/skills/gaia-workflow-assistant/**`、`seed/node-knowledge.json`
- 前端：`apps/console/src/nodes/**`（19 注册表）、`src/agent/node-templates/**`、`src/document/{validate,normalize-dsl,migrations}.ts`、`src/agent/node-templates/__tests__/contract.test.ts`
- 历史事故实录：`WorkflowDslCanonicalizer.java:23-43,271-274,411-413,531-535`、`NodeDataNormalizer.java:56-63,248-254,347-353,485-495`、`RepeatToolGuard.java:19-22`、`SKILL.md:34-41`、`edge-rules.md` 全文

---

## 7. 执行记录（2026-10-24 完成）

### 7.1 落地清单

**阶段 1 schema 收紧**
- 11 份 schema 重写 + 新增 5 份（block-start/block-end/break/continue/comment），共 **16 份严格契约**（`additionalProperties:false` + 值包装 definitions + 引擎真值枚举）。
- 枚举以引擎源码为准：operator `neq/gte/lte`（知识库曾误写 ne/ge/le——真实漂移，已修）、http method 7 值、bodyType `none/JSON/raw-text`、code language `javascript/js/jsReturn/java/groovy`、string-format `spel-standard/spel-vue/thymeleaf-text`、branches logic `and/or`。
- 删除死字段：http `inputs/inputsValues`、loop `inputsValues`+data 级 `blocks/edges`、variable `inputsValues`；补声明 code `outputsValues`、workflow `workflowDescription/workflowDefinition`（前端缓存）。
- 分层策略落地：**schema 管形状**（字段名/类型/枚举/包装），**S3b 业务预检管完整性**（prompt 有内容、url 非空、end 有产出——required/minLength/minProperties 相应放宽避免双重报错与空壳模板误伤）。
- `NodeSchemaRegistry`：16 类型清单 + 违规消息带实例路径（`/conditions/0/value/operator: ...`）。
- `chain` 在 DSL 层按 UNKNOWN_TYPE error 拒绝（枚举保留供 `Chain.java` 内部类型标记使用）。

**阶段 2 校验前移 + 默认值统一**
- `node add` 软启动双重校验（契约+业务探针，归一化后校验；同会话同类错误第二次拒绝）。
- `edge connect` 即时校验（新 `WorkflowDslCanonicalizer.edgeIssues`）：端点存在/自环/重复/fromPort 合法性（含"非条件节点不能带 fromPort"）/条件节点必须带 fromPort。
- `node update` 修正为先归一再校验（扁平简写不再被误拒）；修复 moveToTemplate/moveToConstant 把已是包装形状的值再包一层 constant 的 bug。
- 修复 loop 业务预检查错位置（`inputsValues.loopFor` → `data.loopFor`，等于从未检查过）。
- 新增 conditionsMissingOperator：条件/分支缺 operator → fatal（引擎会静默 false）。
- 前端默认值统一：code.language `jsReturn→javascript`、string-format `spel-vue→spel-standard`、http onAdd 补 `api.url`、variable/loop/http 模板去死字段、新增 workflow 模板；`GENERATABLE_NODE_TYPES` 移 assignee 补 workflow；画布 onAdd 与 AI 模板两套默认值经契约测试锁定一致。
- 前后端归一器同步删除 http legacy `inputsValues` 迁移路径（死口径，不再静默搬家）。

**阶段 3 知识源收敛**
- node-knowledge.json 重写：19→13 条目（删 6 个不可建类型）、修 `neq/gte/lte`、修 loop 参数（loopType/count/iterateOver 为编造，真值 loopFor/loopOutputs/maxLoopCount + `<loopId>_locals.item` 引用）、修 workflow 参数（workflowCode→workflowId）、脱敏明文 API Key、http bodyType 修正、prompt 引用改 template 形状。
- prompt v5（zh/en 同步）：类型清单补 workflow、strict 契约说明、operator 枚举纠偏、连线规则。
- SKILL/references 同步更新；工具 schema：nodeTypes 补 workflow、items 补 `id/ref`、data 描述指向 paramSchema、edge fromPort 描述强化。
- 四处类型清单（前端 GENERATABLE / 后端 SUPPORTED_TYPES / 工具 nodeTypes / 知识库条目）由契约测试锁定一致。

**阶段 4 静默失败治理**
- 未知 operator/logic：执行期抛 IllegalArgumentException（原 log.warn + 静默 false）。
- 未知 language（code/string-format）：parse 期抛错（原运行期）。
- `TEMPLATE_REF_UNKNOWN` warning→error（三方可感知）。
- NPE/裸异常加固：VariableNodeParser data null、CodeNodeParser 声明值类型检查、LoopNodeParser maxLoopCount 配置错误消息。
- `NodeDataNormalizer`：http/llm 自动补 `outputs` 骨架（x-gaia-outputs 单一来源）。

### 7.2 验收结果

| 项 | 结果 |
|---|---|
| 后端全量单测 | **262 个测试 0 失败**（3 个断言旧行为的测试已按新语义更新） |
| 前端全量测试 | **82/82 通过**（含 12 项新契约测试：严格 schema 全量校验、四处清单一致性、坏形状拒绝、legacy 死口径不迁移） |
| badcase 语料测试 | `NodeSchemaBadcaseCorpusTest` **14 个用例组 50+ 断言全绿**：每条历史事故在契约/业务/边/全文档/引擎五级中最早一级被拦截，含阴性对照（7 类规范形状全链路放行） |
| 启动冒烟 | 2.6s 启动成功；16 份契约加载；种子重播（10 工具定义/24 技能文件/prompt v5）；知识文件含 neq 纠偏 |
| 真机 API 冒烟 | 历史 drift 语料 `operator:"ne"` → `INVALID_PARAM`，错误带字段路径与正确枚举；合法 DSL `valid:true` 零告警 |
| 数据库清理 | 工作流/版本/产物/会话/运行/测试/种子表全部清空；配置类表（agent_config/llm_model/agent_mcp_server）保留 |
| AI 实测基线（验收 5.3） | **未执行**——需真实 agent 会话跑 10 任务×10 次，建议治理后的日常使用中观察：INVALID_ARGS 复读率、run 预检一次通过率、RepeatToolGuard 熔断次数（目标 0） |

### 7.3 遗留与后续

1. **AI 实测基线**（验收 5.3）：治理前基线已无意义（库已清），直接以新链路日常使用数据为准观察上述指标。
2. **软启动切硬**：观察 1~2 周 add 软警告误伤率后，可将 `NodeToolExecutor.markAddIssue` 首次即拒绝。
3. `x-gaia-outputs` 与 outputs.properties 一致性目前由 normalizer 兜底填充，未做校验（可后续加 S3b 检查）。
4. 前端 `note` 类型仅有枚举无注册表（历史状态，未动）；`multi-condition` 迁移逻辑保留。
5. 根目录 `gaia_workflow.db` 为陈旧副本（应用实际使用 `gaia-workflow-app/gaia_workflow.db`），未动，可手动删除。
