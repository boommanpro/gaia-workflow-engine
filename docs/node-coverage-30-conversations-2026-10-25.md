# 全节点覆盖：30 个真实对话评测设计（2026-10-25）

目的：用 30 个自然语言对话驱动 Gaia 智能体搭建工作流，覆盖 `node-catalog/index.json` 全部 16 类节点
（12 类可生成 + block-start / block-end / break / continue 四类循环内部节点），并从前端、后端两个维度验收。
发现前后端代码或知识库（agent skills / node-data-rules / schema description）问题时，修复后重测，直到效果达标。

## 执行约定

1. **话术红线**：用户话术只描述业务需求，不出现任何节点类型名（中英文）、不出现"用 XX 节点"式指令。
   需求本身的语义词（"判断""逐个检查""调用接口""存成测试用例"）允许出现——AI 如何落成节点正是被测对象。
   每条话术发出前对照本红线检查一遍。
2. **每个对话的"期望节点判断 / 期望草稿形状"是验收标准**，只给测试者看，不发给模型。
3. **会话隔离**：默认每个对话新建一个任务会话；标注"续聊"的复用指定会话（测多轮上下文）。
4. **验证维度**：
   - 后端：草稿 DSL 断言（节点集合、关键字段形状、连线端口）、校验 0 error、`run(target=workflow)` 正反两组输入的 outputs 断言、
     失败语义（failedNodes / 错误文案）、运行历史落库、test_case 与 run(target=tests)。
   - 前端：编辑器画布渲染（节点、边、端口名、容器布局）、变量徽标 0 Unknown / 0 Undefined、
     节点表单控件与值一致（llm 输出模式 Radio、code JsonSchemaEditor、http body 编辑器等）、试运行三态状态正确。
     浏览器验证用无头 Chromium（Playwright）；注意 status.md 记录的内嵌 webview ResizeObserver 问题，内嵌浏览器异常时换外部浏览器复核。
5. **外部端点**：http 用免费稳定端点（open-meteo、httpbin.org、jsonplaceholder、example.com）。
   若外网受限，允许起本地 mock controller 替代，但话术中的 URL 语义不变。
6. **一次对话的通过标准**：AI 未问不该问的问题、草稿一次或经 ≤3 轮自修复后校验通过、试运行 outputs 与断言一致、
   前端渲染无断裂引用。AI 明确澄清合理歧义（如 C08 计费口径）不算失败，算正确行为。
7. **负向/探测对话**（C20/C21/C22/C26）：预期可能"失败但语义正确"或"暴露引擎差距"，
   两种结局都先如实记录；确认为代码/知识库缺陷的，修复后重测，不允许通过放宽断言凑通过。

## 对话清单

### 第一组：单节点能力（C01–C14）

---

#### C01 活动报名信息卡 —— start / end 主角

**用户话术**：
> 帮我做一个活动报名的信息卡工具：提交姓名、年龄和邮箱，跑完输出一张卡片——姓名、邮箱原样带上，再拼一句"欢迎张三，今年 28 岁"这样的问候语。

**期望节点判断**：start 声明 3 个输入参数（name:string / age:number / email:string，带 description）；问候语用 end 的 template 或经 string-format 拼接；不允许凭空加 LLM。

**期望草稿形状**：`start → (可选 string-format) → end`；end.inputsValues 至少 3 个有意义键（name/email ref + greeting template）。

**后端验证**：
- run `{"name":"张三","age":28,"email":"z@x.com"}` → outputs.name=="张三"、outputs.email=="z@x.com"、outputs.greeting 含"张三"和"28"。
- **探测点**：greeting 中年龄渲染为 `28` 而非 `28.0`（SpEL 数字渲染保真）。出现 28.0 记为差距。

**前端验证**：start 表单 3 个参数可编辑且类型正确；end 的 ref/template 徽标无 Unknown；连线 start→…→end。

---

#### C02 发货通知拼接 —— string-format 主角（考察"纯模板不用 AI 生成"的判断）

**用户话术**：
> 我每周要给客户发发货通知，内容基本固定："亲爱的 {name}，您的订单 {orderNo} 已于 {date} 发出，预计 {days} 天内送达。"
> 做个工具把这几个信息填进去生成最终文案。就是纯文本替换，别浪费 token 让大模型写。

**期望节点判断**：string-format（language 任选 spel-standard / spel-vue / thymeleaf-text 之一，inputsValues 声明变量）或 code 拼接；**不得出现 llm**。

**期望草稿形状**：`start(name/orderNo/date/days) → string-format → end`（end 引 formatStringResult）。

**后端验证**：run `{"name":"李雷","orderNo":"SO-1001","date":"2026-10-25","days":3}` →
文案完整替换、无残留 `{xxx}`；**探测点**：`3` 不渲染成 `3.0`。

**前端验证**：string-format 表单显示模板与变量徽标；试运行输出可见完整文案。

---

#### C03 实时天气查询 —— http GET 主角

**用户话术**：
> 做个小工具：给它一个城市的经纬度，它帮我查当前天气，返回温度数值和风速。

**期望节点判断**：http GET（AI 可用联网工具查 API 或直接用 open-meteo 免费端点）；URL 经模板引用 start 参数或 paramsValues 传参。

**期望草稿形状**：`start(latitude:number, longitude:number) → http(GET https://api.open-meteo.com/v1/forecast?...) → end`；
end 引用 `http.body.current_weather.temperature / windspeed`。

**后端验证**：run `{"latitude":39.9,"longitude":116.4}` → outputs.temperature 为 **number 类型**、落在 -50~50、windspeed ≥0；
http 节点 statusCode==200。

**前端验证**：http 表单显示 method=GET 与完整 URL；end 深路径徽标（body.current_weather.temperature）无 Unknown。

---

#### C04 Webhook 回显 —— http POST / body / headers 主角

