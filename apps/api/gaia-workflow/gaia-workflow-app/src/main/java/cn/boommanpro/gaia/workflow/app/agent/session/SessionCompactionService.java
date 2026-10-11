package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.LlmCompletionService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMessage;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentMessageService;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 会话历史压缩 —— 旧 /agent/compact 链路的承接（surface replace 语义）。
 *
 * <p>把前半段历史摘要成一条 user 消息（「前情摘要」），被压缩的消息标记
 * {@code compacted=1}：不再进入模型上下文，但保留在 agent_message 表里供审查回放。
 * 摘要消息以普通 user 消息出现在序列尾部，模型天然把它当作最新上下文。</p>
 *
 * <p>切分点只在 user 消息边界上取：保证 assistant(tool_calls) → tool 结果的
 * 交错配对不被切断（历史回放的合法性由该配对保证）。</p>
 */
@Slf4j
@Service
public class SessionCompactionService {

    private static final int MIN_MESSAGES = 6;
    private static final int TOKEN_THRESHOLD_PERCENT = 50;

    private final AgentMessageService messageService;
    private final ConversationStore conversationStore;
    private final LlmCompletionService completionService;
    private final AgentModelConfigService modelConfigService;

    public SessionCompactionService(AgentMessageService messageService,
                                    ConversationStore conversationStore,
                                    LlmCompletionService completionService,
                                    AgentModelConfigService modelConfigService) {
        this.messageService = messageService;
        this.conversationStore = conversationStore;
        this.completionService = completionService;
        this.modelConfigService = modelConfigService;
    }

    public JSONObject compact(String sessionKey) {
        int contextWindow = modelConfigService.getLlmConfig().getContextWindow();
        if (contextWindow <= 0) {
            contextWindow = 32768;
        }

        List<AgentMessage> msgs = messageService.list(
            new QueryWrapper<AgentMessage>()
                .eq("session_key", sessionKey)
                .and(w -> w.isNull("compacted").or().eq("compacted", 0))
                .orderByAsc("id"));

        int estimatedTokens = estimateTokens(msgs);
        int percentage = (int) ((estimatedTokens * 100L) / contextWindow);
        if (msgs.size() < MIN_MESSAGES || percentage < TOKEN_THRESHOLD_PERCENT) {
            return new JSONObject()
                .set("compacted", false)
                .set("message", "No compaction needed")
                .set("tokenPercentage", percentage)
                .set("estimatedTokens", estimatedTokens)
                .set("limit", contextWindow);
        }

        // 切分点：中点之后的第一条 user 消息（user 边界不会切断 tool_use/tool_result 配对）
        int split = -1;
        for (int i = msgs.size() / 2; i < msgs.size(); i++) {
            if ("user".equals(msgs.get(i).getRole())) {
                split = i;
                break;
            }
        }
        if (split <= 0) {
            return new JSONObject()
                .set("compacted", false)
                .set("message", "No safe split point")
                .set("tokenPercentage", percentage)
                .set("estimatedTokens", estimatedTokens)
                .set("limit", contextWindow);
        }

        List<AgentMessage> toSummarize = new ArrayList<>(msgs.subList(0, split));
        StringBuilder summaryText = new StringBuilder();
        for (AgentMessage m : toSummarize) {
            summaryText.append(m.getRole()).append(": ")
                .append(m.getContent() != null ? m.getContent() : "").append('\n');
        }

        String summary;
        try {
            summary = completionService.complete(
                "请将以下对话历史压缩为简洁的摘要，保留关键信息、已完成的操作与未决事项。",
                summaryText.toString(), 0.3, 500);
        } catch (Exception e) {
            log.warn("[compaction] session={} summarize failed: {}", sessionKey, e.getMessage());
            return new JSONObject()
                .set("compacted", false)
                .set("message", "Summarize failed: " + e.getMessage())
                .set("tokenPercentage", percentage)
                .set("estimatedTokens", estimatedTokens)
                .set("limit", contextWindow);
        }

        List<Long> ids = new ArrayList<>();
        for (AgentMessage m : toSummarize) {
            ids.add(m.getId());
        }
        conversationStore.markCompacted(sessionKey, ids);
        conversationStore.saveSummary(sessionKey, "[前情摘要] 以下是本会话此前对话的摘要：\n" + summary);

        log.info("[compaction] session={} compacted {} messages (kept {}), tokens {}% -> summarized",
            sessionKey, toSummarize.size(), msgs.size() - split, percentage);
        return new JSONObject()
            .set("compacted", true)
            .set("removed", toSummarize.size())
            .set("kept", msgs.size() - split)
            .set("tokenPercentageBefore", percentage)
            .set("estimatedTokensBefore", estimatedTokens)
            .set("limit", contextWindow);
    }

    /** 中文约 1.5 token/字、英文约 4 字符/token、JSON 结构开销 ~10%（沿用旧链路启发式） */
    private static int estimateTokens(List<AgentMessage> msgs) {
        int chinese = 0;
        int other = 0;
        for (AgentMessage m : msgs) {
            String text = m.getContent() != null ? m.getContent() : "";
            if (m.getToolCalls() != null) {
                text += m.getToolCalls();
            }
            for (char c : text.toCharArray()) {
                if (Character.UnicodeScript.of(c) == Character.UnicodeScript.HAN) {
                    chinese++;
                } else if (!Character.isWhitespace(c)) {
                    other++;
                }
            }
        }
        return (int) Math.ceil((chinese * 1.5 + other * 0.25) * 1.1);
    }
}
