package cn.boommanpro.gaia.workflow.app.agent.engine;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;

/**
 * Agent 执行引擎（策略模式）—— 「谁驱动对话循环」的最高层抽象。
 *
 * <p>引入引擎层后，{@code AgentDefinition.engine} 决定一次运行由谁编排：</p>
 * <ul>
 *   <li><b>local</b> —— {@code AgentRuntime} 自研循环：LlmProvider 多轮对话 +
 *       ToolExecutorRegistry 工具执行，全部能力在自己服务端</li>
 *   <li><b>ark</b> —— {@code ArkManagedExecutionEngine}：循环托管给火山方舟
 *       Managed Agents，本服务只做会话映射、事件翻译与自定义工具回传</li>
 * </ul>
 *
 * <p>路由（选 Agent）依旧由 {@code AgentRegistry.route} 完成；引擎只负责「路由选定后
 * 怎么跑」。调用方统一走 {@link AgentExecutionRouter}，不感知引擎差异。</p>
 */
public interface AgentExecutionEngine {

    /** 引擎标识，与 {@code AgentDefinition.engine} 对应 */
    String id();

    /**
     * 执行一次 Agent 运行（阻塞直到结束）。
     *
     * @param request 运行请求
     * @param sink    事件输出端；传 {@link AgentEventSink#noop()} 即为完全静默
     */
    AgentRunResult run(AgentRequest request, AgentEventSink sink);

    /** 该引擎能否执行此定义（按 engine 字段匹配；local 为缺省值） */
    default boolean supports(AgentDefinition definition) {
        String engine = definition == null ? null : definition.getEngine();
        return id().equalsIgnoreCase(engine == null || engine.isEmpty() ? "local" : engine);
    }
}
