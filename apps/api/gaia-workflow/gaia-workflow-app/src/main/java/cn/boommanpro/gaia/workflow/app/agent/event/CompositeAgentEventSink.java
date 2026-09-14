package cn.boommanpro.gaia.workflow.app.agent.event;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * 组合输出端：把同一批事件同时投递给多个接收者（Composite 模式）。
 *
 * 典型用法：一次自治运行既要推进 SSE 给正在看的用户，也要留一份日志。
 */
public class CompositeAgentEventSink implements AgentEventSink {

    private final List<AgentEventSink> sinks = new ArrayList<>();

    public CompositeAgentEventSink(AgentEventSink... sinks) {
        this.sinks.addAll(Arrays.asList(sinks));
    }

    public void add(AgentEventSink sink) {
        if (sink != null) {
            sinks.add(sink);
        }
    }

    @Override
    public void emit(AgentEvent event) {
        for (AgentEventSink sink : sinks) {
            try {
                sink.emit(event);
            } catch (Exception ignored) {
                // 单个 sink 故障不影响其他 sink
            }
        }
    }

    @Override
    public boolean isActive() {
        for (AgentEventSink sink : sinks) {
            if (sink.isActive()) {
                return true;
            }
        }
        return false;
    }
}
