package cn.boommanpro.gaia.workflow.app.agent.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 把事件推给浏览器的输出端。
 *
 * 单个事件发送失败（连接断开、超时）会被吞掉，只把 sink 标记为失效，
 * 避免把 SSE 异常冒泡到推理循环里中断后端自治过程。
 */
@Slf4j
public class SseAgentEventSink implements AgentEventSink {

    private final SseEmitter emitter;
    private volatile boolean active = true;

    public SseAgentEventSink(SseEmitter emitter) {
        this.emitter = emitter;
    }

    @Override
    public void emit(AgentEvent event) {
        if (!active || event == null) {
            return;
        }
        try {
            emitter.send(SseEmitter.event()
                .name(event.getType())
                .data(event.getData() != null ? event.getData().toString() : "{}"));
        } catch (Exception e) {
            active = false;
            log.warn("[agent-sink] SSE send failed for event '{}': {}", event.getType(), e.getMessage());
        }
    }

    @Override
    public boolean isActive() {
        return active;
    }

    /** 正常结束流 */
    public void complete() {
        try {
            emitter.send(SseEmitter.event().name("done").data("{}"));
            emitter.complete();
        } catch (Exception e) {
            log.warn("[agent-sink] SSE complete failed: {}", e.getMessage());
            emitter.completeWithError(e);
        }
        active = false;
    }

    /** 异常结束流 */
    public void error(String message) {
        try {
            emitter.send(SseEmitter.event().name("error")
                .data(new cn.hutool.json.JSONObject().set("message", message).toString()));
            emitter.complete();
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
        active = false;
    }
}
