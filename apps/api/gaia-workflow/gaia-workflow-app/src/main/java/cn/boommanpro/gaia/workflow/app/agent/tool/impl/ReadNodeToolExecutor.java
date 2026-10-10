package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.springframework.stereotype.Component;

/**
 * read_node —— 节点详情 + 可用变量（合并原 query.nodeDetail / availableVariables）。
 *
 * <p>变量信息是 updateNode 配置表达式（prompt 里的 {{ 引用 }}）的输入，
 * 和节点详情一次返回，省一次往返。</p>
 */
@Component
public class ReadNodeToolExecutor implements ToolExecutor {

    private final SessionWorkflowDraftService draftService;

    public ReadNodeToolExecutor(SessionWorkflowDraftService draftService) {
        this.draftService = draftService;
    }

    @Override
    public String name() {
        return "read_node";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "读取节点详情与可用变量（基于会话草稿）";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String nodeId = args.getStr("nodeId");
        JSONObject node = draftService.getNode(context.getSessionKey(), nodeId);
        if (node == null) {
            return ToolResult.notFound("节点 " + nodeId
                + "（会话草稿中无此节点；如要查看其它工作流请先 read_workflow 水化）");
        }
        JSONArray variables = draftService.availableVariables(context.getSessionKey());
        JSONObject payload = new JSONObject()
            .set("node", node)
            .set("availableVariables", variables);
        return ToolResult.ok(payload.toString(), "已返回节点 " + nodeId + " 与可用变量");
    }
}