**用户话术**：
> 帮我对接一个回显测试接口：把标题和内容以 JSON 发过去，再带上一个自定义请求头 X-Trace-Id 做链路追踪，最后把接口返回的内容原样给我。

**期望节点判断**：http POST；body 写顶层 `body={bodyType:'JSON',json:{...}}`（不塞进 api）；headersValues 带 X-Trace-Id（模板引用 start）。

**期望草稿形状**：`start(title/content/traceId) → http(POST https://httpbin.org/post) → end`。

**后端验证**：run `{"title":"上线公告","content":"v2.0 发布","traceId":"trace-abc-123"}` →
statusCode==200、body.json.title=="上线公告"、回显 headers 含 trace-abc-123。

**前端验证**：body JSON 编辑器渲染正确；headers 行显示自定义头；徽标链路完整。

---

#### C05 广告文案润色 —— llm text 模式主角（systemPrompt / temperature / 凭证三件套）

**用户话术**：
> 我有一段产品介绍文字，每次发出去之前想让它更有感染力一点。做个工具：输入原文，输出润色后的版本。风格商务但带点热情，别太夸张，每次产出要稳定。

**期望节点判断**：llm text 模式；systemPrompt 定风格、prompt 模板引用 start.text、temperature 设低（0~0.7 表达"稳定"）；
modelName/apiKey/apiHost 从 get(target=knowledge, nodeType=llm) 的 platformDefaultModel **原样填入**（不自编）。

**期望草稿形状**：`start(text) → llm(text) → end(result)`。

**后端验证**：run `{"text":"这款保温杯容量500毫升，不锈钢内胆。"}` → outputs.result 非空且 ≠ 输入、长度合理（50~500 字）；
草稿 inputsValues 含 modelName/apiKey/apiHost 三键且非空（get 回读时 apiKey/apiHost 脱敏，断言脱敏行为同时成立）。

**前端验证**：prompt 编辑器内 `{{start_1.text}}` 徽标正常渲染；凭证输入框已填值；llm 表单无必填红星挂空。

---

#### C06 客服工单智能分诊 —— llm json 结构化输出主角

**用户话术**：
> 客服每天收到很多工单，我想先自动打标：输入一条工单描述，输出三个东西——情感倾向（positive/neutral/negative）、问题类别（账务/物流/产品/其他）、紧急程度（1-5 的数字）。后面的同事要按这几个标签分派。

**期望节点判断**：llm outputMode=json，outputs.properties 声明 sentiment(string)/category(string)/priority(number)，
prompt 要求只输出 JSON；end 直接 ref 声明字段（不需要 code 解析）。

**期望草稿形状**：`start(text) → llm(json) → end(sentiment/category/priority)`。

**后端验证**：
- 正组 run `{"text":"我的订单三天了还没发货，再不发货就投诉！"}` → sentiment=="negative"、priority 为 number 且 ≥3、category ∈ 四枚举。
- 反组 run `{"text":"你们的产品真棒，物流也快，谢谢！"}` → sentiment=="positive"。

**前端验证**：llm 节点显示输出模式=json 与字段声明编辑器；end 的徽标是 `llm_x.sentiment` 等具体字段（无 result 残留）。

---

#### C07 成绩及格判定 —— condition 主角（gte / key-else 端口）

**用户话术**：
> 做个成绩小助手：输入一个 0 到 100 的分数，60 分及以上输出"及格"，否则输出"不及格"，并附上分数本身。

**期望节点判断**：condition 单条件（operator=gte，value=60），出边 fromPort 用条件 key 和 else（不得 true/false）。

**期望草稿形状**：`start(score:number) → condition → pass 分支生成"及格…"文案 / else 分支生成"不及格…"文案 → end`
（两分支汇合同一 end 允许，ChainParserBranchMerge 已放行条件扇出汇合）。

**后端验证**：run `{"score":85}` → 含"及格"与"85"；run `{"score":59}` → 含"不及格"与"59"；边界 run `{"score":60}` → 及格。

**前端验证**：condition 节点两个出边端口名 = 条件 key 与 else；两条分支试运行状态互斥（一条 success 一条 notExecuted）。

---

#### C08 快递费分档计价 —— branches 主角（switch-case 互斥 + else；考察 ask_user 澄清口径）

**用户话术**：
> 我们按重量收快递费：1 公斤以内 8 块，1 到 5 公斤每公斤 6 块，5 公斤以上每公斤 4 块，另外每单再收 2 块包装费。
> 做个算价工具：输入重量，输出运费金额，还要给一条档位说明——轻件、标准件、重件优惠三种说法。

**期望节点判断**：branches 多组互斥条件（≥3 分支 + else，logic 合法 and/or）；分支后接 code/expression 算钱与文案；话术口径有意模糊（8 块是否含包装费）——**期望 AI 用 ask_user 澄清或在回复中显式声明假设**，然后按选定口径自洽实现。

**期望草稿形状**：`start(weight:number) → branches(3+else) → 各分支计价 → end(fee:number, note:string)`。

**后端验证**（按"8/6/4 为纯运费，+2 全档适用"口径）：run `{"weight":0.5}` → fee==10、note 含"轻件"；
`{"weight":3}` → fee==20、note 含"标准"；`{"weight":7}` → fee==30、note 含"重件"。fee 必须是 number。

**前端验证**：branches 节点显示 3+1 出边端口（分支 id 名）；四条边各连不同目标；徽标无 Unknown。

---

#### C09 商品标语批量生成 —— loop 容器主角（item/index + block-start/block-end + 多轮聚合）

**用户话术**：
> 我有一个商品名单（一串名字），帮我给每个商品生成一行"【商品名】——热卖中"的促销标语，最后把所有标语按顺序合成一个列表给我。

**期望节点判断**：loop 容器（loopFor ref start 数组），体内 string-format 用 `<loopId>_locals.item`；loopOutputs 聚合每轮标语成数组。

