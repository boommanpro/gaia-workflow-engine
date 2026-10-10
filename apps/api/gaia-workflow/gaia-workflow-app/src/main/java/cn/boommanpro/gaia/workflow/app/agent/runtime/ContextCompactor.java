package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmChatRequest;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmChatResponse;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmProvider;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * 上下文压缩器（对齐 dsh compaction 的两段式：确定性剪枝 → 模型摘要）。
 *
 * <p>在每次模型请求前按 token 压力触发：</p>
 * <ol>
 *   <li><b>确定性剪枝</b>：老的大体积工具结果（read_workflow 的全量 DSL 等）
 *       原地替换为紧凑摘要——草稿/事件日志才是真相，模型只需要知道「读过了什么」。</li>
 *   <li><b>模型摘要</b>（用户指定的主路径）：剪枝后仍超压时，把对话前缀交给模型
 *       生成前情摘要，替换该前缀（surface replace）。切点保证 tool_call/result
 *       配对完整：任何 tool 消息要么随其调用方一起被摘要，要么一起保留。</li>
 * </ol>
 *
 * <p>持久化侧：被摘要覆盖的消息在 {@code agent_message.compacted} 打标
 * （不再进入后续 run 的上下文），摘要本身作为带标记的 user 消息入库。
 * 前端展示不受影响——看到的一直是全量历史。</p>
 */
@Slf4j
@Component
public class ContextCompactor {

    public static final String SUMMARY_MARKER = "【前情摘要】";

    /** 单条消息进入摘要转录时的字符上限 */
    private static final int TRANSCRIPT_MESSAGE_CAP = 4000;
    /** 摘要请求的转录总字符上限 */
    private static final int TRANSCRIPT_TOTAL_CAP = 60000;

    private static final String SUMMARIZER_PROMPT =
        "你是一个对话压缩器。请把下面的 AI 助手与用户的对话历史压缩成一份前情摘要，"
            + "供 AI 助手继续当前任务时作为上下文。摘要必须保留：\n"
            + "1. 用户的原始需求与所有后续补充、修正、否决\n"
            + "2. 涉及的工作流编码（workflowCode）、revision 基准、版本号\n"
            + "3. 已创建/修改/删除的节点清单（id、type、用途）与连线结构要点\n"
            + "4. 已落版/已运行的操作及其结论（成功、失败原因、警告）\n"
            + "5. 未完成事项、待用户确认事项与下一步计划\n"
            + "用紧凑的条目式中文书写，直接输出摘要正文，不要任何前言或解释。";

    private final AgentProperties properties;
    private final ConversationStore conversationStore;

    public ContextCompactor(AgentProperties properties, ConversationStore conversationStore) {
        this.properties = properties;
        this.conversationStore = conversationStore;
    }

    /** 一次压缩尝试的结果（供事件归因） */
    public static class Result {
        public boolean compacted;
        public int prunedToolResults;
        public int summarizedMessages;
        public long tokensBefore;
        public long tokensAfter;

        public JSONObject toJson() {
            return new JSONObject()
                .set("compacted", compacted)
                .set("prunedToolResults", prunedToolResults)
                .set("summarizedMessages", summarizedMessages)
                .set("tokensBefore", tokensBefore)
                .set("tokensAfter", tokensAfter);
        }
    }

