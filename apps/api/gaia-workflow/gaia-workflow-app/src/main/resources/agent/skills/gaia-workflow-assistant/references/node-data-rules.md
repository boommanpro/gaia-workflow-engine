# 节点 data 填写规则

节点类型：start / end / llm / http / code / condition / branches / loop / variable / string-format / workflow（子流程） / comment（批注）

> data 字段是严格契约（additionalProperties:false）：拼错/自创字段名会被 schema 当场拒绝，issues 带字段路径。
> 完整契约以 get(target=knowledge, nodeType) 的 paramSchema 为准。

## llm
{"prompt":"总结：{{start.text}}","temperature":0.3}
（模板占位 `{{节点id.字段}}` 花括号内侧不加空格）
**modelName/apiHost/apiKey 必填**：从 get(target=knowledge, nodeType=llm) 返回的
platformDefaultModel 把三个值**原样填进 inputsValues**（平台不再运行时隐式注入；
配置要在表单可见、随草稿持久化）。不要自编、不要写进提示词正文。一次获取后本会话内复用。

**输出模式 outputMode**：
- `text`（默认）：固定输出 `result` 一个字符串字段，下游只能引用 `llm_x.result`。
- `json`（结构化输出，需要下游引用具体字段时用）：outputs.properties 声明的字段就是输出字段，
  引擎把模型输出的 JSON 解析成声明字段（解析失败节点 FAILED），下游直接引用 `llm_x.<字段>`，
  不再需要 code 节点做 JSON.parse。写法：
```json
{"outputMode":"json",
 "prompt":"评估订单风险。只输出 JSON：{\"riskLevel\":\"高|中|低\",\"score\":0-100}",
 "outputs":{"type":"object","properties":{"riskLevel":{"type":"string"},"score":{"type":"number"}}}}
```
  规则：outputs.properties 至少声明一个字段（缺失会被当场拒绝）；prompt 里必须要求模型只输出
  这些字段的 JSON 对象（不要 markdown 围栏/解释文字）；字段名与 prompt 要求的 JSON 键一致。
  **打标/枚举/分级类任务必须在 prompt（或 systemPrompt）里写明判定标准**（例：出现抱怨、催促、
  威胁投诉 → negative；纯咨询 → neutral；表扬感谢 → positive），只给枚举值不给标准时小模型
  会大量误判成 neutral（2026-10-25 C06 实证）。

## http
{"api":{"method":"GET","url":"https://…"}}
method/url 必须放 api 里（不是 inputsValues.url）。url 必须真实。
请求头：headersValues:{"Key":{"type":"constant","content":"val"}}
请求体：body:{bodyType:"JSON",json:{type:"template",content":"…"}}

## code（js 推荐）
{"script":{"language":"javascript","content":"({ result: text.includes('gaia') })"}}
language 只支持 javascript/java/groovy（js/jsReturn 同 javascript；python 等会被当场拒绝）。
输入经 inputsValues ref 声明后直接用变量名。
最后一个表达式必须是对象字面量。
**outputs.properties 里 object 类型的字段要写全 properties**（下游引用 `code_x.buyer.country` 时，
变量面板按声明展开子字段；只写 {"type":"object"} 下游会显示变量不存在）。
数量/统计值（如 items 数量）在 code 里先算好输出成独立字段（如 itemCount），
模板和条件里引用它——不要在模板里写 `{{x.items.length}}`。

## condition
{"conditions":[{"key":"if_match","value":{"left":{"type":"ref","content":["上游id","字段"]},"operator":"contains","right":{"type":"constant","content":"比较值"}}}]}
operator 合法值：contains/not_contains/eq/neq/gt/gte/lt/lte/is_empty/is_not_empty/is_true/is_false（注意是 neq/gte/lte，不是 ne/ge/le）。
出边 fromPort 用 key，未命中走 else。
**各分支连到不同目标**才有分流意义；多个分支（含 else）连向同一目标时应合并为一条 else 边。
**outputs 是布尔不是业务结果**：condition 的输出是每个 key 的命中布尔（走 else 时 else=true），
下游直接引用它只会得到 true/false。要输出分支专属文案/数值，在各分支后接 string-format/code
生成，再汇入 end。

## branches
{"branches":[{"id":"vip","logic":"and","conditions":[…]}]}
出边 fromPort 用分支 id，未命中走 else；logic 只认 and/or。
**outputs 同样是每个分支 id 的命中布尔**（else 同理），分支专属内容在各分支后接
string-format/code 生成，不要把布尔当业务结果引用。

## start
{"outputs":{"type":"object","properties":{"text":{"type":"string"}}}}

## end
{"inputsValues":{"result":{"type":"ref","content":["code_0","result"]}}}
inputsValues 键必须在 inputs.properties 声明。

## loop
{"loopFor":{"type":"ref","content":["上游id","字段"]}}
**循环体节点必须用 `node(action=add, parentId="<loopId>", items=[…])` 放进容器**：
- 首次放入会自动补 block-start/block-end 骨架，并把第一个体节点接到 block-start（回执含 container/autoConnected）；
- 容器内节点之间的连线用 `edge(action=connect)`，两端都在同一容器内时自动写入容器内部；
- 迭代变量引用 `{"type":"ref","content":["<loopId>_locals","item"]}`（或模板 `{{<loopId>_locals.item}}`）；
- 每轮输出聚合成数组用 loop 节点 data.loopOutputs：`{"<键>":{"type":"ref","content":["<loopId>_locals","<体内节点id>"]…}}`（引擎逐轮收集，保序）；
- 绝不要在 loop 外部 add 体节点再 connect 到 loop——那会生成顶层节点，永远不进循环。

## string-format
{"script":{"language":"spel-standard","content":"${a.b}"}}
language 只支持 spel-standard（${a.b}）/ spel-vue（{{a.b}}）/ thymeleaf-text（[(${a.b})]）。

## workflow（子流程）
{"workflowId":"<目标工作流code>","inputsValues":{"arg1":{"type":"ref","content":["上游id","字段"]}}}
先 get(target=canvas) 查可用 workflowCode，workflowId 必填（缺失会被当场拒绝）。

## variable
{"assign":[{"operator":"declare","left":"sum","right":{"type":"constant","content":0}}]}