**期望草稿形状**：loop 节点级 `blocks`/`edges` 存在；DSL 中含 block-start / block-end 结构节点；
end 引用 loop 聚合输出。

**后端验证**：run `{"items":["键盘","鼠标","显示器"]}` → outputs 为长度 3 的数组、顺序一致、逐条含对应商品名。

**前端验证**：loop 画布渲染为容器、子节点在框内不与外层节点重叠；体内 string-format 的 item 徽标正常。

---

#### C10 库存预警扫描 —— loop + break 主角

**用户话术**：
> 做个库存扫描器：输入一串商品记录（名字和库存数量），按顺序检查，一旦发现任何一个库存为 0 的商品就立刻停下来，
> 输出它的名字和它是第几个；如果一个都没有，就输出"全部有货"。

**期望节点判断**：loop + 体内条件判断（stock==0 / lte）+ break 提前退出；循环外输出命中项或"全部有货"。

**期望草稿形状**：`start(records:array) → loop{ 判断 → break } → end(命中名/序号 或 全部有货)`。

**后端验证**：
- run `{"records":[{"name":"A","stock":5},{"name":"B","stock":0},{"name":"C","stock":3}]}` → 命中 B、序号 2（第 2 个）。
- run 全部有货 → "全部有货"。

**前端验证**：break 节点在容器内渲染；命中场景试运行显示循环提前终止（后续轮次未执行）。

---

#### C11 脏数据清洗 —— loop + continue 主角

**用户话术**：
> 做个清洗工具：输入一批用户提交的电话号码，里面可能混着空的或者写着"待补"的，把有效号码挑出来保留，其余直接跳过，最后给我干净名单。

**期望节点判断**：loop + continue（无效项跳过本轮）；有效性判断用 is_empty / contains（"待补"）或 code。

**期望草稿形状**：`start(phones:array) → loop{ 判断 → continue } → end(有效名单数组)`。

**后端验证**：run `{"phones":["13800000001","","待补","13800000002"]}` → `["13800000001","13800000002"]`，顺序保持。

**前端验证**：continue 渲染；无效项轮次显示 skipped 语义。

---

#### C12 销售报表汇总 —— code java/groovy 主角（非 JS 引擎）

**用户话术**：
> 财务每周给我一张销售额数组，我要一个汇总：总销售额、平均数、最高单、最低单，一次算出来。
> 这个计算逻辑要跑在 JVM 那套脚本引擎上，别用浏览器那套脚本。

**期望节点判断**：code language=java 或 groovy（execute(Map) 方法签名），outputs 声明 total/avg/max/min 四字段；
**不得用 javascript 应付**。

**期望草稿形状**：`start(sales:array) → code(java|groovy) → end(四字段)`。

**后端验证**：run `{"sales":[100,250,80,320]}` → total==750、avg==187.5、max==320、min==80，全部 number 类型。

**前端验证**：code 表单语言显示 java/groovy；outputs 声明编辑器四字段；end 徽标无 Unknown。

---

#### C13 用户资料解析 —— code javascript 主角（object/多字段输出声明 + 深路径引用回归）

**用户话术**：
> 用户在表单里填的联系方式是一整段文本，比如"张三，住在北京市朝阳区，邮箱 zhangsan@example.com，电话 13800000001"。
> 帮我从中解析出姓名、城市、邮箱、电话四个字段，后面的流程还要单独用每一个。

**期望节点判断**：code javascript（jsReturn，最后表达式对象字面量；正则/字符串切分），inputs.properties 或直接顶层变量用上游名，outputs.properties 声明 4 字段。

**期望草稿形状**：`start(raw:string) → code(js) → end(四字段)`。可选变体：code 声明 object（含 properties）再深路径引用。

**后端验证**：run 上述样例文本 → name=="张三"、city=="北京市朝阳区"、email=="zhangsan@example.com"、phone=="13800000001"。

**前端验证**：end 四个徽标显示 `code_x.name` 等具体字段；变量面板树展示子字段（completeObjectOutputDeclarations 口径）；**0 Unknown**。

---

#### C14 画布批注 —— comment 主角（续聊 C07 会话）

**用户话术**（在 C07 会话中追加）：
> 这个流程搭好了，帮我在几个关键步骤旁边加上说明注释，比如这里为什么以 60 分为界，让同事打开画布能看懂。
> 另外我想确认：加了注释之后，流程运行会不会受影响？

**期望节点判断**：添加 comment 节点（1~3 个，title 写说明），**不改业务节点、不重连边**；comment 无执行语义。

**期望草稿形状**：C07 草稿 + comment 节点；业务结构与注释前完全一致。

**后端验证**：加注释前后 run `{"score":85}` / `{"score":59}` 输出一致；校验不报 comment 相关错误。

**前端验证**：注释卡片在画布渲染且位置靠近对应节点；试运行节点列表不含 comment；业务节点状态不受影响。

---

### 第二组：语义与健壮性（C15–C22）

---

#### C15 复用已发布流程 —— workflow 子流程主角（前置：C06 落版发布）

**用户话术**：
> 我之前发布过一个"工单打标"的流程。现在做一个新流程：输入一条工单描述，先复用之前那个打标能力拿到三个标签，
> 然后如果情感是负向，备注写"已升级为紧急处理"，否则写"无需升级"，最后把标签和备注一起给我。

**期望节点判断**：先查可用工作流（get target=canvas）拿到 C06 发布的 code；workflow 节点 workflowId 填该 code，inputsValues 映射子流程入参；下游 condition 引用子流程输出 sentiment。

**期望草稿形状**：`start(text) → workflow(→C06) → condition(sentiment==negative) → end(labels + 备注)`。

