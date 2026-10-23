package cn.boommanpro.gaia.workflow.app.agent.tool;

/**
 * 工具分组（2026-10-17 工具体系重构）。
 * 公共工具与工作流工具分离，分组作用于 prompt 分组段 + DB 落库 + 管理页展示。
 */
public enum ToolGroup {

    /** 公共工具：任何任务都用得上（ask_user / todo_write / skill） */
    COMMON("common", "公共工具"),

    /** 工作流工具：操作会话画布 */
    WORKFLOW("workflow", "工作流工具"),

    /** MCP 工具：来自外部 MCP 服务器（mcp__服务器名__工具名），随服务器连接动态增删 */
    MCP("mcp", "MCP 工具");

    private final String code;
    private final String label;

    ToolGroup(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public String getCode() { return code; }
    public String getLabel() { return label; }

    public static ToolGroup ofCode(String code) {
        if (code == null) return WORKFLOW;
        for (ToolGroup group : values()) {
            if (group.code.equalsIgnoreCase(code)) return group;
        }
        return WORKFLOW;
    }
}
