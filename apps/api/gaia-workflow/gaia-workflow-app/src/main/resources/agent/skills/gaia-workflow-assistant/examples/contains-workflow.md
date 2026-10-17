# 包含判断完整示例

结构：start(input_text) → condition(if_match: contains gaia) → code(转中文) → end(result)

## 正例
input_text = "hello gaia world" → result = "命中"

## 反例
input_text = "hello world" → result = "未命中"

## 注意
- start 的 outputs.properties 参数名必须与下游 ref 一致
- end 的 inputsValues 键必须在 inputs.properties 声明
- else 路径和 if 路径都要验证
