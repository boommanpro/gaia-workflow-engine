package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmToolCall;

/**
 * 上下文 token 计量（对齐 dsh token-meter 的「usage 锚点 + 启发式」双轨）。
 *
 * <p>优先使用服务端返回的真实 usage（prompt_tokens）；不可得时按字符启发式估算：
 * CJK 字符约 0.7 token/字（Qwen 系分词器实测区间 0.6~0.9），拉丁字符约 4 字符/token。
 * 估算只用于压力判断与压缩触发，不用于计费。</p>
 */
public final class TokenMeter {

    private TokenMeter() {
    }

    /** 单条消息的估算 token 数 */
    public static long estimate(LlmMessage message) {
        if (message == null) {
            return 0;
        }
        long tokens = estimateText(message.getContent());
        if (message.getToolCalls() != null) {
            for (LlmToolCall call : message.getToolCalls()) {
                if (call == null) {
                    continue;
                }
                tokens += 8; // id/type 包裹开销
                tokens += estimateText(call.getName());
                tokens += estimateText(call.getArguments());
            }
        }
        return tokens;
    }

    /** 整个消息列表的估算 token 数 */
    public static long estimate(Iterable<LlmMessage> messages) {
        long total = 0;
        if (messages != null) {
            for (LlmMessage message : messages) {
                total += estimate(message);
            }
        }
        return total;
    }

    /** 文本 token 估算：CJK 与拉丁混合的启发式 */
    public static long estimateText(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        int cjk = 0;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c >= 0x2E80 && c <= 0x9FFF || c >= 0xF900 && c <= 0xFAFF
                || c >= 0xFF00 && c <= 0xFFEF) {
                cjk++;
            }
        }
        int other = text.length() - cjk;
        return Math.round(cjk * 0.7 + other / 3.5);
    }
}
