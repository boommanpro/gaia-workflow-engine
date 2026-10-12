package cn.boommanpro.gaia.workflow.app.agent.engine;

import io.agentscope.core.message.ContentBlock;
import io.agentscope.core.message.Msg;
import io.agentscope.core.message.TextBlock;
import io.agentscope.core.message.ToolResultBlock;
import io.agentscope.core.message.ToolUseBlock;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import io.agentscope.core.model.ChatResponse;
import io.agentscope.core.model.ChatUsage;
import io.agentscope.core.model.GenerateOptions;
import io.agentscope.core.model.Model;
import io.agentscope.core.model.ToolSchema;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

/**
 * LLM 调用埋点模型 —— {@link Model} 装饰器，把每次模型调用记进 {@code agent_llm_call_log}
 * （对标 OpenWorkBuddy trace 的 generation 层：完整请求摘要/输出摘要/usage/耗时/结局）。
 *
 * <p>埋点挂在这里而不是事件层，是因为只有 Model.stream() 能看到「这次到底发给模型什么」——
 * 框架的 MODEL_CALL_* 事件不带请求内容。失败/空响应/复读的事后复现全靠这份账本。</p>
 *
 * <p>记录绝不影响主链路：digest 构建与持久化全部 try/catch 吞掉，flux 语义原样透传。</p>
 */
@Slf4j
public class RecordingModel implements Model {

    /** 单字段摘要上限（头尾保留，中间挖洞标注） */
    private static final int DIGEST_MAX = 2000;
    private static final int PER_MSG_MAX = 400;

    /** 一次模型调用的观测记录（持久化由引擎侧 callback 决定去哪） */
    public static final class LlmCallRecord {
        public int seq;
        public String model;
        public int messagesCount;
        public int toolsCount;
        public String promptDigest;
        public String outputDigest;
        /** 真实请求 JSON（OpenAI 格式：messages + tools + options）——问题复现的第一手证据 */
        public String requestJson;
        /** 真实响应 JSON（流式块组装后的完整输出：content + tool_calls + usage + finish_reason） */
        public String responseJson;
        public Integer promptTokens;
        public Integer completionTokens;
        public Integer cachedTokens;
        public long durationMs;
        public String status = "ok";
        public String errorMessage;
    }

    private final Model delegate;
    private final Consumer<LlmCallRecord> recordSink;
    private final AtomicInteger seq = new AtomicInteger();

    public RecordingModel(Model delegate, Consumer<LlmCallRecord> recordSink) {
        this.delegate = delegate;
        this.recordSink = recordSink;
    }

    @Override
    public Flux<ChatResponse> stream(List<Msg> msgs, List<ToolSchema> tools, GenerateOptions options) {
        long startedAt = System.currentTimeMillis();
        LlmCallRecord record = new LlmCallRecord();
        record.seq = seq.incrementAndGet();
        record.model = delegate.getModelName();
        record.messagesCount = msgs != null ? msgs.size() : 0;
        record.toolsCount = tools != null ? tools.size() : 0;
        try {
            record.promptDigest = promptDigest(msgs);
        } catch (Exception e) {
            log.debug("[recording-model] prompt digest failed: {}", e.getMessage());
        }
        // 真实入参（开发者视角：拿日志即可原样复现这次调用 —— curl 同款 body）
        try {
            record.requestJson = buildRequestJson(delegate.getModelName(), options, tools, msgs).toString();
        } catch (Exception e) {
            log.debug("[recording-model] request json build failed: {}", e.getMessage());
        }

        StringBuilder output = new StringBuilder();
        ResponseAssembler assembler = new ResponseAssembler();
        return delegate.stream(msgs, tools, options)
            .doOnNext(response -> {
                try {
                    appendResponse(output, response);
                    assembler.record(response);
                } catch (Exception ignore) {
                    // 摘要构建失败不影响流
                }
            })
            .doOnError(e -> {
                record.status = "error";
                record.errorMessage = truncate(e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName(), 500);
            })
            .doFinally(signal -> {
                record.durationMs = System.currentTimeMillis() - startedAt;
                record.outputDigest = truncate(output.toString(), DIGEST_MAX);
                // usage 列回填：账本列直接可查（Trajectory/指标口径），不必解析 response_json
                record.promptTokens = (int) Math.min(assembler.inputTokens, Integer.MAX_VALUE);
                record.completionTokens = (int) Math.min(assembler.outputTokens, Integer.MAX_VALUE);
                record.cachedTokens = (int) Math.min(assembler.cachedTokens, Integer.MAX_VALUE);
                try {
                    record.responseJson = assembler.buildJson(delegate.getModelName()).toString();
                } catch (Exception e) {
                    log.debug("[recording-model] response json build failed: {}", e.getMessage());
                }
                if (record.outputDigest.isEmpty() && "ok".equals(record.status)) {
                    record.status = "empty";
                }
                try {
                    recordSink.accept(record);
                } catch (Exception e) {
                    log.debug("[recording-model] record persist failed: {}", e.getMessage());
                }
            });
    }