    /**
     * 按 token 压力压缩（原地修改 conversation）。
     *
     * @param usageAnchor 服务端最近一次返回的 prompt_tokens（无则 null）
     */
    public Result compactIfNeeded(String sessionKey, String systemPrompt, List<LlmMessage> conversation,
                                  LlmProvider llm, Double temperature, Long usageAnchor) {
        Result result = new Result();
        AgentProperties.Compaction config = properties.getCompaction();
        if (!config.isEnabled() || conversation == null || conversation.isEmpty()) {
            return result;
        }
        long target = Math.round(properties.getLlm().getContextWindow() * config.getTriggerRatio());
        result.tokensBefore = estimateTotal(systemPrompt, conversation, usageAnchor);
        if (result.tokensBefore <= target) {
            return result;
        }

        // 第一段：确定性剪枝（老的大工具结果 → 紧凑摘要）
        result.prunedToolResults = pruneOldToolResults(conversation, config);
        result.tokensAfter = estimateTotal(systemPrompt, conversation, null);
        if (result.tokensAfter <= target) {
            result.compacted = result.prunedToolResults > 0;
            return result;
        }

        // 第二段：模型摘要替换前缀
        if (conversation.size() >= config.getMinMessagesToSummarize()) {
            int boundary = chooseBoundary(conversation, conversation.size() - config.getKeepRecentMessages());
            if (boundary >= 1) {
                List<LlmMessage> prefix = new ArrayList<>(conversation.subList(0, boundary));
                String summary = summarize(llm, temperature, prefix, config);
                if (summary != null && !summary.trim().isEmpty()) {
                    applySurfaceReplace(sessionKey, conversation, boundary, summary);
                    result.summarizedMessages = boundary;
                    result.compacted = true;
                    result.tokensAfter = estimateTotal(systemPrompt, conversation, null);
                    log.info("[compaction] session={} summarized {} messages, {} -> {} tokens (pruned {} tool results)",
                        sessionKey, boundary, result.tokensBefore, result.tokensAfter, result.prunedToolResults);
                } else {
                    log.warn("[compaction] session={} summarize failed, keeping pruned view only", sessionKey);
                }
            }
        }
        return result;
    }

    /** 当前（系统提示词 + 对话）的 token 估算，取 usage 锚点与估算的较大者 */
    public long estimateTotal(String systemPrompt, List<LlmMessage> conversation, Long usageAnchor) {
        long estimate = TokenMeter.estimateText(systemPrompt) + TokenMeter.estimate(conversation) + 64;
        if (usageAnchor != null && usageAnchor > estimate) {
            return usageAnchor;
        }
        return estimate;
    }

    /** 是否已超过硬上限（压缩后仍然放不进上下文窗口） */
    public boolean exceedsHardLimit(String systemPrompt, List<LlmMessage> conversation) {
        return estimateTotal(systemPrompt, conversation, null)
            > (long) Math.round(properties.getLlm().getContextWindow() * 0.95);
    }

    // ---------------- 第一段：确定性剪枝 ----------------

    private int pruneOldToolResults(List<LlmMessage> conversation, AgentProperties.Compaction config) {
        // 最近 K 条工具结果保持完整（当前操作的细节模型还需要）
        List<Integer> toolIndices = new ArrayList<>();
        for (int i = 0; i < conversation.size(); i++) {
            if ("tool".equals(conversation.get(i).getRole())) {
                toolIndices.add(i);
            }
        }
        int keep = config.getKeepRecentToolResults();
        int pruned = 0;
        for (int t = 0; t < toolIndices.size() - keep; t++) {
            LlmMessage message = conversation.get(toolIndices.get(t));
            if (message.getContent() == null
                || message.getContent().length() <= config.getPruneToolResultChars()) {
                continue;
            }
            message.setContent(pruneToolPayload(message.getContent()));
            pruned++;
        }
        return pruned;
    }

    /** 工具结果负载 → 紧凑替身；read_workflow 识别后给专属形态 */
    static String pruneToolPayload(String payload) {
        try {
            JSONObject obj = JSONUtil.parseObj(payload);
            if (obj.containsKey("dsl") && obj.containsKey("workflowCode")) {
                JSONObject dsl = obj.getJSONObject("dsl");
                int nodeCount = dsl != null && dsl.getJSONArray("nodes") != null
                    ? dsl.getJSONArray("nodes").size() : 0;
                return new JSONObject()
                    .set("pruned", "read_workflow")
                    .set("workflowCode", obj.getStr("workflowCode"))
                    .set("revision", obj.get("revision"))
                    .set("nodeCount", nodeCount)
                    .set("note", "完整 DSL 已剪枝以节省上下文；节点结构可重新 read_workflow 或用 read_node 查看单节点；当前草稿才是编辑基准")
                    .toString();
            }
            return new JSONObject()
                .set("pruned", true)
                .set("originalChars", payload.length())
                .set("head", head(payload, 300))
                .set("note", "完整结果见会话历史与事件日志；需要最新状态请重新调用工具")
                .toString();
        } catch (Exception e) {
            return new JSONObject()
                .set("pruned", true)
                .set("originalChars", payload.length())
                .set("head", head(payload, 300))
                .toString();
        }
    }

