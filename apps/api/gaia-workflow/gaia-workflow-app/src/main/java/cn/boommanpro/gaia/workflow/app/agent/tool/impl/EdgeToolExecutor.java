package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslCanonicalizer;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.springframework.stereotype.Component;

/** edge — 连线/断线（action=connect/remove） */
@Component
public class EdgeToolExecutor implements ToolExecutor {

    private final SessionWorkflowDraftService draftService;

    public EdgeToolExecutor(SessionWorkflowDraftService draftService) { this.draftService = draftService; }

    @Override public String name() { return "edge"; }
    @Override public ExecutionSurface surface() { return ExecutionSurface.BACKEND_ONLY; }
    @Override public String description() { return "连线/断线（action=connect/remove）"; }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext ctx) {
        String action = args.getStr("action");
        String from = args.getStr("from"), to = args.getStr("to"), port = args.getStr("fromPort");
        if (from == null || to == null) return ToolResult.fail("{\"error\":\"需要 from 和 to\"}", "参数不完整");
        boolean connect = "connect".equals(action);
        if (!connect && !"remove".equals(action))
            return ToolResult.fail("{\"error\":\"action 必须是 connect 或 remove\"}", "参数不完整");
        JSONObject result = connect
            ? draftService.connect(ctx.getSessionKey(), args)
            : draftService.disconnectEdge(ctx.getSessionKey(), from, to, port);
        draftService.persistArtifact(ctx.getSessionKey(), "building", "edge " + action);
        draftService.emitDocument(ctx, sessionKey(ctx));
        String label = from + "->" + to + (port != null ? "[" + port + "]" : "");
        return ToolResult.ok(new JSONObject().set(action, label).set("success", result != null && result.getBool("success", false)).toString(),
            action + " " + label);
    }

    private static String sessionKey(AgentRunContext ctx) { return ctx.getSessionKey(); }
}
