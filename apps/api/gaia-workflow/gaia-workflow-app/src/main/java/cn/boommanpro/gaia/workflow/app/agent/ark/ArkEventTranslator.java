package cn.boommanpro.gaia.workflow.app.agent.ark;

import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * 方舟事件 → 本项目 AgentEvent 的翻译器（每次运行持有一个实例，维护文本缓冲与用量累计）。
 *
 * <p>翻译规则（依据官方文档「Session 事件流」事件域清单）：</p>
 * <ul>
 *   <li>{@code agent.message} → {@code token}：方舟的文本回复可能以全量或增量形态下发，
 *       翻译器用「前缀 diff」启发式归一为增量（联调可按实测切换策略）</li>
 *   <li>{@code agent.thinking} → {@code thinking}（新事件类型，前端可选展示）</li>
 *   <li>{@code agent.tool_use/tool_result} → {@code tool_call/tool_result}，
 *       executedBy=ark-sandbox（方舟云沙箱内置工具）</li>
 *   <li>{@code agent.mcp_tool_use/result} → 同上，executedBy=ark-mcp</li>
 *   <li>{@code agent.custom_tool_use} → {@code tool_call}，executedBy=backend；
 *       执行与回传由 {@code ArkManagedExecutionEngine} 负责</li>
 *   <li>{@code span.model_request_end} → 累计用量并产出 {@code usage} 事件</li>
 *   <li>session.* 控制事件不在此翻译 —— 引擎直接消费（stop_reason 驱动流程）</li>
 * </ul>
 */
@Slf4j
public class ArkEventTranslator {

    /** 已推送的正文累计（前缀 diff 基准） */
    private final StringBuilder messageBuffer = new StringBuilder();
    /** 已推送的思考累计 */
    private final StringBuilder thinkingBuffer = new StringBuilder();

    /** 完成收到的模型请求次数（作为「轮次」的近似值） */
    private int modelRequests = 0;
    private long inputTokens = 0;
    private long outputTokens = 0;
    private long cacheReadInputTokens = 0;
    private long cacheCreationInputTokens = 0;

    /**
     * 翻译一条方舟事件为本项目事件列表（可能为空：控制事件、用量心跳等不直接产出）。
     * 翻译器只做映射，绝不抛异常 —— 单条坏事件不能拖垮整次运行。
     */
    public List<AgentEvent> translate(JSONObject event) {
        if (event == null) {
            return Collections.emptyList();
        }
        String type = event.getStr("type", "");
        try {
            switch (type) {
                case "agent.message":
                    return translateTextDelta(event, messageBuffer, "token");
                case "agent.thinking":
                    return translateTextDelta(event, thinkingBuffer, "thinking");
                case "agent.tool_use":
                    return singleton(toolCallEvent(event, event.getStr("id"), "ark-sandbox"));
                case "agent.mcp_tool_use":
                    return singleton(toolCallEvent(event, event.getStr("id"), "ark-mcp"));
                case "agent.tool_result":
                    return singleton(toolResultEvent(event, event.getStr("tool_use_id"), "ark-sandbox"));
                case "agent.mcp_tool_result":
                    return singleton(toolResultEvent(event, event.getStr("mcp_tool_use_id"), "ark-mcp"));
                case "agent.custom_tool_use":
                    return singleton(toolCallEvent(event, event.getStr("id"), "backend"));
                case "span.model_request_end":
                    return translateUsage(event);
                default:
                    // session.* / user.* 回执 / thread_* / outcome_* 等由引擎或后续版本处理
                    return Collections.emptyList();
            }
        } catch (Exception e) {
            log.warn("[ark-translator] 翻译事件 {} 失败（已忽略）: {}", type, e.getMessage());
            return Collections.emptyList();
        }
    }

    /** 运行结束时的最终正文（累计缓冲） */
    public String getFinalContent() {
        return messageBuffer.toString();
    }

    /** 运行结束时的思考过程累计（落库供审查页回放；无思考返回 null） */
    public String getFinalThinking() {
        String thinking = thinkingBuffer.toString();
        return thinking.isEmpty() ? null : thinking;
    }

    /** 已完成的模型请求次数 */
    public int getModelRequests() {
        return modelRequests;
    }

