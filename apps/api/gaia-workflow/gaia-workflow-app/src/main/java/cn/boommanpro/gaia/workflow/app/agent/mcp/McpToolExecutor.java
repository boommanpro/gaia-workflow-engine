package cn.boommanpro.gaia.workflow.app.agent.mcp;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolGroup;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONObject;

/**
 * MCP 工具执行器（动态注册）：一个 (server, tool) 一个实例，
 * 由 {@link McpServerManager} 在连接/断开时注册与注销。
 */
public class McpToolExecutor implements ToolExecutor {

    private final String toolName;      // mcp__server__tool（与 agent_tool_definition 对齐）
    private final String serverName;
    private final String description;
    private final McpServerManager manager;

    public McpToolExecutor(String toolName, String serverName, String description, McpServerManager manager) {
        this.toolName = toolName;
        this.serverName = serverName;
        this.description = description == null ? "" : description;
        this.manager = manager;
    }

    @Override
    public String name() {
        return toolName;
    }

    @Override
    public ToolGroup group() {
        return ToolGroup.MCP;
    }

    @Override
    public ExecutionSurface surface() {
        // MCP 服务器由后端进程/HTTP 直连，无需前端参与
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return description;
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        try {
            JSONObject result = manager.callTool(serverName, shortName(), args);
            boolean isError = result != null && result.getBool("isError", false);
            String payload = McpServerManager.contentToPayload(result);
            if (isError) {
                return ToolResult.fail(payload, "MCP 工具返回错误");
            }
            return ToolResult.ok(payload);
        } catch (Exception e) {
            return ToolResult.fail(
                new JSONObject().set("error", e.getMessage()).toString(),
                "MCP 调用失败：" + e.getMessage());
        }
    }

    private String shortName() {
        // mcp__server__tool → tool
        String[] parts = toolName.split("__");
        return parts.length >= 3 ? toolName.substring(("mcp__" + serverName + "__").length()) : toolName;
    }
}