    @Override
    public String getModelName() {
        return delegate.getModelName();
    }

    @Override
    public int getContextWindowSize() {
        return delegate.getContextWindowSize();
    }

    // ---------------- 摘要构建 ----------------

    /**
     * 真实请求 JSON（OpenAI Chat Completions 同构）：messages（含 tool_calls / tool_call_id 配对）+
     * tools schema + options。开发者拿这份日志即可原样 curl 复现这次调用 —— 排障的第一手证据。
     * messages 内容与 tool_calls 的 arguments 均完整保留（用户口径：全量对话内容，不做截断）。
     */
    static JSONObject buildRequestJson(String model, GenerateOptions options,
                                       List<ToolSchema> tools, List<Msg> msgs) {
        JSONObject request = new JSONObject();
        request.set("model", model);
        if (options != null) {
            JSONObject opts = new JSONObject();
            if (options.getTemperature() != null) opts.set("temperature", options.getTemperature());
            if (options.getTopP() != null) opts.set("top_p", options.getTopP());
            if (options.getMaxTokens() != null) opts.set("max_tokens", options.getMaxTokens());
            if (options.getStream() != null) opts.set("stream", options.getStream());
            if (!opts.isEmpty()) {
                request.set("options", opts);
            }
        }
        if (tools != null && !tools.isEmpty()) {
            JSONArray toolsJson = new JSONArray();
            for (ToolSchema tool : tools) {
                if (tool == null) {
                    continue;
                }
                JSONObject function = new JSONObject()
                    .set("name", tool.getName())
                    .set("description", tool.getDescription());
                if (tool.getParameters() != null) {
                    function.set("parameters", new JSONObject(tool.getParameters()));
                }
                toolsJson.add(new JSONObject().set("type", "function").set("function", function));
            }
            request.set("tools", toolsJson);
        }
        request.set("messages", openAiMessages(msgs));
        return request;
    }

    /**
     * AgentScope Msg 列表 → OpenAI messages 数组（assistant 带 tool_calls，tool 带 tool_call_id）。
     *
     * <p>工具结果按「内容块」判定而不是 Msg 子类：框架不同链路可能用 ToolResultMessage，
     * 也可能用 role=TOOL 的普通 Msg 装同样的 ToolResultBlock——只判子类会让结果落进
     * 普通分支被静默丢弃（2026-10-11 账本 tool 行 content="" 且无 tool_call_id 的根因）。</p>
     */
    static JSONArray openAiMessages(List<Msg> msgs) {
        JSONArray messages = new JSONArray();
        if (msgs == null) {
            return messages;
        }
        for (Msg msg : msgs) {
            if (msg == null) {
                continue;
            }
            List<ToolResultBlock> results = msg.getContentBlocks(ToolResultBlock.class);
            List<ToolUseBlock> uses = msg.getContentBlocks(ToolUseBlock.class);
            if (!results.isEmpty() && uses.isEmpty()) {
                // 工具结果消息：role=tool + tool_call_id（模型看到的就是这个配对形态）
                for (ToolResultBlock result : results) {
                    if (result == null) {
                        continue;
                    }
                    messages.add(new JSONObject()
                        .set("role", "tool")
                        .set("tool_call_id", result.getId())
                        .set("name", result.getName())
                        .set("content", toolOutputText(result.getOutput())));
                }
                continue;
            }
            StringBuilder text = new StringBuilder();
            JSONArray toolCalls = new JSONArray();
            for (ToolUseBlock use : uses) {
                JSONObject function = new JSONObject()
                    .set("name", use.getName());
                if (use.getInput() != null) {
                    // arguments 在真实协议里是 JSON 字符串——完整保留，这是复现的关键
                    function.set("arguments", new JSONObject(use.getInput()).toString());
                }
                toolCalls.add(new JSONObject()
                    .set("id", use.getId())
                    .set("type", "function")
                    .set("function", function));
            }
            for (Object block : msg.getContent()) {
                if (block instanceof TextBlock) {
                    text.append(((TextBlock) block).getText());
                }
                // ThinkingBlock 不进请求复现（OpenAI 兼容端点不接受独立 thinking 消息）
            }
            String role = msg.getRole() != null ? msg.getRole().name().toLowerCase() : "user";
            JSONObject message = new JSONObject()
                .set("role", role)
                .set("content", text.toString());
            if (!toolCalls.isEmpty()) {
                message.set("tool_calls", toolCalls);
            }
            messages.add(message);
        }
        return messages;
    }

