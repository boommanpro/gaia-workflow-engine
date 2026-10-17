package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolGroup;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.*;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.springframework.stereotype.Component;

import cn.boommanpro.gaia.workflow.app.service.CanvasPlacement;

/** node — 节点增/改/删（三合一，通过 action 参数区分） */
@Component
public class NodeToolExecutor implements ToolExecutor {

    private final SessionWorkflowDraftService draftService;

    public NodeToolExecutor(SessionWorkflowDraftService draftService) {
        this.draftService = draftService;
    }

    @Override public String name() { return "node"; }
    @Override public ExecutionSurface surface() { return ExecutionSurface.BACKEND_ONLY; }
    @Override public String description() { return "节点增/改/删（action=add/update/remove）"; }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext ctx) {
        String action = args.getStr("action");
        if (action == null) return ToolResult.fail("{\"error\":\"需要 action\"]", "缺少 action");
        switch (action) {
            case "add": return doAdd(args, ctx);
            case "update": return doUpdate(args, ctx);
            case "remove": return doRemove(args, ctx);
            default: return ToolResult.fail("{\"error\":\"action 必须是 add/update/remove\"]", "未知 action");
        }
    }

    private ToolResult doAdd(JSONObject args, AgentRunContext ctx) {
        String sessionKey = ctx.getSessionKey();
        JSONArray items = args.getJSONArray("items");
        if (items == null || items.isEmpty()) items = new JSONArray().set(args);
        JSONArray added = new JSONArray();
        JSONArray warnings = new JSONArray();
        java.util.Map<String, String> refToId = new java.util.LinkedHashMap<>();
        for (int i = 0; i < items.size(); i++) {
            JSONObject item = items.getJSONObject(i);
            if (item == null) continue;
            String type = item.getStr("type");
            if (type == null || !WorkflowDslCanonicalizer.isSupportedType(type)) {
                warnings.add("items[" + i + "]: 类型 \"" + type + "\" 不受支持"); continue;
            }
            JSONObject connect = item.getJSONObject("connect");
            String connectFrom = connect != null ? resolveRef(connect.getStr("from"), refToId) : null;
            JSONObject position = CanvasPlacement.place(draftService.getOrCreate(sessionKey), connectFrom);
            JSONObject opArgs = new JSONObject().set("type", type).set("position", position);
            if (item.getStr("id") != null) opArgs.set("id", item.getStr("id"));
            if (item.getStr("title") != null) opArgs.set("title", item.getStr("title"));
            if (item.getJSONObject("data") != null) opArgs.set("data", item.getJSONObject("data"));
            JSONObject result = draftService.addNode(sessionKey, opArgs);
            if (result == null || !result.getBool("success", false)) { warnings.add("items[" + i + "] 添加失败"); continue; }
            String newId = result.getStr("nodeId");
            if (item.getStr("ref") != null) refToId.put(item.getStr("ref"), newId);
            added.add(new JSONObject().set("id", newId).set("type", type).set("position", position));
            if (connect != null) {
                String from = connectFrom, to = resolveRef(connect.getStr("to"), refToId);
                if (from != null) {
                    JSONObject cArgs = new JSONObject().set("from", from).set("to", newId);
                    if (connect.getStr("fromPort") != null) cArgs.set("fromPort", connect.getStr("fromPort"));
                    draftService.connect(sessionKey, cArgs);
                }
                if (to != null) draftService.connect(sessionKey, new JSONObject().set("from", newId).set("to", to));
            }
        }
        if (added.isEmpty()) return ToolResult.fail("{\"error\":\"没有节点被添加\",\"warnings\":" + warnings + "}".replace("[\"]","[]"), "add 失败");
        draftService.persistArtifact(sessionKey, "building", "node add " + added.size());
        draftService.emitDocument(ctx, sessionKey);
        return ToolResult.ok(new JSONObject().set("added", added).set("warnings", warnings).set("layout", "auto").toString(),
            "已添加 " + added.size() + " 个节点");
    }

    private ToolResult doUpdate(JSONObject args, AgentRunContext ctx) {
        String sessionKey = ctx.getSessionKey();
        String nodeId = args.getStr("nodeId");
        JSONObject patch = args.getJSONObject("data");
        if (nodeId == null || (patch == null && args.getStr("title") == null))
            return ToolResult.fail("{\"error\":\"需要 nodeId 与 data/title\"}", "参数不完整");
        JSONObject node = draftService.getNode(sessionKey, nodeId);
        if (node == null) return ToolResult.notFound("节点 " + nodeId);
        java.util.List<String> problems = new java.util.ArrayList<>();
        JSONObject merged = node.getJSONObject("data") != null ? new JSONObject(node.getJSONObject("data").toString()) : new JSONObject();
        if (patch != null) deepMerge(merged, patch);
        String type = node.getStr("type");
        if (NodeSchemaRegistry.hasSchema(type))
            for (String v : NodeSchemaRegistry.validateParams(type, merged.toString())) problems.add("契约: " + v);
        JSONObject probe = new JSONObject().set("id", nodeId).set("type", type).set("data", merged);
        for (String issue : WorkflowDslCanonicalizer.businessFieldIssues(new JSONObject().set("nodes", new JSONArray().set(probe)).set("edges", new JSONArray())))
            problems.add(issue);
        if (!problems.isEmpty())
            return ToolResult.fail(new JSONObject().set("error", "更新被拒绝").set("issues", problems)
                .set("fixHint", "补全字段后重试").toString(), "更新被契约打回");
        JSONObject apply = new JSONObject().set("nodeId", nodeId);
        if (patch != null) apply.set("data", patch);
        if (args.getStr("title") != null) apply.set("title", args.getStr("title"));
        draftService.updateNode(sessionKey, apply);
        draftService.persistArtifact(sessionKey, "building", "update " + nodeId);
        draftService.emitDocument(ctx, sessionKey);
        return ToolResult.ok(new JSONObject().set("ok", true).set("nodeId", nodeId)
            .set("hint", "run(target=node, nodeId) 单测 / run(target=workflow) 整流验证").toString(), "已更新 " + nodeId);
    }

    @SuppressWarnings("unchecked")
    private static void deepMerge(JSONObject base, JSONObject patch) {
        for (String key : patch.keySet()) {
            Object in = patch.get(key), cur = base.get(key);
            if (in instanceof JSONObject && cur instanceof JSONObject) deepMerge((JSONObject) cur, (JSONObject) in);
            else base.set(key, in);
        }
    }

    private ToolResult doRemove(JSONObject args, AgentRunContext ctx) {
        String sessionKey = ctx.getSessionKey();
        String nodeId = args.getStr("nodeId");
        JSONObject node = draftService.getNode(sessionKey, nodeId);
        if (node == null) return ToolResult.notFound("节点 " + nodeId);
        String type = node.getStr("type");
        if ("block-start".equals(type) || "block-end".equals(type))
            return ToolResult.rejected("block-start/end 不能单独删除");
        JSONArray affected = new JSONArray();
        JSONArray edges = draftService.get(sessionKey).getJSONArray("edges");
        if (edges != null) for (int i = 0; i < edges.size(); i++) {
            JSONObject e = edges.getJSONObject(i);
            if (nodeId.equals(e.getStr("sourceNodeID")) || nodeId.equals(e.getStr("targetNodeID")))
                affected.add(e.getStr("sourceNodeID") + "->" + e.getStr("targetNodeID"));
        }
        draftService.deleteNode(sessionKey, nodeId);
        draftService.persistArtifact(sessionKey, "building", "remove " + nodeId);
        draftService.emitDocument(ctx, sessionKey);
        return ToolResult.ok(new JSONObject().set("removed", nodeId).set("affectedEdges", affected).toString(), "已删除 " + nodeId);
    }

    private static String resolveRef(String raw, java.util.Map<String, String> refs) {
        if (raw == null) return null;
        return raw.startsWith("$") ? refs.get(raw.substring(1)) : raw;
    }
}