    /** 累计用量（span.model_request_end 的 model_usage 聚合，官方计费数据源） */
    public JSONObject getUsageJson() {
        return new JSONObject()
            .set("input_tokens", inputTokens)
            .set("output_tokens", outputTokens)
            .set("cache_read_input_tokens", cacheReadInputTokens)
            .set("cache_creation_input_tokens", cacheCreationInputTokens)
            .set("model_requests", modelRequests);
    }

    // ---------------- 内部 ----------------

    /**
     * 文本类事件（正文/思考）的增量归一：
     * 全量文本与前缀缓冲做 diff，产出增量事件；完全不同的文本视为新一轮回复，重置缓冲。
     */
    private List<AgentEvent> translateTextDelta(JSONObject event, StringBuilder buffer, String eventType) {
        String full = extractText(event.get("content"));
        if (full == null || full.isEmpty()) {
            return Collections.emptyList();
        }
        String existing = buffer.toString();
        if (full.equals(existing)) {
            return Collections.emptyList(); // 全量重复推送，不产出
        }
        String delta;
        if (full.startsWith(existing) && full.length() > existing.length()) {
            delta = full.substring(existing.length());
            buffer.append(delta);
        } else if (existing.isEmpty()) {
            delta = full;
            buffer.append(full);
        } else {
            // 与累计前缀不连续：视为新一段独立回复（多段 message 场景）
            log.debug("[ark-translator] {} 与缓冲不连续，按新消息处理（{} 字）", eventType, full.length());
            delta = full;
            buffer.setLength(0);
            buffer.append(full);
        }
        if (delta.isEmpty()) {
            return Collections.emptyList();
        }
        return singleton(AgentEvent.of(eventType, new JSONObject().set("content", delta)));
    }

    private AgentEvent toolCallEvent(JSONObject event, String callId, String executedBy) {
        JSONObject data = new JSONObject()
            .set("id", callId != null ? callId : event.getStr("id"))
            .set("name", event.getStr("name", ""))
            .set("executedBy", executedBy);
        Object input = event.get("input");
        if (input instanceof JSONObject) {
            data.set("args", input);
        } else if (input instanceof String && !((String) input).isEmpty()) {
            try {
                data.set("args", JSONUtil.parseObj((String) input));
            } catch (Exception e) {
                data.set("args", new JSONObject().set("_raw", input));
            }
        } else {
            data.set("args", new JSONObject());
        }
        return AgentEvent.of("tool_call", data);
    }

    private AgentEvent toolResultEvent(JSONObject event, String toolUseId, String executedBy) {
        String payload = extractText(event.get("content"));
        if (payload == null || payload.isEmpty()) {
            payload = String.valueOf(event.get("output"));
        }
        return AgentEvent.of("tool_result", new JSONObject()
            .set("toolCallId", toolUseId != null ? toolUseId : event.getStr("id"))
            .set("name", event.getStr("name", ""))
            .set("executedBy", executedBy)
            .set("payload", payload == null ? "" : payload));
    }

    private List<AgentEvent> translateUsage(JSONObject event) {
        JSONObject usage = event.getJSONObject("model_usage");
        if (usage != null) {
            inputTokens += usage.getLong("input_tokens", 0L);
            outputTokens += usage.getLong("output_tokens", 0L);
            cacheReadInputTokens += usage.getLong("cache_read_input_tokens", 0L);
            cacheCreationInputTokens += usage.getLong("cache_creation_input_tokens", 0L);
        }
        modelRequests++;
        return singleton(AgentEvent.of("usage", new JSONObject()
            .set("last", usage)
            .set("total", getUsageJson())));
    }

    /** content 块数组（[{type:text,...}]）→ 拼接其中全部 text 字段 */
    static String extractText(Object content) {
        if (content == null) {
            return "";
        }
        if (content instanceof String) {
            return (String) content;
        }
        if (content instanceof JSONArray) {
            StringBuilder sb = new StringBuilder();
            JSONArray blocks = (JSONArray) content;
            for (int i = 0; i < blocks.size(); i++) {
                Object block = blocks.get(i);
                if (block instanceof JSONObject) {
                    String text = ((JSONObject) block).getStr("text");
                    if (text != null) {
                        sb.append(text);
                    }
                }
            }
            return sb.toString();
        }
        return "";
    }

    private static List<AgentEvent> singleton(AgentEvent event) {
        List<AgentEvent> list = new ArrayList<>(1);
        list.add(event);
        return list;
    }
}
