package cn.boommanpro.gaia.workflow.app.agent.tool;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.hutool.json.JSONObject;

/**
 * 工具执行器（策略模式）。
 *
 * <p>改造前「工具」只有两处定义：后端 {@code AgentToolRegistry} 里的一份 JSON schema，
 * 和前端 JavaScript 里的一个 switch 执行器 —— 两边靠字符串约定对齐，没有类型约束，
 * 也因此后端<strong>无法自己执行工具</strong>，必须依赖浏览器。</p>
 *
 * <p>每个 {@code ToolExecutor} 现在显式回答：</p>
 * <ul>
 *   <li>{@link #name()} —— 对应哪个工具名</li>
 *   <li>{@link #surface()} —— 能在哪一侧执行（决定自治模式下能否本地跑）</li>
 *   <li>{@link #execute(JSONObject, AgentRunContext)} —— 真正的执行逻辑</li>
 * </ul>
 */
public interface ToolExecutor {

    /** 工具名，需与 AgentToolRegistry 中的 schema 名称一致 */
    String name();

    /**
     * 执行面。默认 {@link ExecutionSurface#ANY}：
     * 纯后端能力不需要改，依赖 UI 的能力请显式声明 FRONTEND_ONLY。
     */
    default ExecutionSurface surface() {
        return ExecutionSurface.ANY;
    }

    /** 是否可用（例如依赖的外部服务未配置时返回 false） */
    default boolean enabled() {
        return true;
    }

    /** 简短描述，给模型/管理界面看 */
    default String description() {
        return "";
    }

    /**
     * 执行工具。
     *
     * @param args 模型给出的参数
     * @param context 运行时上下文（含会话、语言、是否无头等）
     */
    ToolResult execute(JSONObject args, AgentRunContext context);

    /**
     * 判断该执行器能否在指定模式下由后端直接跑。
     */
    default boolean canRunOnBackend() {
        return enabled() && (surface() == ExecutionSurface.ANY || surface() == ExecutionSurface.BACKEND_ONLY);
    }
}
