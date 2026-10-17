package cn.boommanpro.gaia.workflow.app.agent.ass;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * AgentScope Service 事件翻译器 —— 把 Session API 的服务端事件翻译为 Gaia 统一
 * {@link cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent} 词汇。
 *
 * <p>实测事件词汇（2.1.0-BETA1）与映射：</p>
 * <pre>
 *   item.delta        {content:[{text,type}]}                → token（text）/ thinking（thinking）
 *   tool.requested    {name, input, tool_call_id}            → tool_call {id,name,args,executedBy:"as-service"}
 *   tool.completed    {result:{id,name,output:[{text}]}}     → tool_result {toolCallId,name,payload}
 *   usage.recorded    {usage:{inputTokens,outputTokens,...}} → 累计，收尾时由引擎落库
 *   item.completed    终版 assistant 消息                      → 记录最终正文（不外发，避免与 token 重复）
 *   run.ended / turn.completed / turn.failed                 → 引擎直接消费（终止信号），不翻译
 * </pre>
 *
 * <p>每个 run 一个实例（无跨 run 状态）。</p>
 */
public class AgentServiceEventTranslator {

    private static final String OPEN_TAG = "<think>";
    private static final String CLOSE_TAG = "</think>";

    private final StringBuilder finalContent = new StringBuilder();
    private final StringBuilder finalThinking = new StringBuilder();
    /** <think> 标签解析状态：思考流内 / 前一个 delta 尾部残留的部分标签（如 "<thi"） */
    private boolean insideThink = false;
    private String pendingTagFragment = "";
    private final AtomicLong inputTokens = new AtomicLong(0);
    private final AtomicLong outputTokens = new AtomicLong(0);
    private final AtomicLong cachedTokens = new AtomicLong(0);
    private final AtomicLong modelRequests = new AtomicLong(0);
    private final AtomicReference<String> lastError = new AtomicReference<>(null);
    /** 收到的服务端事件总数（观测用） */
    private final AtomicLong serverEvents = new AtomicLong(0);

    // ---------------- 模型轮次镜像（供 LLM 账本写入 Trajectory 模型行） ----------------

    /** 一轮模型调用（远端托管，本地按事件反推的镜像行） */
    public static final class ModelRound {
        public int seq;
        public String modelCallId;
        public String model;
        public long startedAt = System.currentTimeMillis();
        public long endedAt;
        public final StringBuilder thinking = new StringBuilder();
        public final StringBuilder content = new StringBuilder();
        /** {name, arguments} 数组 */
        public final JSONArray toolCalls = new JSONArray();
        public Long inputTokens;
        public Long outputTokens;
        public Long cachedTokens;
        public boolean closed;
        public boolean persisted;
    }

    private final List<ModelRound> rounds = new ArrayList<>();
    private ModelRound currentRound;
    private int roundSeq = 0;
    private final Object roundLock = new Object();

    /** 翻译一条服务端事件；返回 0..n 条 Gaia 事件（控制面事件返回空列表） */
    public List<cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent> translate(JSONObject event) {
        serverEvents.incrementAndGet();
        String type = event.getStr("type", "");
        JSONObject data = event.getJSONObject("data");
        if (data == null) {
            data = new JSONObject();
        }
        List<cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent> out = new ArrayList<>();
        switch (type) {
            case "item.started":
                openRound(data);
                translateDelta(data, out);
                break;
            case "item.delta":
                translateDelta(data, out);
                break;
            case "tool.requested":
                attachToolCall(data);
                out.add(cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent.of("tool_call",
                    new JSONObject()
                        .set("id", data.getStr("tool_call_id", ""))
                        .set("name", data.getStr("name", ""))
                        .set("args", data.get("input") instanceof JSONObject ? data.getJSONObject("input") : new JSONObject())
                        .set("executedBy", "as-service-mcp")));
                break;
            case "tool.completed":
                translateToolCompleted(data, out);
                break;
            case "usage.recorded":
                closeRound(data);
                recordUsage(data.getJSONObject("usage"));
                break;
            case "item.completed":
                rememberFinalAssistant(data);
                break;
            case "turn.failed":
                JSONObject error = data.getJSONObject("error");
                if (error != null && lastError.get() == null) {
                    String code = error.getStr("code", "TurnFailed");
                    lastError.set(code);
                }
                closeOpenRounds();
                break;
            case "run.ended":
                closeOpenRounds();
                break;
            default:
                // session.* / turn.* 其余为控制面，引擎自行消费
                break;
        }
        return out;
    }

    // ---------------- 轮次镜像 ----------------

    private void openRound(JSONObject data) {
        JSONObject item = data.getJSONObject("item");
        if (item == null || !"message".equals(item.getStr("type"))) {
            return;
        }
        String callId = data.getStr("model_call_id", "");
        if (callId.isEmpty() || (currentRound != null && callId.equals(currentRound.modelCallId))) {
            return;
        }
        synchronized (roundLock) {
            closeOpenRounds();
            ModelRound round = new ModelRound();
            round.seq = ++roundSeq;
            round.modelCallId = callId;
            rounds.add(round);
            currentRound = round;
        }
    }

