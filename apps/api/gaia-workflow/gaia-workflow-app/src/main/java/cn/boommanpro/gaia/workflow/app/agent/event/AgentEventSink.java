package cn.boommanpro.gaia.workflow.app.agent.event;

/**
 * Agent 事件输出端（观察者 / 策略模式）。
 *
 * <p>这是「前端对话关闭，后端还能自动运行」的直接支点：</p>
 * <ul>
 *   <li>{@link SseAgentEventSink} —— 推给浏览器，对话面板在监听</li>
 *   <li>{@link HeadlessAgentEventSink} —— 只记录日志/持久化，没有浏览器也照跑</li>
 *   <li>{@link CompositeAgentEventSink} —— 同时输出到多处</li>
 * </ul>
 *
 * <p>运行时只依赖本接口，因此永远不会因为「没人听」而卡住或报错。</p>
 */
public interface AgentEventSink {

    /** 输出一个事件；实现必须吞掉所有异常，不能因为输出失败中断推理循环 */
    void emit(AgentEvent event);

    /** 该输出端是否仍然有效（例如 SSE 连接已断开时返回 false） */
    default boolean isActive() {
        return true;
    }

    /** 无操作实现，用于完全静默的场景 */
    static AgentEventSink noop() {
        return event -> {
            // intentionally empty
        };
    }
}
