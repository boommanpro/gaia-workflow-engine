package cn.boommanpro.gaia.workflow.app.agent.mcp;

import cn.hutool.json.JSONObject;

/**
 * MCP 工具描述（tools/list 结果项）。
 */
public class McpToolDescriptor {

    private final String name;
    private final String description;
    private final JSONObject inputSchema;

    public McpToolDescriptor(String name, String description, JSONObject inputSchema) {
        this.name = name;
        this.description = description == null ? "" : description;
        this.inputSchema = inputSchema;
    }

    public String getName() { return name; }
    public String getDescription() { return description; }
    public JSONObject getInputSchema() { return inputSchema; }
}