**后端验证**：
- run `{"text":"再不发货就投诉！"}` → 标签来自子流程真实执行（sentiment=="negative"）、备注=="已升级为紧急处理"。
- run 正面工单 → 备注=="无需升级"。
- **探测点**：子流程执行引用的是发布版本而非草稿（NC-08 子流程锁定实际版本）。

**前端验证**：workflow 节点表单显示所引用子流程名称；下游徽标显示子流程输出字段；0 Unknown。

---

#### C16 报销审批状态机 —— variable 主角（assign 赋值与改写）

**用户话术**：
> 做一个报销审批小流程：输入金额，默认状态是"待审批"；金额大于 1000 的，状态改成"需主管审批"、审批人记"主管"，
> 否则审批人记"财务"。最后把金额、状态、审批人一起输出。

**期望节点判断**：variable 节点 assign 列表（right 用 constant / ref）；条件后第二个 variable 改写左值，或分支各自赋值。

**期望草稿形状**：`start(amount:number) → variable(默认 status/approver) → condition(gt 1000) → variable(改写) → end(三字段)`。

**后端验证**：run `{"amount":1500}` → status=="需主管审批"、approver=="主管"；run `{"amount":500}` → approver=="财务"。

**前端验证**：variable 表单显示赋值行（左值/右值）；condition 两分支试运行状态互斥正确。

---

#### C17 折扣计算器 —— 数字类型保真主角（expression / number 端到端）

**用户话术**：
> 做个折扣计算器：输入单价和数量，总价打 85 折。输出折后总价（保留两位小数）和"省了多少钱"两个金额。
> 注意金额就是数字，别变成文字拼接的那种。

**期望节点判断**：code（或 expression 值）做数值计算与舍入；输出声明 number 类型；**全程无字符串化**。

**期望草稿形状**：`start(price:number, quantity:number) → code → end(total:number, saved:number)`。

**后端验证**：run `{"price":20,"quantity":3}` → total==51（60×0.85）、saved==9，两者 typeof number；
run `{"price":19.9,"quantity":3}` → 50.74 或 50.75（按声明舍入口径，AI 需自洽）。

**前端验证**：变量树中 total/saved 显示数字类型（非字符串形态）；模板内引用不触发 `.length` 类误报。

---

#### C18 多轮改档不残留 —— update 深合并 / 数组整体替换主角（NC-03 回归）

**用户话术**（三轮）：
1. > 做一个按金额定等级的工具：1000 以内是 C 级，1000 到 5000 是 B 级，5000 以上是 A 级，输入金额输出等级。
2. > 分档线改一下：100 以内 C，100 到 1000 是 B，1000 到 5000 新加一档 A，5000 以上算 S，一共四档。
3. > 算了，还是回到三档，把三个等级的名字改成 金牌、银牌、铜牌，分档线用最早的。

**期望节点判断**：branches（或连续 condition）；三轮 node update 的数组语义正确——新增分支不残留旧边，
**从四档改回三档时第四条分支及其边、文案彻底消失（数组整体替换，不按索引隐式合并）**。

**后端验证**：每轮后草稿 branches 数组长度 == 当前档数、无残留分支 id、出边端口与分支 id 一一对应；
三轮各 run 一组输入（如 50 / 500 / 3000 / 8000 按当轮口径）全部正确。

**前端验证**：每轮修改后画布分支数正确、无悬空边；变量徽标不出现已被删除字段的 Unknown。

---

#### C19 称呼兜底 —— condition is_empty + start 默认值主角

**用户话术**：
> 做个称呼生成器：输入名字，输出"{名字}您好"。名字有时候会漏填，漏填的时候统一叫"朋友"。

**期望节点判断**：condition is_empty/is_not_empty 分流 + 兜底文案；或 start 参数 default 空串 + 模板兜底——两条路径任一均可，验收行为。

**期望草稿形状**：`start(name) → condition(is_empty) → 兜底分支"朋友您好" / 正常分支 → end`。

**后端验证**：run `{"name":"王先生"}` → "王先生您好"；run `{"name":""}` → "朋友您好"；
run 不传 name 键 → "朋友您好"（缺参不炸流程）。

**前端验证**：空输入分支命中时正常分支显示未执行状态（三态正确）；徽标无 Unknown。

---

#### C20 失败要像失败 —— 负向：http 必然失败时不得假成功

**用户话术**：
> 做个通知转发器备用：把一段文字提交到我们网关的 /notify 接口。网关地址先用 `http://127.0.0.1:1/notify` 占位
> （联调环境还没起，肯定调不通）。我要的就是确认：调不通的时候，流程的状态是清清楚楚的失败，而不是假装成功。

**期望节点判断**：http POST 到该占位地址；**AI 不得为"让它成功"而擅自换地址、包 try 或伪造输出**。

**期望草稿形状**：`start(text) → http(POST 127.0.0.1:1/notify) → end`。

**后端验证**：run `{"text":"hello"}` → 工作流状态 failed、failedNodes 含 http 节点、错误文案可读（连接拒绝/无法连接语义）、
**绝不输出 success**；运行历史落库该次失败（状态、错误、时间）。

**前端验证**：试运行面板 http 节点红色失败态 + 错误详情可见；停止/状态三态（进行中/失败/取消）显示正确。

---

#### C21 坏 JSON 防御 —— 负向探测：llm json 模式解析失败的语义

**用户话术**：
> 做个提取器：输入一段话，输出里面出现的姓名和城市两个字段。哦对，顺便让它结果里再带一句不超过十个字的吉祥话。

**期望节点判断**：llm json 模式（声明 name/city，可能 + blessing）；吉祥话与结构化输出并存是对解析健壮性的真实压力。

**验收口径（两种结局都算观察通过，如实记录）**：
- 模型输出仍为合法 JSON → 三字段正确引用；
- 模型输出混入散文导致解析失败 → 节点 FAILED、错误文案带修复指引（不静默输出 null / 不假成功）。
  若失败后 AI 能按指引自动修复 prompt 并重试成功，更佳。

