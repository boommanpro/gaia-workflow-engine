package cn.boommanpro.gaia.workflow.app.agent.core;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.util.HashMap;
import java.util.Map;

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

    /** 运行过程中的共享数据，供各策略之间传递中间结果 */
    private final Map<String, Object> attributes = new HashMap<>();

    public AgentRunContext(AgentRequest request, AgentDefinition definition, ToolExecutionMode executionMode) {
        this.request = request;
        this.definition = definition;
        this.executionMode = executionMode;
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
