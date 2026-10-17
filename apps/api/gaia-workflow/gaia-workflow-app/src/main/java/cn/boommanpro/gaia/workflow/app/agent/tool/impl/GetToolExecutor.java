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

import java.util.List;
import java.util.Map;

/** get — 画布核心视图 / 单节点配置 / 节点可用变量 / 节点类型知识（四合一查询入口） */
@Component
public class GetToolExecutor implements ToolExecutor {

    /** 敏感键：节点配置回灌模型时一律掩蔽，不进 LLM 上下文 */
    private static final java.util.Set<String> SENSITIVE_KEYS = java.util.Set.of(
        "apiKey", "apiHost", "api_key", "api_host", "token", "password", "authorization");
    private static final String REDACTED = "<平台配置，已隐藏>";

    private final SessionWorkflowDraftService draftService;
    private final AgentSkillCatalog skillCatalog;

    public GetToolExecutor(SessionWorkflowDraftService draftService, AgentSkillCatalog skillCatalog) {
        this.draftService = draftService;
        this.skillCatalog = skillCatalog;
    }

    @Override public String name() { return "get"; }
    @Override public ExecutionSurface surface() { return ExecutionSurface.BACKEND_ONLY; }
    @Override public boolean concurrencySafe() { return true; }
    @Override public String description() { return "查询画布/节点/变量/节点知识"; }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext ctx) {
        String target = args.getStr("target");
        if (target == null) return ToolResult.fail("{\"error\":\"需要 target\"]", "缺少 target");
        switch (target) {
            case "canvas": return getCanvas(ctx);
            case "node": return getNode(args, ctx);
            case "variables": return getVariables(args, ctx);
            case "knowledge": return getKnowledge(args, ctx);
            default: return ToolResult.fail("{\"error\":\"未知 target: " + target + "\"}", "target 必须是 canvas/node/variables/knowledge");
        }
    }

    private ToolResult getCanvas(AgentRunContext ctx) {
        String sessionKey = ctx.getSessionKey();
        String code = draftService.getBoundCode(sessionKey);
        JSONObject doc = draftService.getOrCreate(sessionKey);
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes == null || nodes.isEmpty()) {
            JSONObject skeleton = buildDefaultSkeleton();
            draftService.replace(sessionKey, skeleton, "stable", "自动创建默认骨架");
            draftService.emitDocument(ctx, sessionKey);
            nodes = skeleton.getJSONArray("nodes");
        }
        JSONArray coreNodes = new JSONArray();
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject n = nodes.getJSONObject(i);
            coreNodes.add(new JSONObject().set("id", n.getStr("id")).set("type", n.getStr("type"))
                .set("title", n.getJSONObject("data") != null ? n.getJSONObject("data").getStr("title", n.getStr("type")) : n.getStr("type")));
        }
        JSONArray coreEdges = new JSONArray();
        JSONArray edges = doc.getJSONArray("edges");
        if (edges != null) for (int i = 0; i < edges.size(); i++) {
            JSONObject e = edges.getJSONObject(i);
            JSONObject c = new JSONObject().set("from", e.getStr("sourceNodeID")).set("to", e.getStr("targetNodeID"));
            if (e.getStr("sourcePortID") != null) c.set("port", e.getStr("sourcePortID"));
            coreEdges.add(c);
        }
        JSONObject payload = new JSONObject().set("boundWorkflow", code).set("nodeCount", coreNodes.size())
            .set("nodes", coreNodes).set("edges", coreEdges)
            .set("hint", "看单节点配置 get(target=node, nodeId)；配引用 get(target=variables, nodeId)；类型知识 get(target=knowledge, nodeType)；改结构用 node / edge 工具");
        return ToolResult.ok(payload.toString(), "画布 " + coreNodes.size() + " 节点");
    }

    /** 单节点当前配置（敏感键掩蔽）+ 入出边：node(action=update) 深合并前先看现状，避免盲改 */
    private ToolResult getNode(JSONObject args, AgentRunContext ctx) {
        String nodeId = args.getStr("nodeId");
        if (nodeId == null || nodeId.isEmpty()) return ToolResult.fail("{\"error\":\"target=node 需要 nodeId\"}", "缺少 nodeId");
        JSONObject node = draftService.getNode(ctx.getSessionKey(), nodeId);
        if (node == null) return ToolResult.notFound("节点 " + nodeId);
        JSONObject data = node.getJSONObject("data");
        JSONArray inEdges = new JSONArray(), outEdges = new JSONArray();
        JSONArray edges = draftService.get(ctx.getSessionKey()).getJSONArray("edges");
        if (edges != null) for (int i = 0; i < edges.size(); i++) {
            JSONObject e = edges.getJSONObject(i);
            JSONObject c = new JSONObject().set("from", e.getStr("sourceNodeID")).set("to", e.getStr("targetNodeID"));
            if (e.getStr("sourcePortID") != null) c.set("fromPort", e.getStr("sourcePortID"));
            if (nodeId.equals(e.getStr("targetNodeID"))) inEdges.add(c);
            if (nodeId.equals(e.getStr("sourceNodeID"))) outEdges.add(c);
        }
        JSONObject payload = new JSONObject()
            .set("nodeId", nodeId)
            .set("type", node.getStr("type"))
            .set("title", data != null ? data.getStr("title") : null)
            .set("data", data != null ? redactForModel(data) : new JSONObject())
            .set("inEdges", inEdges)
            .set("outEdges", outEdges)
            .set("hint", "node(action=update, nodeId, data) 为深合并：只传要改的字段；数组整体替换");
        return ToolResult.ok(payload.toString(), "节点 " + nodeId + "（" + node.getStr("type") + "）");
    }

    /** 递归掩蔽敏感键，不改动原对象 */
    static JSONObject redactForModel(JSONObject data) {
        JSONObject copy = new JSONObject(true);
        for (String key : data.keySet()) {
            Object value = data.get(key);
            if (SENSITIVE_KEYS.contains(key)) {
                copy.set(key, REDACTED);
            } else if (value instanceof JSONObject) {
                copy.set(key, redactForModel((JSONObject) value));
            } else if (value instanceof JSONArray) {
                JSONArray arr = new JSONArray();
                for (Object item : (JSONArray) value) arr.add(item instanceof JSONObject ? redactForModel((JSONObject) item) : item);
                copy.set(key, arr);
            } else {
                copy.set(key, value);
            }
        }
        return copy;
    }

    private ToolResult getVariables(JSONObject args, AgentRunContext ctx) {
        String nodeId = args.getStr("nodeId");
        JSONObject node = draftService.getNode(ctx.getSessionKey(), nodeId);
        if (node == null) return ToolResult.notFound("节点 " + nodeId);
        JSONObject doc = draftService.get(ctx.getSessionKey());
        JSONArray nodes = doc.getJSONArray("nodes");
        var vars = WorkflowDslValidator.inferOutputFields(toList(nodes), typeById(nodes));
        JSONArray upstream = new JSONArray();
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject n = nodes.getJSONObject(i);
            if (n.getStr("id").equals(node.getStr("id"))) continue;
            var fields = vars.get(n.getStr("id"));
            if (fields == null || fields.isEmpty()) continue;
            upstream.add(new JSONObject().set("nodeId", n.getStr("id")).set("type", n.getStr("type"))
                .set("fields", new JSONArray(new java.util.ArrayList<>(fields))));
        }
        JSONObject payload = new JSONObject().set("nodeId", nodeId).set("upstream", upstream)
            .set("hint", "引用写法: {\"type\":\"ref\",\"content\":[\"<上游id>\",\"<字段>\"]} 或 {{ 上游id.字段 }}");
        return ToolResult.ok(payload.toString(), "已返回可用变量");
    }

    private ToolResult getKnowledge(JSONObject args, AgentRunContext ctx) {
        String nodeType = args.getStr("nodeType");
        // 优先从 gaia-workflow-assistant 的引用文件读取（多文件技能统一存储）
        var refFile = skillCatalog.getFile("gaia-workflow-assistant", "references/node_" + nodeType + ".md");
        if (refFile != null) {
            JSONObject payload = new JSONObject()
                .set("nodeType", nodeType)
                .set("doc", refFile.getContent());
            var schema = NodeSchemaRegistry.rawSchema(nodeType);
            if (schema != null) payload.set("paramSchema", cn.hutool.json.JSONUtil.parseObj(schema));
            var outputs = NodeSchemaRegistry.staticOutputs(nodeType);
            if (outputs != null) payload.set("staticOutputs", new JSONArray(outputs));
            return ToolResult.ok(payload.toString(), "已返回 " + nodeType + " 知识");
        }
        return ToolResult.notFound("节点类型 " + nodeType + "（可用类型见技能目录）");
    }

    private static JSONObject buildDefaultSkeleton() {
        return new JSONObject().set("nodes", new JSONArray()
            .set(new JSONObject().set("id", "start_1").set("type", "start")
                .set("meta", new JSONObject().set("position", new JSONObject().set("x", 180).set("y", 180)))
                .set("data", new JSONObject().set("title", "开始").set("outputs", new JSONObject()
                    .set("type", "object").set("properties", new JSONObject().set("input",
                        new JSONObject().set("type", "string").set("default", ""))))))
            .set(new JSONObject().set("id", "end_1").set("type", "end")
                .set("meta", new JSONObject().set("position", new JSONObject().set("x", 500).set("y", 180)))
                .set("data", new JSONObject().set("title", "结束").set("inputsValues", new JSONObject()
                    .set("output", new JSONObject().set("type", "constant").set("content", "")))
                    .set("inputs", new JSONObject().set("type", "object")
                        .set("properties", new JSONObject().set("output", new JSONObject().set("type", "string")))))))
            .set("edges", new JSONArray()
                .set(new JSONObject().set("sourceNodeID", "start_1").set("targetNodeID", "end_1")));
    }

    private static java.util.List<JSONObject> toList(JSONArray arr) {
        java.util.List<JSONObject> list = new java.util.ArrayList<>();
        for (int i = 0; i < arr.size(); i++) list.add(arr.getJSONObject(i));
        return list;
    }

    private static Map<String, String> typeById(JSONArray nodes) {
        Map<String, String> map = new java.util.LinkedHashMap<>();
        for (int i = 0; i < nodes.size(); i++) map.put(nodes.getJSONObject(i).getStr("id"), nodes.getJSONObject(i).getStr("type"));
        return map;
    }
}