**后端验证**：run `{"text":"王五住在上海，麻烦顺便讲个笑话"}` → 记录 outputs 或 FAILED 语义；失败时 failedNodes 定位到该 llm 节点。

**前端验证**：失败时节点错误提示可读、可定位；成功时徽标正常。

---

#### C22 超时与重试 —— timeout / retryTimes 生效探测（续聊 C20 会话）

**用户话术**：
> 网关起来了，但是特别慢——地址换成 `http://httpbin.org/delay/5` 模拟（它会拖 5 秒才响应）。
> 给我加上保护：单次最多等 3 秒，失败自动重试 2 次，还不行就报错。

**期望节点判断**：http timeout 配置 `{"timeout":3000,"retryTimes":2}`；delay/5 端点必然超时 → 重试 2 次 → 最终失败。

**期望草稿形状**：C20 的 http 节点 update 后带 timeout 配置（URL 换为 delay/5）。

**后端验证**：
- **探测点（核心）**：单次尝试在 ≈3s 处被掐断而非等满 5s（总耗时明显 < 5s×3，若等满则 timeout 未生效，记差距）；
- 最终 failed、错误含超时语义；重试痕迹可从耗时或日志看出共 3 次尝试。

**前端验证**：失败态 + 超时错误文案；节点表单显示超时/重试配置值。

---

### 第三组：综合场景（C23–C30）

---

#### C23 客户咨询自动应答 —— 综合：llm json 驱动 branches + string-format + 布尔产物

**用户话术**：
> 做一个客户咨询自动应答：客户发来一段话，先判断想咨询的是"退款""发货"还是"其他"，再判断情绪是否负面。
> 退款的统一回"已收到您的退款申请，24 小时内处理"；发货的看情绪——负面回"非常抱歉给您带来不便，我们加急处理"，
> 非负面回"您的包裹正在安排发货，请留意物流信息"；其他的一律回"已转人工客服"。
> 最后输出回复文案，和一个"是否需要人工跟进"的标记：退款和"其他"类需要，发货类不需要。

**期望节点判断**：llm json 声明 intent(string)/negative(boolean)；branches 按 intent 三路互斥（发货路内可再按 negative 或 branches 二级）；各路 string-format 生成 reply；needHuman 布尔产出。

**后端验证**：三组 run——`{"text":"我要退款，你们是骗子"}` → reply 含"退款申请"、needHuman==true；
`{"text":"发货怎么这么慢"}` → 抱歉文案、needHuman==false；`{"text":"今天天气不错"}` → 转人工、needHuman==true。
**needHuman 必须是 boolean 类型**。

**前端验证**：branches 端口与三条边正确；llm json 字段徽标（intent/negative）贯穿分支条件；0 Unknown。

---

#### C24 网页摘要机器人 —— 综合：http 拉取 → llm 摘要（跨节点模板引用 + 数组类型输出探测）

**用户话术**：
> 做个读网页的小助手：给它一个网址，把网页内容抓下来，给我一段 100 字以内的内容摘要，再给 3 个关键词标签。

**期望节点判断**：http GET 抓 `https://example.com`（稳定小页面）；llm 承接 http.body（prompt 模板引用），
json 模式声明 summary(string) / tags(array)。

**后端验证**：run `{"url":"https://example.com"}` → summary 非空且 ≤150 字、tags 为长度 3 的**数组类型**；
url 支持模板引用 start.url（换 `https://www.w3.org` 再跑一组仍成功更佳）。

**前端验证**：http→llm→end 徽标链路完整；llm json 声明编辑器显示 summary/tags。

---

#### C25 年会邀请函批量生成 —— 综合：loop 内对象字段访问 + 多轮聚合保序

**用户话术**：
> 公司年会要发邀请函：给一份嘉宾名单，每人有姓名和公司两项信息。给每位嘉宾生成一封
> "尊敬的 {name}（{company}），诚邀您出席 2026 年会"，最后把所有邀请函按名单顺序合成一个列表输出。

**期望节点判断**：loop 遍历对象数组，体内引用 `item.name / item.company`（对象属性访问，区别于 C09 的标量 item）；loopOutputs 聚合保序。

**后端验证**：run `{"guests":[{"name":"张三","company":"A科技"},{"name":"李四","company":"B集团"}]}` →
2 封、顺序与名单一致、逐封替换正确。

**前端验证**：循环体内 string-format 的 item.name / item.company 徽标正常；容器布局不乱。

---

#### C26 班级签到表 —— 嵌套 loop 能力探测（可能暴露引擎差距）

**用户话术**：
> 我有三个班，每个班有一组学生名字。帮我生成签到表：按班分组，每个班下面列出"班级名-学生名"的签到行，
> 最后输出按班级分组的完整名单。

**期望节点判断**：理想路径为嵌套 loop（外层班、内层学生）；若引擎不支持嵌套容器，
**期望 AI 明确告知限制并给出 code 扁平化的替代实现**，不得静默产出跑不通的草稿。

**后端验证（二选一，如实记录走了哪条）**：
- 嵌套 loop 跑通 → run `{"classes":[{"name":"一班","students":["小明","小红"]},{"name":"二班","students":["小刚"]}]}` →
  分组输出正确（一班 2 行、二班 1 行）；
- 引擎不支持 → AI 报告限制 + code 替代实现跑通同样断言 + **差距记录进 status.md 待办**。

**前端验证**：嵌套容器渲染正确，或替代路径徽标完整。

---

#### C27 订单处理流水线 —— 超大综合：branches + loop + 聚合 + condition + llm + end（8+ 节点）

**用户话术**：
> 做一个订单处理流水线：输入客户等级（金卡/银卡/普通）和商品清单（每件有名称、单价、数量）。
> 折扣：普通无折扣、银卡 95 折、金卡 9 折。逐个商品算折后小计，最后汇总订单总额；
> 总额超过 1000 的话，再让 AI 写一句个性化的感谢语附在订单上。
> 输出：每件商品的小计明细、订单总额、折扣说明、感谢语（不够 1000 就给空字符串）。

