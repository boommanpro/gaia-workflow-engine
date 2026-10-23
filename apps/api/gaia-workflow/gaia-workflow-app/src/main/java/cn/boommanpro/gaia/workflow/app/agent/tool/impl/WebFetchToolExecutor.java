package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolGroup;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONObject;
import io.agentscope.harness.agent.tool.WebTools;
import org.springframework.stereotype.Component;

/**
 * web_fetch —— 抓取网页内容（复用 agentscope-harness 内置 WebFetchTool）。
 *
 * <p>纯 HTTP GET（仅 http/https，30s 超时，10 万字符上限），无需任何密钥。
 * 与 web_search 一起作为公共工具（common 组）在工具定义页可启停。</p>
 */
@Component
public class WebFetchToolExecutor implements ToolExecutor {

    private final WebTools.WebFetchTool delegate = new WebTools.WebFetchTool();

    @Override
    public String name() {
        return "web_fetch";
    }

    @Override
    public ToolGroup group() {
        return ToolGroup.COMMON;
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "抓取网页内容：输入 http/https 地址，返回页面文本（可限最大长度）";
    }

    @Override
    public boolean concurrencySafe() {
        return true;
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String url = args.getStr("url");
        if (url == null || url.isBlank()) {
            return ToolResult.invalidArgs(null, "url is required");
        }
        Integer maxLength = args.getInt("max_length");
        if (maxLength == null) {
            maxLength = args.getInt("maxLength");
        }
        String result = delegate.webFetch(url.strip(), maxLength);
        if (result != null && result.startsWith("Error:")) {
            return ToolResult.fail(new JSONObject().set("error", result).toString(), result);
        }
        return ToolResult.ok(new JSONObject().set("content", result).toString());
    }
}
