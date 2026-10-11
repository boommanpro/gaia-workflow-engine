package cn.boommanpro.gaia.workflow.app.agent.engine;

import io.agentscope.core.message.ContentBlock;
import io.agentscope.core.message.Msg;
import io.agentscope.core.message.TextBlock;
import io.agentscope.core.message.ToolUseBlock;
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

        StringBuilder output = new StringBuilder();
        return delegate.stream(msgs, tools, options)
            .doOnNext(response -> {
                try {
                    appendResponse(output, response);
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
