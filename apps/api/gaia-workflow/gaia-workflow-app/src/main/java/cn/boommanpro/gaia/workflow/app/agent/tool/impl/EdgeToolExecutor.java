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

import java.util.List;

/**
 * edge — 连线/断线（action=connect/remove）。
 *
 * <p>2026-10-24 校验前移：connect 在动作当场跑 {@link WorkflowDslCanonicalizer#edgeIssues}
 * （端点存在/自环/重复/fromPort 合法性），非法连线直接拒绝并回修复指引——
 * 历史上 fromPort 猜成 true/false 的事故（下游全 canceled 却报 succeed），
 * 错误原本要等到 run 预检才暴露，现在连线当场打回。</p>
 */
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

        if (connect) {
            List<String> issues = WorkflowDslCanonicalizer.edgeIssues(
                draftService.getOrCreate(ctx.getSessionKey()), from, to, port);
            // 重复连线按幂等成功处理：批量 add 的 connect 已建边后模型常再显式连一次，
            // 当成失败只会让它白耗轮数去「修」一条本来就对的线（2026-10-24 实证连续 5 次）
            if (!issues.isEmpty() && issues.stream().allMatch(s -> s.contains("已存在"))) {
                String label = from + "->" + to + (port != null ? "[" + port + "]" : "");
                return ToolResult.ok(new JSONObject().set("connect", label).set("success", true)
                    .set("alreadyExisted", true)
                    .set("hint", "这条连线此前已建立（批量 add 的 connect 已接好），无需重复；继续下一步").toString(),
                    "连线已存在（幂等）" + label);
            }
            if (!issues.isEmpty()) {
                return ToolResult.fail(new JSONObject()
                    .set("error", "连线被拒绝").set("issues", issues)
                    .set("fixHint", "按 issues 修正后重试；分支端口只认 conditions[].key / branches[].id / else").toString(),
                    "连线被拒绝");
            }
        }

        JSONObject result = connect
            ? draftService.connect(ctx.getSessionKey(), args)
            : draftService.disconnectEdge(ctx.getSessionKey(), from, to, port);
        draftService.persistArtifact(ctx.getSessionKey(), "building", "edge " + action);
        draftService.emitDocument(ctx, ctx.getSessionKey());
        String label = from + "->" + to + (port != null ? "[" + port + "]" : "");
        return ToolResult.ok(new JSONObject().set(action, label).set("success", result != null && result.getBool("success", false)).toString(),
            action + " " + label);
    }
}
