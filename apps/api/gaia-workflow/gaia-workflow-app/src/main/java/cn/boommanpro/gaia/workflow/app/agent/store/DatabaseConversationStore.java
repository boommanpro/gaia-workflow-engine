package cn.boommanpro.gaia.workflow.app.agent.store;

import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmToolCall;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMessage;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentMessageService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * 基于 agent_message 表的会话存取实现。
 */
@Slf4j
@Component
public class DatabaseConversationStore implements ConversationStore {

    private final AgentMessageService messageService;
    private final AgentProperties properties;

    public DatabaseConversationStore(AgentMessageService messageService, AgentProperties properties) {
        this.messageService = messageService;
        this.properties = properties;
    }

    @Override
    public List<LlmMessage> loadHistory(String sessionKey, int maxMessages) {
        List<LlmMessage> result = new ArrayList<>();
        if (sessionKey == null || sessionKey.isEmpty()) {
            return result;
        }
        int limit = maxMessages > 0 ? maxMessages : properties.getHistory().getMaxMessages();

        // compacted=1 的消息已被前情摘要取代，不再进入模型上下文
        //（surface replace：摘要消息本身会按普通 user 消息出现在序列里）
        List<AgentMessage> all = messageService.list(
            new QueryWrapper<AgentMessage>()
                .eq("session_key", sessionKey)
                .and(w -> w.isNull("compacted").or().eq("compacted", 0))
                .orderByAsc("created_at", "id"));

        // 只保留最近 N 条；整体截取比 SQL limit 更可靠地保留尾部语境
        List<AgentMessage> window = all.size() > limit
            ? all.subList(all.size() - limit, all.size())
            : all;

        for (AgentMessage entity : window) {
            LlmMessage message = toLlmMessage(entity);
            message.setRefId(entity.getId());
            result.add(message);
        }
        return result;
    }

    @Override
    public void markCompacted(String sessionKey, List<Long> messageIds) {
        if (messageIds == null || messageIds.isEmpty() || sessionKey == null || sessionKey.isEmpty()) {
            return;
        }
        try {
            messageService.update(new com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<AgentMessage>()
                .eq("session_key", sessionKey)
                .in("id", messageIds)
                .set("compacted", 1));
        } catch (Exception e) {
            log.warn("[conversation-store] markCompacted failed session={}: {}", sessionKey, e.getMessage());
        }
    }

    @Override
    public Long saveSummary(String sessionKey, String content) {
        if (sessionKey == null || sessionKey.isEmpty()) {
            return null;
        }
        AgentMessage message = new AgentMessage();
        message.setSessionKey(sessionKey);
        message.setRole("user");
        message.setContent(content);
        message.setCreatedAt(LocalDateTime.now());
        messageService.save(message);
        return message.getId();
    }

    private LlmMessage toLlmMessage(AgentMessage entity) {
        LlmMessage message = new LlmMessage();
        message.setRole(entity.getRole());
        message.setContent(entity.getContent());
        message.setToolCallId(entity.getToolCallId());

        if (entity.getToolCalls() != null && !entity.getToolCalls().isEmpty()
            && JSONUtil.isJsonArray(entity.getToolCalls())) {
            List<LlmToolCall> calls = new ArrayList<>();
            JSONArray array = JSONUtil.parseArray(entity.getToolCalls());
            for (int i = 0; i < array.size(); i++) {
                JSONObject raw = array.getJSONObject(i);
                JSONObject function = raw.getJSONObject("function");
                calls.add(LlmToolCall.builder()
                    .id(raw.getStr("id"))
                    .name(function != null ? function.getStr("name") : null)
                    .arguments(function != null ? function.getStr("arguments") : "{}")
                    .build());
            }
            message.setToolCalls(calls);
        }

        if (entity.getImages() != null && !entity.getImages().isEmpty()
            && JSONUtil.isJsonArray(entity.getImages())) {
            JSONArray images = JSONUtil.parseArray(entity.getImages());
            List<String> imageList = new ArrayList<>();
            for (int i = 0; i < images.size(); i++) {
                imageList.add(images.getStr(i));
            }
            message.setImages(imageList);
        }
        return message;
    }

    @Override
    public void saveMessage(String sessionKey, String role, String content,
                            String toolCallsJson, String toolCallId) {
        saveMessage(sessionKey, role, content, toolCallsJson, toolCallId,
            (java.util.List<String>) null, null);
    }

    @Override
    public void saveMessage(String sessionKey, String role, String content,
                            String toolCallsJson, String toolCallId,
                            java.util.List<String> images) {
        saveMessage(sessionKey, role, content, toolCallsJson, toolCallId, images, null);
    }

    @Override
    public void saveMessage(String sessionKey, String role, String content,
                            String toolCallsJson, String toolCallId,
                            String thinking) {
        saveMessage(sessionKey, role, content, toolCallsJson, toolCallId, null, thinking);
    }

    private void saveMessage(String sessionKey, String role, String content,
                             String toolCallsJson, String toolCallId,
                             java.util.List<String> images, String thinking) {
        if (sessionKey == null || sessionKey.isEmpty()) {
            return;
        }
        AgentMessage message = new AgentMessage();
        message.setSessionKey(sessionKey);
        message.setRole(role);
        message.setContent(content);
        message.setToolCalls(toolCallsJson);
        message.setToolCallId(toolCallId);
        message.setImages(images != null && !images.isEmpty() ? JSONUtil.toJsonStr(images) : null);
        message.setThinking(thinking != null && !thinking.isEmpty() ? thinking : null);
        message.setCreatedAt(LocalDateTime.now());
        messageService.save(message);
    }

    @Override
    public String newSessionKey() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}