    /**
     * 工具结果输出 → 文本：TextBlock 直取文本；其余块类型（DataBlock/ImageBlock/…）
     * 整块 JSON 序列化——账本是复现证据，宁可原样也不丢内容。
     */
    private static String toolOutputText(List<?> blocks) {
        if (blocks == null) {
            return "";
        }
        StringBuilder out = new StringBuilder();
        for (Object block : blocks) {
            if (block == null) {
                continue;
            }
            if (block instanceof TextBlock) {
                out.append(((TextBlock) block).getText());
            } else {
                try {
                    out.append(cn.hutool.json.JSONUtil.toJsonStr(block));
                } catch (Exception e) {
                    out.append(block);
                }
            }
        }
        return out.toString();
    }

    /** 头尾保留中间挖洞（OWB capText 同口径）—— 仅用于摘要（digest），request_json 不截断 */
    static String truncateHeadTail(String raw, int max) {
        if (raw == null) {
            return "";
        }
        if (raw.length() <= max) {
            return raw;
        }
        int head = (int) (max * 0.6);
        int tail = max - head;
        return raw.substring(0, head) + "\n…(已截断，原文共 " + raw.length() + " 字)…\n" + raw.substring(raw.length() - tail);
    }

    /**
     * 流式输出的全量组装器：把逐块到达的 ChatResponse 拼成一份完整的
     * OpenAI 同构响应 JSON（choices[0].message.content / tool_calls + usage + finish_reason）。
     *
     * <p>工具调用按 id 键控累积：块上带完整 input（Map）时直接采用；只带 content
     * （原始 JSON 字符串增量）时累积拼接 —— 两种流式形态都兼容。这是「模型输出全量
     * 落账」的唯一真相源，Trajectory / 执行追踪页据此展示完整输出。</p>
     */
    static final class ResponseAssembler {
        private final StringBuilder text = new StringBuilder();
        private final java.util.LinkedHashMap<String, JSONObject> toolCalls = new java.util.LinkedHashMap<>();
        private final java.util.LinkedHashMap<String, StringBuilder> toolArgDeltas = new java.util.LinkedHashMap<>();
        private String finishReason;
        private long inputTokens;
        private long outputTokens;
        private long cachedTokens;

        void record(ChatResponse response) {
            ChatUsage usage = response.getUsage();
            if (usage != null) {
                inputTokens = Math.max(inputTokens, usage.getInputTokens());
                outputTokens = Math.max(outputTokens, usage.getOutputTokens());
                cachedTokens = Math.max(cachedTokens, usage.getCachedTokens());
            }
            if (response.getFinishReason() != null) {
                finishReason = response.getFinishReason();
            }
            List<ContentBlock> blocks = response.getContent();
            if (blocks == null) {
                return;
            }
            for (ContentBlock block : blocks) {
                if (block instanceof TextBlock) {
                    text.append(((TextBlock) block).getText());
                } else if (block instanceof ToolUseBlock) {
                    ToolUseBlock use = (ToolUseBlock) block;
                    // OpenAI 流式 delta 的退化形态：后续碎块 id/name 可空（name 占位 __fragment__），
                    // 归并到最后一个调用（index 语义）；带新 id 的块才新开条目
                    String key;
                    if (use.getId() != null && !use.getId().isEmpty()) {
                        key = use.getId();
                    } else if (!toolCalls.isEmpty()) {
                        key = lastKey();
                    } else {
                        key = "idx-0";
                    }
                    JSONObject call = toolCalls.computeIfAbsent(key, k -> new JSONObject()
                        .set("id", use.getId() != null && !use.getId().isEmpty() ? use.getId() : k)
                        .set("type", "function")
                        .set("function", new JSONObject()));
                    JSONObject function = call.getJSONObject("function");
                    if (use.getName() != null && !use.getName().isEmpty()
                        && !"__fragment__".equals(use.getName())) {
                        function.set("name", use.getName());
                    }
                    if (use.getInput() != null && !use.getInput().isEmpty()) {
                        // 完整入参（非增量块）：直接作为 arguments
                        function.set("arguments", new JSONObject(use.getInput()).toString());
                    } else if (use.getContent() != null) {
                        // 增量形态：arguments 以字符串片段到达，累积拼接（OpenAI 流式 delta 语义）
                        StringBuilder acc = toolArgDeltas.computeIfAbsent(key, k -> new StringBuilder());
                        acc.append(use.getContent());
                        function.set("arguments", acc.toString());
                    }
                }
            }
        }