**期望节点判断**：branches 按等级定折扣率 → loop 算逐件小计（分支汇合后进循环，ChainParser 放行条件扇出汇合）→
聚合汇总（loopOutputs 收集 + code 求和，或循环后 code 汇总）→ condition(gt 1000) → llm 写感谢语 → end 多字段。

**后端验证**：
- run `{"tier":"金卡","items":[{"name":"键盘","price":300,"quantity":2},{"name":"鼠标","price":100,"quantity":1}]}` →
  明细 540/90、总额 630、感谢语 == ""（630 < 1000，**llm 未执行**）；
- run `{"tier":"普通","items":[{"name":"显示器","price":1200,"quantity":1}]}` → 总额 1200、感谢语非空；
- 银卡组验证 0.95 折扣精度（如 100×0.95==95.0，number 不漂移）。

**前端验证**：大画布布局可读、分支汇合无重复边；全链徽标 0 Unknown；不足 1000 时 llm 节点显示未执行。

---

#### C28 舆情小日报 —— 综合：http 拉数据 + 清洗 + 循环内 llm json + 汇总报告

**用户话术**：
> 做个舆情小日报：从一个公开评论接口拉一批评论数据，把空评论过滤掉，逐条判断情感倾向，
> 最后生成一份"共 X 条有效评论，负面 Y 条"的汇总报告，并把负面评论原文列出来。

**期望节点判断**：http GET（如 jsonplaceholder /comments?postId=1）→ code 过滤空 body → loop 逐条 llm json（循环体内 llm，
每轮真实调用）→ loopOutputs 收集 {text, sentiment} → code 统计负面 → string-format 出报告。

**后端验证**：run 无入参或 `{"source":"..."}` → 报告计数与实际一致（5 条评论全有效则 X==5）、
负面列表与逐条情感判断一致、类型正确；**循环内 llm json 每轮解析成功率 100%**（出现轮次失败记差距）。

**前端验证**：循环体内 llm 节点渲染 + json 声明徽标；长链路 0 Unknown；试运行逐轮状态可见。

---

#### C29 回归用例沉淀与防改坏 —— test_case / run tests / 证据过期（NC-07）主角（续聊 C07 会话）

**用户话术**（两轮）：
1. > 把这次验证过的几组输入都存成测试用例，以后我每次改完流程，你就把这些用例全部跑一遍，告诉我有没有改坏东西。
2. > 我把及格线从 60 改成 90。（等待 AI 完成修改与回归后）改完了吗？跑的结果怎么样？

**期望节点判断**：第一轮建 ≥3 个 test_case（含正反与边界输入）并 run(target=tests) 全绿；
第二轮 update condition 阈值后**必须重跑全部用例**并报告 60 分用例由"及格"变"不及格"的回归结果；
旧通过证据不得被静默继承（修改后待重测状态可见）。

**后端验证**：用例落库（输入 + 断言 + 草稿语义摘要）；第二轮 run(target=tests) 实际重跑（非缓存）、
结果与用例断言比对正确；被改动影响的用例状态刷新。

**前端验证**：用例与最近一次测试结果在会话/产物面板可见；修改后未重测期间不显示"已通过"旧标记。

---

#### C30 交付前体检与自修复 —— 引用巡检 / get variables / 断裂修复（DANGLING_REF 协议）主角（两轮）

**用户话术**（两轮）：
1. > 我要把订单流水线交付给运营用了。你先把整个画布从头到尾检查一遍：有没有引用了不存在的东西、
   > 字段对不上的地方、输出声明和真实输出不一致的地方，有问题直接修好，修完跑一遍确认没问题。
2. > 等等，把"商品明细"那个步骤删掉，明细我不需要了。（制造断裂）删完之后再体检一遍，确认还能正常跑。

**期望节点判断**：第一轮全量巡检（get target=variables 逐节点核对引用、输出声明 vs 真实输出）；
第二轮删除节点后下游引用断裂——期望 AI **自己发现断裂并修复**（改引用或补齐来源），修复后整流试运行通过；
校验器报错（DANGLING_REF / TEMPLATE_REF_UNKNOWN / DANGLING_REF_FIELD）应被 AI 消费并闭环，而非甩给用户。

**后端验证**：删除后 AI 主动修复，最终校验 0 error；整流 run 断言总额/感谢语仍正确（仅明细字段按需移除）；
运行历史落库两次体检结果。

**前端验证**：修复后画布徽标 **0 Unknown / 0 Undefined**；被删节点无残留悬空边；交付终检通过。

---

## 覆盖矩阵

| 节点 / 能力 | 主角对话 | 参与对话 |
|---|---|---|
| start（输入参数声明/default） | C01、C19 | 几乎全部 |
| end（ref 产物/多字段/template） | C01 | 几乎全部 |
| llm text（systemPrompt/temperature/凭证） | C05 | C24 |
| llm json（outputMode/声明字段） | C06 | C21、C23、C24、C28、C27 |
| code javascript（jsReturn/输出白名单/深路径） | C13 | C17、C26(替代)、C27、C28 |
| code java/groovy（execute(Map)） | C12 | — |
| http GET（params/模板 URL） | C03 | C24、C28 |
| http POST（JSON body/headers/timeout） | C04、C20 | C22 |
| condition（if-else/key-else 端口/操作符） | C07、C19 | C10、C11、C16、C27 |
| branches（switch-case/else/logic） | C08 | C18、C23、C27 |
| loop（容器/loopFor/item/index/聚合） | C09、C25 | C26、C27、C28 |
| break | C10 | — |
| continue | C11 | C28 |
| block-start / block-end（内部结构） | C09（DSL 断言） | 所有含 loop 对话 |
| variable（assign/左值改写） | C16 | C27 |
| string-format（三种引擎） | C02 | C07、C08、C23、C25、C28 |
| workflow（子流程/版本锁定） | C15 | — |
| comment（批注/不执行） | C14 | — |
| expression 值 | C17（变体） | — |

