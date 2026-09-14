package cn.boommanpro.gaia.workflow.app.agent.event;

import lombok.extern.slf4j.Slf4j;

/**
 * 无头输出端：没有浏览器在场时使用的事件接收者。
 *
 * <p>token 事件被丢弃（没人看），工具调用与结果、轮次、异常进日志，
 * 供定时任务、工作流触发、批量任务等场景使用。</p>
 */
@Slf4j
public class HeadlessAgentEventSink implements AgentEventSink {

    private final String sessionKey;

    public HeadlessAgentEventSink(String sessionKey) {
        this.sessionKey = sessionKey == null ? "-" : sessionKey;
    }

    @Override
    public void emit(AgentEvent event) {
        if (event == null) {
            return;
        }
        switch (event.getType()) {
            case "token":
                // 无浏览器时逐 token 输出毫无意义，直接丢弃
                break;
            case "tool_call":
                log.info("[agent:{}] tool_call {}", sessionKey, event.getData());
                break;
            case "tool_result":
                log.info("[agent:{}] tool_result {}", sessionKey, abbreviate(event.getData()));
                break;
            case "turn":
                log.debug("[agent:{}] {}", sessionKey, event.getData());
                break;
            case "error":
                log.error("[agent:{}] error {}", sessionKey, event.getData());
                break;
            default:
                log.debug("[agent:{}] {} {}", sessionKey, event.getType(), event.getData());
                break;
        }
    }

    private Object abbreviate(cn.hutool.json.JSONObject data) {
        String raw = data == null ? "" : data.toString();
        return raw.length() > 500 ? raw.substring(0, 500) + "...(truncated)" : raw;
    }
}
