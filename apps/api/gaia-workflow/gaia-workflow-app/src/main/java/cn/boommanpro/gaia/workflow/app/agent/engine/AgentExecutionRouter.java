package cn.boommanpro.gaia.workflow.app.agent.engine;

import cn.boommanpro.gaia.workflow.app.agent.core.Agent;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * 执行引擎路由器 —— Agent 路由选定后，按定义的 {@code engine} 字段挑选执行引擎。
 *
 * <p>与 {@link AgentRegistry}（选「哪个 Agent」）分工明确：本类只选「怎么跑」。
 * 没有引擎匹配时回退到第一个引擎（local），保证存量定义零改造。</p>
 */
@Slf4j
@Component
public class AgentExecutionRouter {

    private final AgentRegistry agentRegistry;
    private final List<AgentExecutionEngine> engines;

    public AgentExecutionRouter(AgentRegistry agentRegistry, List<AgentExecutionEngine> engines) {
        this.agentRegistry = agentRegistry;
        this.engines = engines;
    }

    /** 路由 Agent → 选择引擎 → 执行 */
    public AgentRunResult run(AgentRequest request, AgentEventSink sink) {
        AgentEventSink safeSink = sink != null ? sink : AgentEventSink.noop();

        Optional<Agent> routed = agentRegistry.route(request);
        if (!routed.isPresent()) {
            String message = "没有可用的 Agent（" + agentRegistry.size() + " 个已注册候选均不匹配）";
            log.warn("[engine-router] {}", message);
            safeSink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
            return AgentRunResult.failure(message);
        }

        AgentDefinition definition = routed.get().getDefinition();
        AgentExecutionEngine engine = resolve(definition);
        log.debug("[engine-router] session={} agent={} engine={}",
            request.getSessionKey(), definition.getId(), engine.id());
        return engine.run(request, safeSink);
    }

    /** 按定义挑引擎；无匹配回退第一个（约定 local 引擎排第一） */
    public AgentExecutionEngine resolve(AgentDefinition definition) {
        for (AgentExecutionEngine engine : engines) {
            if (engine.supports(definition)) {
                return engine;
            }
        }
        return engines.get(0);
    }
}
