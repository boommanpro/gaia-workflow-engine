package cn.boommanpro.gaia.workflow.app.agent.mcp;

import cn.hutool.json.JSONObject;

import java.util.List;

/**
 * MCP 传输客户端（消费外部 MCP Server）。
 *
 * <p>实现：{@link McpStdioClient}（本地进程，行分隔 JSON-RPC over stdio）、
 * {@link McpHttpClient}（Streamable HTTP 与旧 SSE 协议）。对齐仓库惯例：
 * Spring Boot 2 javax 栈手写，不引入 jakarta 版 MCP SDK。</p>
 */
public interface McpTransportClient {

    /** 协议握手：initialize + notifications/initialized */
    void initialize(long timeoutMs) throws Exception;

    /** 工具发现（处理 nextCursor 分页） */
    List<McpToolDescriptor> listTools(long timeoutMs) throws Exception;

    /**
     * 调用工具，返回 MCP result（content 数组 + isError 标记），由上层转 ToolResult。
     */
    JSONObject callTool(String toolName, JSONObject arguments, long timeoutMs) throws Exception;

    /** 关闭连接 / 销毁进程 */
    void close();
}
