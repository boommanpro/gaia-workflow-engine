package cn.boommanpro.gaia.workflow.app.agent.event;

import cn.boommanpro.gaia.workflow.app.agent.session.AgentSessionRunService;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionEventBus;

/**
 * 把一次后端自治运行的事件路由进 {@link SessionEventBus} 的输出端。
 *
 * <p>与旧的 {@link SseAgentEventSink} 不同：它不直接绑某个 SSE 连接，
 * 而是把事件交给会话事件总线 —— 总线负责缓冲 + 多窗口广播 + 新订阅者回放。
 * 因此「没有任何窗口在场」时运行依然完整推进，事件只是暂存在缓冲里。</p>
 *
 * <p>同时尊重运行句柄的取消标记：用户点了停止后，后续事件不再进总线，
 * 让已停止的运行不会继续污染会话视图。</p>
 */
public class BusAgentEventSink implements AgentEventSink {

    private final String sessionKey;
    private final SessionEventBus eventBus;
    private final AgentSessionRunService.RunHandle handle;

    public BusAgentEventSink(String sessionKey, SessionEventBus eventBus,
                             AgentSessionRunService.RunHandle handle) {
        this.sessionKey = sessionKey;
        this.eventBus = eventBus;
        this.handle = handle;
    }

    @Override
    public void emit(AgentEvent event) {
        if (event == null || !isActive()) {
            return;
        }
        eventBus.publish(sessionKey, event.getType(),
            event.getData() != null ? event.getData() : new cn.hutool.json.JSONObject());
    }

    @Override
    public boolean isActive() {
        return handle == null || !handle.isCancelled();
    }
}
