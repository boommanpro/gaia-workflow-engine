package cn.boommanpro.gaia.workflow.infra.extend.node.llm;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import cn.boommanpro.gaia.workflow.base.type.DataType;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.base.type.RefType;
import cn.boommanpro.gaia.workflow.base.tools.SpringExpressionParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNode;
import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * LLM节点，用于调用大语言模型API
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 */
@Slf4j
@Data
@EqualsAndHashCode(callSuper = true)
public class LlmNode extends BaseNode {

    // 输入参数值
    private Map<String, Object> inputsValues = new HashMap<>();

    // 超时配置
    private TimeoutConfig timeout;

    /**
     * 输出模式：text=固定输出 result 字符串（默认）；json=结构化输出——
     * 把模型输出的 JSON 解析成声明字段（outputs.properties 白名单由 LlmNodeParser 注入
     * outputParameters，引擎 parseOutputResult 过滤后写入 memory，机制与 code 节点一致）。
     */
    private String outputMode;

    public boolean isJsonOutputMode() {
        return "json".equalsIgnoreCase(outputMode);
    }

    @Override
    public Map<String, Object> execute(Chain chain) {

        Map<String, Object> result = new HashMap<>();

        try {
            // 解析输入参数
            LlmRequest request = buildLlmRequest(chain);

            // 调用LLM API（retryTimes 生效：失败按线性退避重试，此前字段解析了但从未消费）
            String response = callLlmApiWithRetry(request);

            // 解析响应
            String llmResult = parseLlmResponse(response);

            if (isJsonOutputMode()) {
                // 结构化输出：解析为声明字段。解析失败必须 FAILED（下游引用断裂比报错更贵）
                result.putAll(parseStructuredOutput(llmResult));
            } else {
                result.put("result", llmResult);
            }

        } catch (Exception e) {
            // 失败必须上抛（引擎置节点 FAILED + 工作流终态 FAILED）：
            // 旧行为把异常吞成 result.error 字段、节点仍 FINISHED、下游继续跑——假成功
            log.error("LLM调用执行失败", e);
            throw (e instanceof RuntimeException) ? (RuntimeException) e : new RuntimeException(e);
        }

        return result;
    }

    /**
     * json 模式：把模型文本解析为 JSON 对象字段。
     * 容错序：直接 parse → 剥离 ``` 代码围栏 → 截取首个 { 到末个 }。
     * 非对象 JSON / 全部失败抛 IllegalArgumentException（带修复指引）。
     */
    Map<String, Object> parseStructuredOutput(String llmText) {
        if (llmText == null || llmText.trim().isEmpty()) {
            throw new IllegalArgumentException("LLM节点 " + getId()
                + "（json 输出模式）模型返回为空，无法解析为 JSON。修复：prompt 里要求模型只输出一个 JSON 对象");
        }
        JSONObject parsed = tryParseJson(llmText.trim());
        if (parsed == null) {
            throw new IllegalArgumentException("LLM节点 " + getId()
                + "（json 输出模式）模型输出无法解析为 JSON 对象，原始输出前 200 字符: "
                + llmText.substring(0, Math.min(200, llmText.length()))
                + "。修复：prompt 里要求只输出 JSON 对象（不要包 markdown 围栏/解释文字）后重试");
        }
        Map<String, Object> fields = new HashMap<>();
        for (String key : parsed.keySet()) {
            fields.put(key, parsed.get(key));
        }
        return fields;
    }