        /** 未闭合工具调用的 key：LinkedHashMap 保持插入序，取最后一个 */
        private String lastKey() {
            String key = null;
            for (String k : toolCalls.keySet()) {
                key = k;
            }
            return key;
        }

        JSONObject buildJson(String model) {
            JSONArray calls = new JSONArray();
            for (JSONObject call : toolCalls.values()) {
                calls.add(call);
            }
            JSONObject message = new JSONObject().set("role", "assistant");
            if (text.length() > 0) {
                message.set("content", text.toString());
            }
            if (!calls.isEmpty()) {
                message.set("tool_calls", calls);
            }
            JSONObject choice = new JSONObject()
                .set("index", 0)
                .set("finish_reason", finishReason != null ? finishReason : (calls.isEmpty() ? "stop" : "tool_calls"))
                .set("message", message);
            JSONObject usage = new JSONObject()
                .set("prompt_tokens", inputTokens)
                .set("completion_tokens", outputTokens)
                .set("total_tokens", inputTokens + outputTokens);
            if (cachedTokens > 0) {
                usage.set("cached_tokens", cachedTokens);
            }
            // hutool 陷阱：JSONArray.add() 返回 boolean，禁止内联进 set(...) 链
            JSONArray choices = new JSONArray();
            choices.add(choice);
            return new JSONObject()
                .set("model", model)
                .set("choices", choices)
                .set("usage", usage);
        }
    }

    /** 请求摘要：逐条 role:text（单条截断），整体头尾保留中间挖洞 */
    static String promptDigest(List<Msg> msgs) {
        if (msgs == null || msgs.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (Msg msg : msgs) {
            String text = msgText(msg);
            sb.append(msg.getRole() != null ? msg.getRole().name().toLowerCase() : "?")
                .append(": ").append(truncate(text, PER_MSG_MAX)).append('\n');
        }
        return truncate(sb.toString(), DIGEST_MAX);
    }

    private static void appendResponse(StringBuilder output, ChatResponse response) {
        ChatUsage usage = response.getUsage();
        if (usage != null) {
            output.append("[usage] in=").append(usage.getInputTokens())
                .append(" out=").append(usage.getOutputTokens())
                .append(" cached=").append(usage.getCachedTokens()).append('\n');
        }
        if (response.getFinishReason() != null) {
            output.append("[finish] ").append(response.getFinishReason()).append('\n');
        }
        List<ContentBlock> blocks = response.getContent();
        if (blocks == null) {
            return;
        }
        for (ContentBlock block : blocks) {
            if (block instanceof TextBlock) {
                output.append("[text] ").append(truncate(((TextBlock) block).getText(), PER_MSG_MAX)).append('\n');
            } else if (block instanceof ToolUseBlock) {
                ToolUseBlock use = (ToolUseBlock) block;
                output.append("[tool] ").append(use.getName())
                    .append('(').append(truncate(String.valueOf(use.getInput()), PER_MSG_MAX)).append(")\n");
            }
        }
    }

    private static String msgText(Msg msg) {
        if (msg == null || msg.getContent() == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (Object block : msg.getContent()) {
            if (block instanceof TextBlock) {
                sb.append(((TextBlock) block).getText());
            } else if (block instanceof ToolUseBlock) {
                sb.append("→调用 ").append(((ToolUseBlock) block).getName());
            }
        }
        return sb.toString();
    }

    /** 头尾保留中间挖洞：超长时保留头部 60% + 尾部 40% 配额 */
    static String truncate(String raw, int max) {
        if (raw == null) {
            return "";
        }
        if (raw.length() <= max) {
            return raw;
        }
        int head = (int) (max * 0.6);
        int tail = max - head;
        return raw.substring(0, head) + "\n…(已截断，原文共 " + raw.length() + " 字)…\n" + raw.substring(raw.length() - tail);
    }
}