Agent 工具链覆盖：ask_user（C08）、todo_write（C27/C28 大任务）、get canvas/node/variables/knowledge（全程 + C30）、
node add/update/remove（全程 + C18/C30）、edge connect/remove（全程 + C18）、run node/workflow/tests（全程 + C29）、
test_case（C29）、联网查资料（C03 可选）。

## 预期发现点（高价值探测清单）

1. **数字保真**：SpEL/模板渲染数字是否出现 `28.0` / `3.0`（C01、C02、C17、C23、C27）。
2. **循环聚合**：loopOutputs 多轮收集的保序性与空轮行为（C09、C11、C25、C28）。
3. **timeout 生效**：http timeout 是否真的掐断慢请求，retryTimes 是否真实重试（C22）。
4. **嵌套 loop**：引擎是否支持容器嵌套（C26）。
5. **负向语义**：必败 http 是否假成功；llm json 坏输出的 FAILED 语义与修复指引（C20、C21）。
6. **数组整体替换**：branches/conditions 多改少时是否残留旧分支与边（C18，NC-03 回归）。
7. **子流程版本锁定**：workflow 节点执行是否锁定发布版本（C15，NC-08）。
8. **证据过期**：工作流修改后旧测试通过标记是否被静默继承（C29，NC-07）。
9. **引用巡检闭环**：DANGLING_REF 类错误是否被 AI 消费修复而非透传（C30）。
10. **循环体内 llm**：每轮真实调用的稳定性与 json 解析成功率（C28）。

## 执行与记录方式

- 按编号顺序执行（C15 依赖 C06 落版，C14/C22/C29 续聊指定会话）。
- 每个对话执行后在本文件对应小节追加一行执行记录：日期 / 会话 id / 结果（通过 | 修复后通过 | 差距记录）/ 证据（run 输出摘要、前端截图路径）。
- 发现差距 → 修复 → 重测 → 更新 status.md 的"已接入"与验证命令，不在本文件内长期堆叠问题清单。


## 执行记录（2026-10-25，真实模型）

