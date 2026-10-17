# 节点 data 填写规则

节点类型：start / end / llm / http / code / condition / branches / loop / variable / string-format / comment

## llm
{"prompt":"总结：{{ start.text }}","temperature":0.3}
apiKey/apiHost/modelName 不填，运行时自动注入平台默认。

## http
{"api":{"method":"GET","url":"https://…"}}
method/url 必须放 api 里（不是 inputsValues.url）。url 必须真实。
请求头：headersValues:{"Key":{"type":"constant","content":"val"}}
请求体：body:{bodyType:"JSON",json:{type:"template",content:"…"}}

## code（js 推荐）
{"script":{"content":"({ result: text.includes('gaia') })"}}
输入经 inputsValues ref 声明后直接用变量名。
最后一个表达式必须是对象字面量。

## condition
{"conditions":[{"key":"if_match","value":{"left":{ref},"operator":"contains","right":{constant}}}]}
出边 fromPort 用 key，未命中走 else。

## start
{"outputs":{"type":"object","properties":{"text":{"type":"string"}}}}

## end
{"inputsValues":{"result":{"type":"ref","content":["code_0","result"]}}}
inputsValues 键必须在 inputs.properties 声明。
