package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode;
import cn.boommanpro.gaia.workflow.app.agent.engine.AgentExecutionRouter;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.boommanpro.gaia.workflow.app.agent.event.HeadlessAgentEventSink;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 受管 Agent 的门面Service。
 *
 * <p>对外提供「不需要浏览器参与」的运行入口：
 * 定时任务、外部触发、批量处理都可以直接调这里。</p>
 */
@Slf4j
@Service
public class ManagedAgentService {

    private final AgentExecutionRouter executionRouter;
    private final AgentRegistry agentRegistry;
    private final ConversationStore conversationStore;

    private final ExecutorService executor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "managed-agent");
        t.setDaemon(true);
        return t;
    });

    public ManagedAgentService(AgentExecutionRouter executionRouter,
                              AgentRegistry agentRegistry,
                              ConversationStore conversationStore) {
        this.executionRouter = executionRouter;
        this.agentRegistry = agentRegistry;
        this.conversationStore = conversationStore;
    }

    /**
     * 同步执行（自治模式）。会阻塞直到 Agent 跑完或达到轮次上限。
     */
    public AgentRunResult runHeadless(String agentId, String message, Map<String, Object> variables) {
        AgentRequest request = new AgentRequest(
            conversationStore.newSessionKey(), message, "zh-CN", null,
            agentId, ToolExecutionMode.BACKEND, 0, variables, null);
        conversationStore.saveMessage(request.getSessionKey(), "user", message, null, null);

        AgentEventSink sink = new HeadlessAgentEventSink(request.getSessionKey());
        return executionRouter.run(request, sink);
    }

    /** 异步执行，适合触发器/定时任务场景 */
    public CompletableFuture<AgentRunResult> runHeadlessAsync(String agentId, String message) {
        return CompletableFuture.supplyAsync(() -> runHeadless(agentId, message, null), executor);
    }

    /** 在既有会话上继续执行（会带上历史消息） */
    public AgentRunResult continueSession(String agentId, String sessionKey, String message) {
        AgentRequest request = new AgentRequest(
            sessionKey, message, "zh-CN", null, agentId, ToolExecutionMode.BACKEND, 0, null, null);
        conversationStore.saveMessage(sessionKey, "user", message, null, null);
        return executionRouter.run(request, new HeadlessAgentEventSink(sessionKey));
    }

    public Map<String, AgentDefinition> listAgents() {
        return agentRegistry.snapshotDefinitions();
    }

    /** 读取某个会话的消息，供外部（如工作流节点）消费 Agent 产出 */
    public List<LlmMessage> getConversation(String sessionKey) {
        return conversationStore.loadHistory(sessionKey, 0);
    }
}
