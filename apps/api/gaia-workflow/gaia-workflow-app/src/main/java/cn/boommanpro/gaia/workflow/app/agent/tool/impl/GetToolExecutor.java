package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolGroup;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.*;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
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
    private final GaiaWorkflowService workflowService;
    private final cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService modelConfigService;

    private final cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService versionService;

    public GetToolExecutor(SessionWorkflowDraftService draftService, AgentSkillCatalog skillCatalog,
                           GaiaWorkflowService workflowService,
                           cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService modelConfigService,
                           cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService versionService) {
        this.draftService = draftService;
        this.skillCatalog = skillCatalog;
        this.workflowService = workflowService;
        this.modelConfigService = modelConfigService;
        this.versionService = versionService;
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
            // 版本感知（用户手改不再对模型隐身）：草稿修订号 + 最后编辑者 + 绑定工作流落版基准
            .set("draftRevision", draftService.getDraftRevision(sessionKey))
            .set("lastEditedBy", draftService.getLastEditedBy(sessionKey))
            .set("lastEditedAt", draftService.getLastEditedAt(sessionKey));
        if (code != null && !code.isEmpty()) {
            GaiaWorkflow bound = workflowService.getOne(
                new QueryWrapper<GaiaWorkflow>().eq("workflow_code", code).last("LIMIT 1"));
            if (bound != null && bound.getRevision() != null) {
                payload.set("publishedRevision", bound.getRevision());
            }
        }
        // 可复用子流程清单（2026-10-25 C15 实证：模型无法发现已发布工作流——知识让
        // 「先 get(target=canvas) 查可用项」，但 canvas 回执从不带已发布清单，子流程无从谈起）
        try {
            JSONArray published = new JSONArray();
            java.util.List<GaiaWorkflow> publishedList = workflowService.list(
                new QueryWrapper<GaiaWorkflow>()
                    .isNotNull("current_version_id")
                    .ne("workflow_code", code == null ? "" : code)
                    .orderByDesc("id").last("LIMIT 20"));
            for (GaiaWorkflow wf : publishedList) {
                JSONObject entry = new JSONObject()
                    .set("workflowCode", wf.getWorkflowCode())
                    .set("revision", wf.getRevision());
                // 入参/出参 schema：模型映射 inputsValues 与引用输出字段的唯一事实源
                // （与前端子流程清单同口径：start.outputs=入参、end.inputs=出参）
                try {
                    cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion ver =
                        versionService.getById(wf.getCurrentVersionId());
                    if (ver != null && ver.getWorkflowData() != null) {
                        cn.hutool.json.JSONObject dsl = cn.hutool.json.JSONUtil.parseObj(ver.getWorkflowData());
                        for (Object n : dsl.getJSONArray("nodes")) {
                            cn.hutool.json.JSONObject node = (cn.hutool.json.JSONObject) n;
                            String t = node.getStr("type");
                            if ("start".equals(t)) {
                                entry.set("inputs", node.getJSONObject("data") == null ? null
                                    : node.getJSONObject("data").getJSONObject("outputs"));
                            } else if ("end".equals(t)) {
                                entry.set("outputs", node.getJSONObject("data") == null ? null
                                    : node.getJSONObject("data").getJSONObject("inputs"));
                            }
                        }
                    }
                } catch (Exception ignore) {
                    // 单条版本解析失败不影响清单
                }
                published.add(entry);
            }
            if (!published.isEmpty()) {
                payload.set("publishedWorkflows", published);
                payload.set("publishedWorkflowsHint",
                    "复用已发布工作流用 workflow 节点：{\"workflowId\":\"<workflowCode>\",…}；"
                        + "子流程入参以该工作流 start 的入参为准（可用 get(target=knowledge, nodeType=workflow) 查写法）");
            }
        } catch (Exception e) {
            // 清单查询失败不阻塞画布读取
        }
        payload.set("hint", "draftRevision=会话草稿修订号（每次实质变更 +1）；lastEditedBy: user=用户手动编辑/回滚、ai=你此前的修改、system=系统动作；publishedRevision=绑定工作流已落版的 revision，与 draftRevision 不同说明草稿有未保存修改。看单节点配置 get(target=node, nodeId)；配引用 get(target=variables, nodeId)；类型知识 get(target=knowledge, nodeType)；改结构用 node / edge 工具");
        return ToolResult.ok(payload.toString(), "画布 " + coreNodes.size() + " 节点（r" + draftService.getDraftRevision(sessionKey) + "）");
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
        if (nodeType == null || !nodeType.matches("[a-z][a-z-]*")) {
            return ToolResult.fail("{\"error\":\"需要合法 nodeType\"}", "缺少或非法 nodeType");
        }
        var contract = NodeSchemaRegistry.contract(nodeType);
        var refFile = skillCatalog.getFile("gaia-workflow-assistant", "references/node_" + nodeType + ".md");
        if (contract != null || refFile != null) {
            JSONObject payload = contract == null ? new JSONObject()
                : cn.hutool.json.JSONUtil.parseObj(contract.toString());
            payload.set("nodeType", nodeType);
            if (refFile != null) payload.set("doc", refFile.getContent());
            var outputs = NodeSchemaRegistry.staticOutputs(nodeType);
            if (outputs != null) payload.set("staticOutputs", new JSONArray(outputs));
            if ("llm".equals(nodeType)) {
                // 平台默认模型配置（2026-10-25 用户决策）：运行时不再隐式注入凭证，
                // AI 生成时必须把这三个值原样填进 inputsValues——配置在表单可见、随草稿持久化
                try {
                    var llm = modelConfigService.getLlmConfig();
                    if (llm != null) {
                        payload.set("platformDefaultModel", new JSONObject()
                            .set("modelName", llm.getModel())
                            .set("apiHost", llm.getApiHost())
                            .set("apiKey", llm.getApiKey()));
                        payload.set("platformDefaultModelHint",
                            "创建/更新 llm 节点时必须把以上三个值原样填进 inputsValues（modelName/apiHost/apiKey），"
                                + "不要留空、不要自编、不要写进提示词或其他字段");
                    }
                } catch (Exception e) {
                    // 模型配置不可用：知识照常返回，凭证由用户手动填写
                }
            }
            return ToolResult.ok(payload.toString(), "已返回 " + nodeType + " 知识");
        }
        return ToolResult.notFound("节点类型 " + nodeType + "（可用类型见技能目录）");
    }

    /**
     * 空画布默认骨架：两个孤立节点（start_1 / end_1），不预连边、不预填占位输出。
     * <p>
     * 2026-10-18 E2E 实证（case-221c56cb20）：预连 start→end 直连边 + 预填
     * output=constant "" 会让模型插节点后忘记拆边（并行双路）或忘记替换占位
     * （输出空串却"试跑通过"）。结构性消灭该类事故：骨架只给锚点，接线与输出
     * 全部由模型显式完成，未配置即被 endHasInputs 预检挡下。
     */
    private static JSONObject buildDefaultSkeleton() {
        return new JSONObject().set("nodes", new JSONArray()
            .set(new JSONObject().set("id", "start_1").set("type", "start")
                .set("meta", new JSONObject().set("position", new JSONObject().set("x", 180).set("y", 180)))
                .set("data", new JSONObject().set("title", "开始").set("outputs", new JSONObject()
                    .set("type", "object").set("properties", new JSONObject().set("input",
                        new JSONObject().set("type", "string").set("default", ""))))))
            .set(new JSONObject().set("id", "end_1").set("type", "end")
                .set("meta", new JSONObject().set("position", new JSONObject().set("x", 500).set("y", 180)))
                .set("data", new JSONObject().set("title", "结束")
                    .set("inputsValues", new JSONObject())
                    .set("inputs", new JSONObject().set("type", "object")
                        .set("properties", new JSONObject())))))
            .set("edges", new JSONArray());
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
