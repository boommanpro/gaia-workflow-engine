package cn.boommanpro.gaia.workflow.app.agent.event;

import cn.hutool.json.JSONObject;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Agent 运行过程中发出的事件。
 *
 * <p>事件与传输方式解耦：同一套事件可以推给浏览器 SSE，也可以只落日志，
 * 这样「没有前端在场」时后端也能完整跑完一次 Agent 循环。</p>
 */
@Data
@AllArgsConstructor
public class AgentEvent {

    /** 事件类型：token / tool_call / tool_result / turn / done / error */
    private String type;

    /** 事件负载 */
    private JSONObject data;

    public static AgentEvent of(String type, JSONObject data) {
        return new AgentEvent(type, data);
    }

    public static AgentEvent of(String type) {
        return new AgentEvent(type, new JSONObject());
    }
}