    private void attachToolCall(JSONObject data) {
        synchronized (roundLock) {
            ModelRound target = currentRound != null ? currentRound
                : (!rounds.isEmpty() ? rounds.get(rounds.size() - 1) : null);
            if (target == null) {
                return;
            }
            target.toolCalls.add(new JSONObject()
                .set("name", data.getStr("name", ""))
                .set("arguments", data.get("input") instanceof JSONObject
                    ? data.getJSONObject("input").toString() : String.valueOf(data.get("input"))));
        }
    }

    private void closeRound(JSONObject data) {
        synchronized (roundLock) {
            String callId = data.getStr("model_call_id", "");
            ModelRound target = currentRound;
            if (target == null && !rounds.isEmpty()) {
                target = rounds.get(rounds.size() - 1);
            }
            if (target == null || (target.closed)) {
                return;
            }
            if (!callId.isEmpty() && target.modelCallId != null && !callId.equals(target.modelCallId)
                && !rounds.isEmpty()) {
                // usage 的 call 与当前轮不一致时归到最后一轮（保守）
                target = rounds.get(rounds.size() - 1);
            }
            target.model = data.getStr("model", target.model);
            JSONObject usage = data.getJSONObject("usage");
            if (usage != null) {
                target.inputTokens = usage.getLong("inputTokens");
                target.outputTokens = usage.getLong("outputTokens");
                target.cachedTokens = usage.getLong("cachedTokens");
            }
            target.endedAt = System.currentTimeMillis();
            target.closed = true;
            if (currentRound == target) {
                currentRound = null;
            }
        }
    }

    private void closeOpenRounds() {
        synchronized (roundLock) {
            if (currentRound != null) {
                currentRound.endedAt = System.currentTimeMillis();
                currentRound.closed = true;
                currentRound = null;
            }
        }
    }

    /** 把思考/正文增量归到当前轮（无轮则忽略——item.started 之前的零星 delta） */
    private void attributeToRound(String thinkingText, String contentText) {
        synchronized (roundLock) {
            ModelRound target = currentRound != null ? currentRound
                : (!rounds.isEmpty() ? rounds.get(rounds.size() - 1) : null);
            if (target == null) {
                return;
            }
            if (thinkingText != null) {
                target.thinking.append(thinkingText);
            }
            if (contentText != null) {
                target.content.append(contentText);
            }
        }
    }

    private void translateDelta(JSONObject data,
                                List<cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent> out) {
        JSONArray content = data.getJSONArray("content");
        if (content == null) {
            return;
        }
        for (int i = 0; i < content.size(); i++) {
            JSONObject part = content.getJSONObject(i);
            if (part == null) {
                continue;
            }
            String partType = part.getStr("type", "text");
            if ("thinking".equals(partType)) {
                // 服务端原生思考块（当前发行版不外发，保留兼容）
                String delta = part.getStr("thinking", part.getStr("text", ""));
                if (delta != null && !delta.isEmpty()) {
                    finalThinking.append(delta);
                    out.add(thinkingEvent(delta));
                }
            } else {
                String delta = part.getStr("text", "");
                if (delta != null && !delta.isEmpty()) {
                    translateThinkingWrapped(delta, out);
                }
            }
        }
    }

    /**
     * 解析 <think>…</think> 包裹的文本流（shim 把思考增量包装成文本透传，
     * 数据面会剥掉原生思考块）——思考段还原为 thinking 事件，其余为 token。
     */
    private void translateThinkingWrapped(String delta,
                                          List<cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent> out) {
        String buffer = pendingTagFragment + delta;
        pendingTagFragment = "";
        int cursor = 0;
        while (cursor < buffer.length()) {
            if (insideThink) {
                int close = buffer.indexOf(CLOSE_TAG, cursor);
                if (close < 0) {
                    // 尾部可能是半个闭合标签，扣留待下一个 delta
                    int keep = holdbackLength(buffer, cursor, CLOSE_TAG);
                    emitSegment(buffer.substring(cursor, buffer.length() - keep), true, out);
                    pendingTagFragment = buffer.substring(buffer.length() - keep);
                    return;
                }
                emitSegment(buffer.substring(cursor, close), true, out);
                cursor = close + CLOSE_TAG.length();
                insideThink = false;
            } else {
                int open = buffer.indexOf(OPEN_TAG, cursor);
                if (open < 0) {
                    int keep = holdbackLength(buffer, cursor, OPEN_TAG);
                    emitSegment(buffer.substring(cursor, buffer.length() - keep), false, out);
                    pendingTagFragment = buffer.substring(buffer.length() - keep);
                    return;
                }
                emitSegment(buffer.substring(cursor, open), false, out);
                cursor = open + OPEN_TAG.length();
                insideThink = true;
            }
        }
    }

