package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/**
 * MCP 服务器配置（自定义外部工具来源）。
 *
 * <p>连接后其工具自动同步进 {@code agent_tool_definition}（tool_group='mcp'，
 * tool_name 形如 {@code mcp__<serverName>__<tool>}）；服务器启停控制执行器注册，
 * 每工具的启停沿用 agent_tool_definition.enabled（重连刷新只更新 schema/描述，不覆盖启停）。</p>
 */
@Data
@TableName("agent_mcp_server")
public class AgentMcpServer {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /** 工具命名空间：mcp__&lt;serverName&gt;__&lt;tool&gt;；小写字母/数字/中划线 */
    @TableField("server_name")
    private String serverName;

    /** 传输类型：stdio（本地进程）| sse（HTTP+SSE 旧协议）| http（Streamable HTTP） */
    @TableField("transport")
    private String transport;

    /** stdio：可执行命令（npx / uvx / node …） */
    @TableField("command")
    private String command;

    /** stdio：启动参数（JSON 字符串数组） */
    @TableField("args")
    private String args;

    /** stdio：环境变量（JSON 对象） */
    @TableField("env")
    private String env;

    /** sse/http：服务器地址 */
    @TableField("url")
    private String url;

    /** sse/http：请求头（JSON 对象，鉴权用） */
    @TableField("headers")
    private String headers;

    /**
     * 断开时的启停快照（JSON 数组，工具全名）：重连按此恢复 enabled，
     * 不在快照里的（此前被手工停用）保持关闭。
     */
    @TableField("enabled_tools")
    private String enabledTools;

    @TableField("enabled")
    private Integer enabled;

    @TableField("created_at")
    private String createdAt;

    @TableField("updated_at")
    private String updatedAt;

    @TableField("is_deleted")
    @TableLogic
    private Integer isDeleted;
}