    private static JSONObject tryParseJson(String text) {
        // 1) 直接解析
        JSONObject direct = parseObjQuietly(text);
        if (direct != null) {
            return direct;
        }
        // 2) 剥离 markdown 代码围栏（```json {...} ``` / ``` {...} ```）
        java.util.regex.Matcher fence = java.util.regex.Pattern
            .compile("```(?:json)?\\s*([\\s\\S]*?)\\s*```", java.util.regex.Pattern.CASE_INSENSITIVE)
            .matcher(text);
        if (fence.find()) {
            JSONObject inFence = parseObjQuietly(fence.group(1).trim());
            if (inFence != null) {
                return inFence;
            }
        }
        // 3) 截取首个 { 到末个 }
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return parseObjQuietly(text.substring(start, end + 1));
        }
        return null;
    }

    private static JSONObject parseObjQuietly(String text) {
        try {
            Object parsed = JSONUtil.parse(text);
            return parsed instanceof JSONObject ? (JSONObject) parsed : null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * 带重试的 LLM 调用：retryTimes 为失败后的额外尝试次数（0=不重试），
     * 间隔线性退避（1s × 第几次重试）。全部尝试失败抛最后一次异常。
     */
    String callLlmApiWithRetry(LlmRequest request) {
        int retries = timeout != null ? Math.max(0, timeout.getRetryTimes()) : 0;
        RuntimeException lastError = null;
        for (int attempt = 0; attempt <= retries; attempt++) {
            if (attempt > 0) {
                log.warn("LLM调用失败，{}ms 后进行第 {}/{} 次重试（节点 {}）",
                    1000L * attempt, attempt, retries, getId());
                try {
                    Thread.sleep(1000L * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("LLM 重试等待被中断", ie);
                }
            }
            try {
                return callLlmApi(request);
            } catch (RuntimeException e) {
                lastError = e;
            }
        }
        throw lastError;
    }

    /**
     * 构建LLM请求
     * @param chain 工作流链
     * @return LLM请求对象
     */
    private LlmRequest buildLlmRequest(Chain chain) {
        LlmRequest request = new LlmRequest();

        // 解析模型名称
        Object modelNameObj = inputsValues.get("modelName");
        request.setModelName(parseValue(modelNameObj, chain));

        // 解析API密钥
        Object apiKeyObj = inputsValues.get("apiKey");
        request.setApiKey(parseValue(apiKeyObj, chain));

        // 解析API主机
        Object apiHostObj = inputsValues.get("apiHost");
        request.setApiHost(parseValue(apiHostObj, chain));

        // 解析温度参数
        Object temperatureObj = inputsValues.get("temperature");
        String temperatureStr = parseValue(temperatureObj, chain);
        if (StrUtil.isNotBlank(temperatureStr)) {
            try {
                request.setTemperature(Double.parseDouble(temperatureStr));
            } catch (NumberFormatException e) {
                log.warn("温度参数解析失败，使用默认值0.5", e);
                request.setTemperature(0.5);
            }
        } else {
            request.setTemperature(0.5);
        }

        // 解析系统提示词
        Object systemPromptObj = inputsValues.get("systemPrompt");
        request.setSystemPrompt(parseTemplate(systemPromptObj, chain));

        // 解析用户提示词
        Object promptObj = inputsValues.get("prompt");
        request.setPrompt(parseTemplate(promptObj, chain));

        return request;
    }

    /**
     * 调用LLM API
     * @param request LLM请求对象
     * @return API响应字符串
     */
    private String callLlmApi(LlmRequest request) {
        // 缺 apiHost/modelName 是配置错误（此前裸 NPE "url is null" 语义不明——2026-10-24 改为显式报错）
        if (request.getApiHost() == null || request.getApiHost().trim().isEmpty()) {
            throw new IllegalArgumentException("LLM节点 " + getId()
                + " 缺少 apiHost 配置：inputsValues 里补 {\"apiHost\":\"https://…/v1\"}"
                + "（平台不再运行时隐式注入：AI 生成时须从 get(target=knowledge, nodeType=llm) 的 "
                + "platformDefaultModel 填入，手动创建的节点请按修复示例补齐）");
        }
        if (request.getModelName() == null || request.getModelName().trim().isEmpty()) {
            throw new IllegalArgumentException("LLM节点 " + getId()
                + " 缺少 modelName 配置：inputsValues 里补 {\"modelName\":\"<模型名>\"}");
        }
        String url = request.getApiHost();
        if (!url.endsWith("/")) {
            url += "/";
        }
        url += "chat/completions";

        // 构建请求体
        JSONObject requestBody = new JSONObject();
        requestBody.set("model", request.getModelName());
        requestBody.set("temperature", request.getTemperature());

        // 构建消息数组
        List<Map<String, String>> messages = new ArrayList<>();

        // 添加系统消息
        if (StrUtil.isNotBlank(request.getSystemPrompt())) {
            Map<String, String> systemMessage = new HashMap<>();
            systemMessage.put("role", "system");
            systemMessage.put("content", request.getSystemPrompt());
            messages.add(systemMessage);
        }

        // 添加用户消息
        if (StrUtil.isNotBlank(request.getPrompt())) {
            Map<String, String> userMessage = new HashMap<>();
            userMessage.put("role", "user");
            userMessage.put("content", request.getPrompt());
            messages.add(userMessage);
        }

        requestBody.set("messages", messages);

        // 发起HTTP请求
        HttpRequest httpRequest = new HttpRequest(url)
                .method(cn.hutool.http.Method.POST)
                .header("Authorization", "Bearer " + request.getApiKey())
                .header("Content-Type", "application/json")
                .body(requestBody.toString());

        // 设置超时
        if (timeout != null) {
            httpRequest.timeout(timeout.getTimeout());
        }

        HttpResponse response = httpRequest.execute();

        if (!response.isOk()) {
            throw new RuntimeException("LLM API调用失败，状态码: " + response.getStatus() + ", 响应: " + response.body());
        }

        return response.body();
    }

    /**
     * 解析LLM响应
     * @param response API响应字符串
     * @return 解析后的结果
     */
    private String parseLlmResponse(String response) {
        try {
            JSONObject jsonResponse = JSONUtil.parseObj(response);

            // 尝试从OpenAI格式的响应中提取内容
            if (jsonResponse.containsKey("choices")) {
                Object choices = jsonResponse.get("choices");
                if (choices instanceof List) {
                    List<?> choicesList = (List<?>) choices;
                    if (!choicesList.isEmpty()) {
                        Object firstChoice = choicesList.get(0);
                        if (firstChoice instanceof Map) {
                            Map<?, ?> choiceMap = (Map<?, ?>) firstChoice;
                            Object message = choiceMap.get("message");
                            if (message instanceof Map) {
                                Map<?, ?> messageMap = (Map<?, ?>) message;
                                Object content = messageMap.get("content");
                                return content != null ? content.toString() : "";
                            }
                        }
                    }
                }
            }

            // 如果无法解析，返回原始响应
            return response;

        } catch (Exception e) {
            log.warn("解析LLM响应失败，返回原始响应", e);
            return response;
        }
    }

    /**
     * 解析值（支持常量和引用）
     * @param valueObj 值对象
     * @param chain 工作流链
     * @return 解析后的字符串值
     */
    private String parseValue(Object valueObj, Chain chain) {
        if (valueObj instanceof Map) {
            Map<String, Object> valueMap = (Map<String, Object>) valueObj;
            String type = (String) valueMap.get("type");
            Object content = valueMap.get("content");

            if (RefType.CONSTANT.name().toLowerCase().equals(type)) {
                return content != null ? content.toString() : null;
            } else if (RefType.REF.name().toLowerCase().equals(type) && content instanceof List) {
                return resolveRef((List<?>) content, chain);
            }
        }
        return null;
    }

    /**
     * 解析模板内容
     * @param templateObj 模板对象
     * @param chain 工作流链
     * @return 解析后的字符串
     */
    private String parseTemplate(Object templateObj, Chain chain) {
        if (templateObj instanceof Map) {
            Map<String, Object> templateMap = (Map<String, Object>) templateObj;
            String type = (String) templateMap.get("type");
            Object content = templateMap.get("content");

            if ("template".equals(type) && content instanceof String) {
                return SpringExpressionParser.getInstance().getVueStringValue((String) content, chain.getMemory());
            } else if (RefType.CONSTANT.name().toLowerCase().equals(type)) {
                return content != null ? content.toString() : null;
            } else if (RefType.REF.name().toLowerCase().equals(type) && content instanceof List) {
                // 修复：prompt/systemPrompt 配置为 ref 引用时，从 memory 解析上游节点输出
                // 此前该分支被遗漏，直接返回空串，导致 LLM 收到空 prompt 仍发请求
                return resolveRef((List<?>) content, chain);
            }
        } else if (templateObj instanceof String) {
            return (String) templateObj;
        }
        return "";
    }

    /**
     * 解析 ref 引用路径，支持任意深度路径（nodeId → field → subField → ...）
     * 例如 ["start_0","query"] 取 memory[start_0][query]
     * 例如 ["start_0","output","field"] 取 memory[start_0][output][field]
     *
     * @param refPath 引用路径数组
     * @param chain 工作流链
     * @return 解析后的字符串值，路径不存在返回 null
     */
    private String resolveRef(List<?> refPath, Chain chain) {
        if (refPath == null || refPath.size() < 2) {
            return null;
        }
        String nodeId = refPath.get(0).toString();
        Object current = chain.getMemory().get(nodeId);
        // 逐层深入解析：[1] → [2] → ...
        for (int i = 1; i < refPath.size(); i++) {
            if (current instanceof Map) {
                current = ((Map<?, ?>) current).get(refPath.get(i).toString());
            } else {
                return null;
            }
        }
        return current != null ? current.toString() : null;
    }

    /**
     * 输出白名单不再写死 result：由 {@link LlmNodeParser} 按输出模式注入——
     * text=固定 [result]；json=outputs.properties 声明集（机制与 code 节点一致，
     * 引擎 parseOutputResult 据此过滤进 memory 的字段）。
     */

    /**
     * LLM请求配置
     */
    @Data
    public static class LlmRequest {
        private String modelName;
        private String apiKey;
        private String apiHost;
        private Double temperature;
        private String systemPrompt;
        private String prompt;
    }

    /**
     * 超时配置
     */
    @Data
    public static class TimeoutConfig {
        private int timeout;
        private int retryTimes;
    }


    @Override
    public NodeTypeEnum getNodeType() {
        return NodeTypeEnum.LLM;
    }

    @Override
    protected Map<String, Object> getParametersData(Chain chain) {
        return chain.getMemory();
    }
}