    /** 扣留尾部可能的半截标签（最长 标签长度-1 个字符） */
    private int holdbackLength(String buffer, int cursor, String tag) {
        int max = Math.min(tag.length() - 1, buffer.length() - cursor);
        for (int keep = max; keep > 0; keep--) {
            if (tag.startsWith(buffer.substring(buffer.length() - keep))) {
                return keep;
            }
        }
        return 0;
    }

    private void emitSegment(String text, boolean thinking, List<cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent> out) {
        if (text.isEmpty()) {
            return;
        }
        if (thinking) {
            finalThinking.append(text);
            attributeToRound(text, null);
            out.add(thinkingEvent(text));
        } else {
            finalContent.append(text);
            attributeToRound(null, text);
            out.add(cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent.of("token",
                new JSONObject().set("content", text)));
        }
    }

    private cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent thinkingEvent(String delta) {
        return cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent.of("thinking",
            new JSONObject().set("content", delta));
    }

    private void translateToolCompleted(JSONObject data,
                                        List<cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent> out) {
        JSONObject result = data.getJSONObject("result");
        if (result == null) {
            return;
        }
        StringBuilder payload = new StringBuilder();
        JSONArray output = result.getJSONArray("output");
        if (output != null) {
            for (int i = 0; i < output.size(); i++) {
                JSONObject part = output.getJSONObject(i);
                if (part != null && part.getStr("text") != null) {
                    if (payload.length() > 0) {
                        payload.append('\n');
                    }
                    payload.append(part.getStr("text"));
                }
            }
        }
        out.add(cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent.of("tool_result",
            new JSONObject()
                .set("toolCallId", result.getStr("id", data.getStr("tool_call_id", "")))
                .set("name", result.getStr("name", ""))
                .set("rejected", false)
                .set("payload", payload.toString())));
    }

    private void recordUsage(JSONObject usage) {
        if (usage == null) {
            return;
        }
        modelRequests.incrementAndGet();
        addIfPositive(inputTokens, usage.getLong("inputTokens"));
        addIfPositive(outputTokens, usage.getLong("outputTokens"));
        addIfPositive(cachedTokens, usage.getLong("cachedTokens"));
    }

    private void addIfPositive(AtomicLong target, Long value) {
        if (value != null && value > 0) {
            target.addAndGet(value);
        }
    }

    /** 记录终版 assistant 消息正文（item.completed，覆盖增量累积的最终视图） */
    private void rememberFinalAssistant(JSONObject data) {
        JSONObject item = data.getJSONObject("item");
        if (item == null || !"ASSISTANT".equalsIgnoreCase(item.getStr("role", "assistant"))) {
            return;
        }
        JSONArray content = item.getJSONArray("content");
        if (content == null || content.isEmpty()) {
            return;
        }
        StringBuilder text = new StringBuilder();
        for (int i = 0; i < content.size(); i++) {
            JSONObject part = content.getJSONObject(i);
            if (part != null && part.getStr("text") != null) {
                text.append(part.getStr("text"));
            }
        }
        if (text.length() > 0) {
            finalContent.setLength(0);
            finalContent.append(stripThinkBlocks(text.toString()));
        }
    }

    /** 剥离 <think>…</think> 段（终版视图兜底；流式阶段已拆分为 thinking 事件） */
    public static String stripThinkBlocks(String text) {
        if (text == null || !text.contains(OPEN_TAG)) {
            return text;
        }
        return text.replaceAll("(?s)<think>\\s*</think>|<think>.*?</think>", "").trim();
    }

    // ---------------- 读取 ----------------

    /** 最终正文（优先 item.completed 终版，退化用增量累积） */
    public String getFinalContent() {
        return finalContent.toString();
    }

    public String getFinalThinking() {
        return finalThinking.toString();
    }

    public long getInputTokens() {
        return inputTokens.get();
    }

    public long getOutputTokens() {
        return outputTokens.get();
    }

    public long getCachedTokens() {
        return cachedTokens.get();
    }

    public String getLastError() {
        return lastError.get();
    }

    /** usage.recorded 次数（≈ 模型请求数） */
    public int getModelRequests() {
        return (int) modelRequests.get();
    }

    public long getServerEvents() {
        return serverEvents.get();
    }

    /** 取出「已关闭且未持久化」的模型轮次（镜像写 LLM 账本用），取过的标记 persisted */
    public synchronized List<ModelRound> drainClosedRounds() {
        List<ModelRound> out = new ArrayList<>();
        for (ModelRound round : rounds) {
            if (round.closed && !round.persisted) {
                round.persisted = true;
                out.add(round);
            }
        }
        return out;
    }

    /** 用量 JSON（引擎收尾落库形态，对齐 ark：input_tokens/output_tokens/cache_read_input_tokens） */
    public JSONObject getUsageJson() {
        return new JSONObject()
            .set("input_tokens", inputTokens.get())
            .set("output_tokens", outputTokens.get())
            .set("cache_read_input_tokens", cachedTokens.get())
            .set("model_requests", (int) modelRequests.get());
    }
}
