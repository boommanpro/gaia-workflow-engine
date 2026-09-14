package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONObject;
import lombok.AllArgsConstructor;

/**
 * 只能在前端执行的工具占位器。
 *
 * <p>它的存在是为了让「哪些工具依赖浏览器」成为注册表里的显式事实，
 * 而不是散落在前端 JavaScript 里的隐性知识。有了它，自治模式可以在
 * 调模型之前就把 {@code canvas} / {@code navigate} 这类工具从候选列表里剔除，
 * 避免模型反复调用一个注定失败的工具。</p>
 *
 * <p>前端在场（FRONTEND 模式）时，Runtime 仍会把调用挂起交给浏览器，
 * 因此旧链路的行为完全不受影响。</p>
 */
@AllArgsConstructor
public class FrontendUiToolExecutor implements ToolExecutor {

    private final String toolName;
    private final String description;

    @Override
    public String name() {
        return toolName;
    }

    @Override
    public String description() {
        return description;
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.FRONTEND_ONLY;
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        return ToolResult.unavailable("工具 " + toolName + " 只能在浏览器界面中执行");
    }
}