    // ---------------- 第二段：模型摘要 ----------------

    /**
     * 选择摘要/保留切点：从期望位置向前调整，保证切点处不是 tool 消息
     * （tool 消息与其调用方 assistant 必须落在同侧，配对不被拆散）。
     */
    static int chooseBoundary(List<LlmMessage> conversation, int desired) {
        int boundary = Math.min(desired, conversation.size() - 1);
        while (boundary > 1 && "tool".equals(conversation.get(boundary).getRole())) {
            boundary--;
        }
        return boundary > 1 ? boundary : 0;
    }

    private String summarize(LlmProvider llm, Double temperature,
                             List<LlmMessage> prefix, AgentProperties.Compaction config) {
        try {
            LlmChatRequest request = LlmChatRequest.builder()
                .messages(List.of(LlmMessage.system(SUMMARIZER_PROMPT),
                    LlmMessage.user(renderTranscript(prefix))))
                .stream(false)
                .maxTokens(config.getSummaryMaxTokens())
                .temperature(temperature)
                .build();
            LlmChatResponse response = llm.chat(request);
            if (response.isError() || response.getContent() == null || response.getContent().trim().isEmpty()) {
                return null;
            }
            return response.getContent().trim();
        } catch (Exception e) {
            log.warn("[compaction] summarize call failed: {}", e.getMessage());
            return null;
        }
    }

    private static String renderTranscript(List<LlmMessage> prefix) {
        StringBuilder sb = new StringBuilder("=== 对话历史（待压缩）===\n");
        int remaining = TRANSCRIPT_TOTAL_CAP;
        for (LlmMessage message : prefix) {
            if (remaining <= 0) {
                break;
            }
            String content = message.getContent() != null ? message.getContent() : "";
            if (content.length() > TRANSCRIPT_MESSAGE_CAP) {
                content = head(content, TRANSCRIPT_MESSAGE_CAP) + "…(截断)";
            }
            if (content.length() > remaining) {
                content = head(content, remaining) + "…(截断)";
            }
            remaining -= content.length();
            String label = "tool".equals(message.getRole()) ? "tool-result" : message.getRole();
            sb.append("[").append(label).append("] ").append(content).append('\n');
        }
        return sb.toString();
    }

    /** surface replace 落地：打标旧消息 + 插入摘要 + 原地替换列表前缀 */
    private void applySurfaceReplace(String sessionKey, List<LlmMessage> conversation,
                                     int boundary, String summary) {
        List<Long> ids = new ArrayList<>();
        for (int i = 0; i < boundary; i++) {
            Long refId = conversation.get(i).getRefId();
            if (refId != null) {
                ids.add(refId);
            }
        }
        if (!ids.isEmpty()) {
            conversationStore.markCompacted(sessionKey, ids);
        }
        String content = SUMMARY_MARKER + "（自动生成，覆盖此前 " + boundary + " 条消息）\n" + summary;
        Long summaryId = conversationStore.saveSummary(sessionKey, content);
        LlmMessage summaryMessage = LlmMessage.user(content);
        summaryMessage.setRefId(summaryId);
        conversation.subList(0, boundary).clear();
        conversation.add(0, summaryMessage);
    }

    private static String head(String text, int max) {
        if (text == null || text.length() <= max) {
            return text;
        }
        return text.substring(0, max);
    }
}