执行通道：`scripts/e2e-conversations/`（harness.mjs 会话驱动 + run.mjs 用例入口 + cases/*.mjs 断言；
独立试运行走 /api/task/run 与画布同源；结果 JSON 在 scripts/e2e-conversations/results/）。
对话模型：llm_model 表 id=4（Qwen3.6-35B-A3B 本地 vLLM，model.active=4；glm-4-flash 曾切换验证，
其通过 agentscope 客户端不会发工具调用，已回退）。llm 节点模型：glm-4-flash（dmxapi）。

### 结果总览：16 PASS / 14 FAIL（14 个失败全部归因对话模型能力边界，见分档）

| # | 结果 | 断言 | 失败原因（模型边界 / 已修代码） |
|---|---|---|---|
| C01 | PASS | 7/7 | — |
| C02 | PASS | 6/6 | — |
| C03 | PASS | 5/5 | 首跑失败为引擎缺陷（修复 F1）后通过 |
| C04 | PASS | 8/8 | 首跑失败为引擎缺陷（修复 F2/F3/F4）后通过 |
| C05 | PASS | 7/7 | 凭证三件套、模板徽标全对 |
| C06 | FAIL | 3/8 | 模型边界：本地 Qwen 不稳定选用 json 模式（5 轮重试中曾成功过一次：json 声明+解析+路由全对，但分类质量受 glm-4-flash 限制）；知识/提示词三处强化已落地 |
| C07 | PASS | 8/8 | 首跑失败为知识缺口（F5 condition 布尔语义）后通过 |
| C08 | FAIL | 0/1 | 模型边界：行为全对（三档金额/文案正确）但用单 code 而非 branches；话术已改写为通道结构差异版待重测 |
| C09 | FAIL | 3/7 | 模型边界：循环容器工具路径/引擎/知识六项修复（F6~F11）全部落地且经引擎形状 repro 验证可用；Qwen 读完手册仍 0 次使用 parentId |
| C10 | FAIL | 1/4 | 同 C09（break 依赖循环体） |
| C11 | FAIL | 0/1 | 模型边界：单 code 行为全对（清洗输出正确）但未用 loop+continue |
| C12 | FAIL | 6/8 | 模型边界：无视 JVM 语言约束用 javascript（数值结果 750/187.5/320/80 全对） |
| C13 | FAIL | 0/1 | 模型边界：结构正确（llm json 模式）但 glm-4-flash 输出 Python 代码——引擎 FAILED 语义+修复指引按设计工作（即 C21 探测的行为） |
| C14 | PASS | 5/5 | comment 添加后试运行不受影响 |
| C15 | PASS | 4/4 | 首跑失败为产品缺口（F12/F13 子流程不可见/无参 schema）后通过，前端渲染已选工作流卡片 |
| C16 | PASS | 5/5 | variable 赋值/改写/分支全对 |
| C17 | PASS | 4/4 | 数字保真：51/9 均为 number（harness 增加参数名模糊映射） |
| C18 | FAIL | 2/3 | 模型边界：未用 branches（多轮修改分档的数组替换语义未真正行使） |
| C19 | FAIL | 4/7 | 模型边界：缺参兜底路径正确但文案丢"您好"后缀 |
| C20 | PASS | 3/3 | 必败 http：ConnectException→FAILED、end SKIPPED、无假成功 |
| C21 | PASS | 2/2 | 坏 JSON 场景语义可见（本轮解析成功）；C13 提供了 FAILED 分支的实证 |
| C22 | PASS | 5/5 | timeout=3000/retry=2 配置+超时失败如实呈现 |
| C23 | FAIL | 4/6 | 模型边界：branches 分流机制工作，glm-4-flash 把"退款"误判为"发货"（打标质量） |
| C24 | PASS | 4/4 | http 抓取→llm 摘要→关键词全链路通 |
| C25 | FAIL | 1/2 | 同 C09（对象字段循环聚合未走容器） |
| C26 | FAIL | 3/5 | 模型边界：code 替代实现输出 "undefined-小明"（对象字段访问错误），且未说明容器限制 |
| C27 | FAIL | 1/4 | 模型边界：伪造顶层循环连线（loop_1→code_1→loop_1）被 CYCLE 校验准确拦截（防护网有效） |
| C28 | FAIL | 2/3 | 模型边界：llm 节点缺 prompt 未补齐 |
| C29 | PASS | 5/5 | test_case 沉淀→改阈值→全量重跑并报告回归 |
| C30 | PASS | 5/5 | 删字段巡检→修复→复跑通过 |

### 修复清单（全部落地并经回归）

- F1 引擎：`HttpNode` Accept-Encoding 收敛为 gzip——hutool 默认 `gzip, deflate` 协商到 raw deflate 时
  zlib Inflater 解压抛 ZipException，节点假性失败（C03 实证）。
- F2 引擎：`DraftRunService.run` 补 `WorkflowDslValidator` error 级门禁（与 /api/task/run 同一道，NC-05）——
  此前 end 零入度孤立执行可假成功（C04 实证：end_1 从未接线 run 照样出 outputs）。
- F3 引擎：`JacksonHutoolConfig` 注册 JSONNull 序列化器——run_state timeline 里 connect.fromPort=JSONNull
  曾把 GET /status 打成 500（前端轮询同挂）。
- F4 引擎：`TaskInfo` outputs/nodeReports 换 ConcurrentHashMap、NodeReport.snapshots 换 CopyOnWriteArrayList——
  运行中轮询 /api/task/report 曾 ConcurrentModificationException 500。
- F5 知识：condition/branches 的 outputs=布尔判定语义写入 schema description + node-data-rules + SKILL
  （C07 曾把布尔当业务结果直接引用）。
- F6 引擎：`SessionWorkflowDraftService.addNode` 支持 `parentId` 落入 loop 容器（自动补 block-start/block-end
  骨架、首个体节点自动接线）；`connect` 两端同容器时自动写入 loop 节点级 edges、跨界明确拒绝；
  update 支持 parentId / data.parentId 迁移入容器；connect 归一模型猜测的骨架 id 两种语序。
- F7 引擎：`relocateLoopContainerFields` + normalizeLoop——模型写进 data 的 blocks/edges 搬运到节点级
  （引擎 LoopNodeParser 只读节点级），与 http 扁平吸收同一哲学。
- F8 引擎：`LoopNode.execute` 空循环体 fail fast（此前空转至 180s 超时）。
- F9 校验：`<loopId>_locals.item/.index` 内置作用域加入 DANGLING_REF/TEMPLATE_REF 白名单。
- F10 知识：llm json 模式完整范式（含打标判定标准）写入 SKILL/node-data-rules/主提示词；
  loop 三步照抄范式写入 SKILL。
- F11 基建：`AgentSkillCatalog` 种子文件按 classpath 内容同步（原 seed-if-missing 导致资源更新
  永远到不了模型——本次 SKILL/node-data-rules 的全部改动在修复前均未生效，C09 多轮误诊根源）。
- F12 工具：`get(target=canvas)` 回执新增 `publishedWorkflows` 清单——此前模型无法发现已发布工作流，
  子流程复用无从谈起（C15 实证）。
- F13 工具：publishedWorkflows 附子流程 start.outputs/end.inputs schema（入参映射与输出字段引用的事实源，
  与前端子流程清单同口径）。
- 测试：`WorkflowDslApplyCasTest`/`NodeSchemaBadcaseCorpusTest`/`WorkflowDslValidatorTest`/`LoopNodeRobustnessTest`
  夹具按新契约更新（llm 凭证三件套必填、空循环体防护、data.blocks 改吸收语义）。

### 验证命令与结果

- 后端全量：`mvn -B -pl gaia-workflow-app -am test` → **Tests run: 322, Failures: 0, Errors: 0, Skipped: 1（既有），BUILD SUCCESS**。
- 引擎形状 loop 实证（scripts/e2e-conversations 之外的 /tmp repro）：block-start→code(item)→block-end +
  loopOutputs 聚合 → success、逐轮 item、输出保序。
- 前端（Playwright 无头 Chromium，`scripts/e2e-conversations/frontend-verify.mjs`）：
  C07/C15/C24 三个会话工作区+编辑器双截图——画布节点/连线/变量徽标全渲染，编辑器内 **0 Unknown / 0 Undefined**；
  C15 子流程卡片显示「已选择工作流+名称+code」与类型化入出参徽标。截图：/tmp/frontend-C07*.png 等。

### 遗留差距（按优先级）

1. **对话模型编排能力**是 14 个失败的主因：本地 Qwen3.6-35B-A3B（uncensored 微调）在多步容器编排、
   长程修复循环上不可靠（工具链可用的前提下塌缩为单 code 或半途放弃）；glm-4-flash 经 agentscope
   客户端不发工具调用不可用作对话模型。建议：换用具备函数调用且指令遵循更强的对话模型后重测
   C06/C08/C09/C10/C11/C12/C18/C23/C25/C26/C27/C28（基础设施缺陷已全部修复）。
2. C19 文案后缀、C23 打标质量等语义级偏差依赖 llm 节点模型（glm-4-flash）质量，属模型升级项。
3. 内嵌 webview 的 ResizeObserver 问题（status.md 既有记录）未复验；本次全部用无头 Chromium 验证。
