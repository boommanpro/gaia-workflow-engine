package cn.boommanpro.gaia.workflow.app.agent.core;

import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;
import java.util.function.BooleanSupplier;

/**
 * Agent 运行时上下文 —— 在一次运行生命周期内贯穿所有策略组件。
 *
 * 它替代了原先散落在方法签名里的那一长串参数
 * （sessionKey / locale / pageContext / history / tools ...），
 * 让 ContextProvider、ToolExecutor 的策略接口保持稳定。
 */
@Slf4j
@Data
public class AgentRunContext {

    private final AgentRequest request;
    private final AgentDefinition definition;
    private final ToolExecutionMode executionMode;

    /** 当前轮次，从 1 开始 */
    private int turn = 0;

    /** 本次运行累计消耗的字符数，粗粒度成本核算 */
    private long emittedChars = 0;

    /** 运行过程中的共享数据，供各策略之间传递中间结果（并行工具任务会并发读写） */
    private final Map<String, Object> attributes = new java.util.concurrent.ConcurrentHashMap<>();

    /** 事件输出端（运行时注入）。工具可用 {@link #emit} 广播自定义事件（如 document / plan / ui_action） */
    private AgentEventSink sink;

    public AgentRunContext(AgentRequest request, AgentDefinition definition, ToolExecutionMode executionMode) {
        this.request = request;
        this.definition = definition;
        this.executionMode = executionMode;
    }

    /** 广播一条自定义事件（工具内部使用，如画布变更 document / 计划 plan） */
    public void emit(String type, cn.hutool.json.JSONObject data) {
        if (sink != null) {
            sink.emit(AgentEvent.of(type, data));
        }
    }

    public String getSessionKey() {
        return request.getSessionKey();
    }

    public String getLocale() {
        return request.getLocale() != null ? request.getLocale() : "zh-CN";
    }

    public String getPageContext() {
        return request.getPageContext();
    }

    public String getUserMessage() {
        return request.getMessage();
    }

    public int getMaxTurns() {
        return request.getMaxTurns() > 0 ? request.getMaxTurns() : definition.getMaxTurns();
    }

    /**
     * 是否被请求中断（协作式取消）。
     * 运行编排侧把 {@code BooleanSupplier} 放进 request.variables["interrupt"]，
     * 主循环在每个检查点（轮边界 / 工具前后 / 重试等待）轮询。
     */
    public boolean isInterrupted() {
        if (request == null || request.getVariables() == null) {
            return false;
        }
        Object supplier = request.getVariables().get("interrupt");
        return supplier instanceof BooleanSupplier && ((BooleanSupplier) supplier).getAsBoolean();
    }

    /** 运行中 steering 收件箱（无则为 null）：turn 边界排空注入当前对话 */
    public SteeringInbox getSteeringInbox() {
        if (request == null || request.getVariables() == null) {
            return null;
        }
        Object inbox = request.getVariables().get("steeringInbox");
        return inbox instanceof SteeringInbox ? (SteeringInbox) inbox : null;
    }

    public boolean isHeadless() {
        return executionMode == ToolExecutionMode.BACKEND;
    }

    /** 下一轮开始前调用 */
    public AgentRunContext nextTurn() {
        this.turn++;
        return this;
    }

    @SuppressWarnings("unchecked")
    public <T> T getAttribute(String key, Class<T> type) {
        Object value = attributes.get(key);
        return value != null && type.isInstance(value) ? (T) value : null;
    }

    public void setAttribute(String key, Object value) {
        attributes.put(key, value);
    }

    public void recordChars(int count) {
        emittedChars += Math.max(count, 0);
    }
}
