package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.CanvasPlacement;
import cn.boommanpro.gaia.workflow.app.service.NodeDataNormalizer;
import cn.boommanpro.gaia.workflow.app.service.NodeSchemaRegistry;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslCanonicalizer;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslValidator;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * node — 节点增/改/删（三合一，通过 action 参数区分）。
 *
 * <p>2026-10-24 校验前移（全严格治理）：add 与 update 都在动作当场跑
 * 「schema 契约 + 业务字段探针」双重校验（归一化之后、落草稿之前），
 * 错误暴露点从 run 预检提前到生成点，模型能立即归因自修。
 * add 采用软启动：同一会话同类错误首次放行并随回执警告，第二次起拒绝——
 * 防止新契约的边缘误伤直接卡死 agent 流程（观察期后可切硬拒）。</p>
 */
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
        if (action == null) return ToolResult.fail("{\"error\":\"需要 action\"}", "缺少 action");
        switch (action) {
            case "add": return doAdd(args, ctx);
            case "update": return doUpdate(args, ctx);
            case "remove": return doRemove(args, ctx);
            default: return ToolResult.fail("{\"error\":\"action 必须是 add/update/remove\"}", "未知 action");
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
                warnings.add("items[" + i + "]: 类型 \"" + type + "\" 不受支持。可用类型: "
                    + String.join(", ", sortedSupportedTypes()));
                continue;
            }
            // 事前校验：构造归一化后的 data 副本，跑契约 + 业务探针。有问题一律「加入 + 精确警告」，
            // 不再按「同会话第二次同类错误」整批拒绝——2026-10-24 两轮实证：第二批空骨架 / 用 "" 占位的
            // 节点被整批拒掉，模型看不懂原样重发直至熔断；加进去并点名要补什么，模型下一步就能 update，
            // 真正的原地复读由 RepeatToolGuard 负责
            JSONObject itemData = item.getJSONObject("data");
            String probeId = item.getStr("id") != null ? item.getStr("id") : "items[" + i + "]";
            List<String> issues = prospectiveIssues(type, item, probeId);
            if (!issues.isEmpty()) {
                if (isSkeleton(itemData)) {
                    warnings.add("items[" + i + "]（" + type + "）已加入为空骨架，运行前必须 node(action=update, nodeId=\""
                        + probeId + "\") 补齐配置: " + String.join("; ", businessOnly(issues)));
                } else {
                    warnings.add("items[" + i + "]（" + type + "）已加入但配置有问题，运行前必须 node(action=update) 修正: "
                        + String.join("; ", issues));
                }
            }
            JSONObject connect = item.getJSONObject("connect");
            String connectFrom = connect != null ? resolveRef(connect.getStr("from"), refToId) : null;
            JSONObject position = CanvasPlacement.place(draftService.getOrCreate(sessionKey), connectFrom);
            JSONObject opArgs = new JSONObject().set("type", type).set("position", position);
            if (item.getStr("id") != null) opArgs.set("id", item.getStr("id"));
            if (item.getStr("title") != null) opArgs.set("title", item.getStr("title"));
            if (item.getJSONObject("data") != null) opArgs.set("data", item.getJSONObject("data"));
            // parentId 指向 loop 容器：节点落入容器 blocks（缺骨架自动补 block-start/block-end），
            // 容器内互连由 edge(action=connect) 自动写入 loop 节点级 edges
            if (item.getStr("parentId") != null) opArgs.set("parentId", item.getStr("parentId"));
            JSONObject result = draftService.addNode(sessionKey, opArgs);
            if (result == null || !result.getBool("success", false)) { warnings.add("items[" + i + "] 添加失败: " + result.getStr("error")); continue; }
            String newId = result.getStr("nodeId");
            // 引用当场校验（2026-10-25 D1，add 软启动口径：加入 + 精确警告）：
            // 新节点 data 里的 ref/模板引用对「当前草稿 + 本批后续声明了 id 的节点」检查，
            // 断裂引用当场点名（此前要到落版才暴露，AI 已认为大功告成）。
            // 注意 prospective 必须拷贝构造——直接引用草稿的活数组会把探针节点写进草稿。
            JSONArray liveNodes = draftService.get(sessionKey).getJSONArray("nodes");
            JSONArray prospective = new JSONArray();
            for (Object existing : liveNodes) {
                prospective.set(existing);
            }
            for (int j = i + 1; j < items.size(); j++) {
                JSONObject later = items.getJSONObject(j);
                if (later == null || later.getStr("id") == null) continue;
                JSONObject laterData = later.getJSONObject("data") != null
                    ? new JSONObject(later.getJSONObject("data").toString()) : new JSONObject();
                NodeDataNormalizer.normalize(later.getStr("type"), laterData);
                prospective.set(new JSONObject().set("id", later.getStr("id"))
                    .set("type", later.getStr("type")).set("data", laterData));
            }
            for (WorkflowDslValidator.Issue issue : WorkflowDslValidator.referenceIssues(prospective, newId)) {
                warnings.add("items[" + i + "]（" + type + "）引用问题: " + issue.getMessage());
            }
            if (item.getStr("ref") != null) refToId.put(item.getStr("ref"), newId);
            JSONObject addedEntry = new JSONObject().set("id", newId).set("type", type).set("position", position);
            if (result.getStr("container") != null) {
                addedEntry.set("container", result.getStr("container"))
                    .set("autoConnected", result.getStr("autoConnected"));
            }
            added.add(addedEntry);
            if (connect != null) {
                String from = connectFrom, to = resolveRef(connect.getStr("to"), refToId);
                if (from != null) connectWithValidation(sessionKey, from, newId, connect.getStr("fromPort"), warnings);
                if (to != null) connectWithValidation(sessionKey, newId, to, null, warnings);
            }
        }
        if (added.isEmpty()) return ToolResult.fail(new JSONObject()
            .set("error", "没有节点被添加").set("warnings", warnings).toString(), "add 失败");
        draftService.persistArtifact(sessionKey, "building", "node add " + added.size());
        draftService.emitDocument(ctx, sessionKey);
        return ToolResult.ok(new JSONObject().set("added", added).set("warnings", warnings).set("layout", "auto").toString(),
            "已添加 " + added.size() + " 个节点" + (warnings.isEmpty() ? "" : "（含 " + warnings.size() + " 条警告，逐条处理）"));
    }

    /** 构造归一化后的 data 副本并跑「契约 + 业务探针」双重校验；probeId 用真实节点 id，报错里不再出现占位符 */
    private static List<String> prospectiveIssues(String type, JSONObject item, String probeId) {
        JSONObject data = item.getJSONObject("data") != null
            ? new JSONObject(item.getJSONObject("data").toString()) : new JSONObject();
        if (!data.containsKey("title") && item.getStr("title") != null) {
            data.set("title", item.getStr("title"));
        }
        NodeDataNormalizer.normalize(type, data);
        List<String> issues = new ArrayList<>();
        if (NodeSchemaRegistry.hasSchema(type)) {
            for (String v : NodeSchemaRegistry.validateParams(type, data.toString())) issues.add("契约: " + v);
        }
        JSONObject probe = new JSONObject().set("id", probeId).set("type", type).set("data", data);
        issues.addAll(WorkflowDslCanonicalizer.businessFieldIssues(
            new JSONObject().set("nodes", new JSONArray().set(probe)).set("edges", new JSONArray())));
        return issues;
    }

    /** 空骨架只保留业务探针提示（「缺少 prompt：修复：…」），契约行对空 data 只是同一事实的重复 */
    private static List<String> businessOnly(List<String> issues) {
        List<String> business = new ArrayList<>();
        for (String issue : issues) {
            if (!issue.startsWith("契约: ")) business.add(issue);
        }
        return business.isEmpty() ? issues : business;
    }

    /** 显式空骨架：data 为空，或除 title 外所有值都是 null / 空串 / 空对象 / 空数组（模型常用 "" 占位） */
    private static boolean isSkeleton(JSONObject data) {
        if (data == null || data.isEmpty()) {
            return true;
        }
        for (String key : data.keySet()) {
            if ("title".equals(key)) {
                continue;
            }
            Object value = data.get(key);
            boolean blank = value == null
                || (value instanceof String && ((String) value).trim().isEmpty())
                || (value instanceof JSONObject && ((JSONObject) value).isEmpty())
                || (value instanceof JSONArray && ((JSONArray) value).isEmpty());
            if (!blank) {
                return false;
            }
        }
        return true;
    }

    /** 连线（add 的 connect 用）：确定性错误（端口不存在/自环/重复）当场拒绝该条连线并记录警告 */
    private void connectWithValidation(String sessionKey, String from, String to, String fromPort, JSONArray warnings) {
        List<String> issues = WorkflowDslCanonicalizer.edgeIssues(draftService.getOrCreate(sessionKey), from, to, fromPort);
        if (!issues.isEmpty()) {
            warnings.add("连线 " + from + " → " + to + " 未建立: " + String.join("; ", issues));
            return;
        }
        JSONObject cArgs = new JSONObject().set("from", from).set("to", to);
        if (fromPort != null) cArgs.set("fromPort", fromPort);
        draftService.connect(sessionKey, cArgs);
    }

    private ToolResult doUpdate(JSONObject args, AgentRunContext ctx) {
        String sessionKey = ctx.getSessionKey();
        String nodeId = args.getStr("nodeId");
        JSONObject patch = args.getJSONObject("data");
        if (nodeId == null || (patch == null && args.getStr("title") == null))
            return ToolResult.fail("{\"error\":\"需要 nodeId 与 data/title\"}", "参数不完整");
        JSONObject node = draftService.getNode(sessionKey, nodeId);
        if (node == null) return ToolResult.notFound("节点 " + nodeId);
        String type = node.getStr("type");
        // 校验顺序（2026-10-24 修正）：先深合并 + 归一化，再校验——
        // 否则 AI 的扁平简写（data.prompt）会被严格契约当成未知字段误拒
        JSONObject merged = node.getJSONObject("data") != null ? new JSONObject(node.getJSONObject("data").toString()) : new JSONObject();
        if (patch != null) deepMerge(merged, patch);
        if (args.getStr("title") != null) merged.set("title", args.getStr("title"));
        NodeDataNormalizer.normalize(type, merged);
        java.util.List<String> problems = new java.util.ArrayList<>();
        if (NodeSchemaRegistry.hasSchema(type))
            for (String v : NodeSchemaRegistry.validateParams(type, merged.toString())) problems.add("契约: " + v);
        JSONObject probe = new JSONObject().set("id", nodeId).set("type", type).set("data", merged);
        for (String issue : WorkflowDslCanonicalizer.businessFieldIssues(new JSONObject().set("nodes", new JSONArray().set(probe)).set("edges", new JSONArray())))
            problems.add(issue);
        // 引用当场校验（2026-10-25 D1）：S4 此前只在落版/执行时跑，AI 写入断裂引用
        // （引用不存在节点 / 模板引用未知节点）要到保存版本才暴露。「节点不存在」级
        // 属确定性错误，当场拒绝；「字段不在上游输出集」可能是上游尚未配置的时序问题，
        // 放行并随回执警告（落版时 S4 仍会硬拒）。
        java.util.List<String> refWarnings = new java.util.ArrayList<>();
        for (WorkflowDslValidator.Issue issue : WorkflowDslValidator.referenceIssues(prospectiveNodes(sessionKey, probe), nodeId)) {
            if ("DANGLING_REF_FIELD".equals(issue.getCode()) || "TEMPLATE_REF_FIELD".equals(issue.getCode())) {
                refWarnings.add(issue.getMessage());
            } else {
                problems.add("引用: " + issue.getMessage());
            }
        }
        if (!problems.isEmpty())
            return ToolResult.fail(new JSONObject().set("error", "更新被拒绝").set("issues", problems)
                .set("fixHint", "按 issues 逐项修正后重试（注意：不要自创字段，字段集见 get(target=knowledge) 的 paramSchema）").toString(), "更新被契约打回");
        JSONObject apply = new JSONObject().set("nodeId", nodeId);
        if (patch != null) apply.set("data", patch);
        if (args.getStr("title") != null) apply.set("title", args.getStr("title"));
        draftService.updateNode(sessionKey, apply);
        draftService.persistArtifact(sessionKey, "building", "update " + nodeId);
        draftService.emitDocument(ctx, sessionKey);
        return ToolResult.ok(new JSONObject().set("ok", true).set("nodeId", nodeId)
            .set("warnings", refWarnings)
            .set("hint", "run(target=node, nodeId) 单测 / run(target=workflow) 整流验证").toString(),
            "已更新 " + nodeId + (refWarnings.isEmpty() ? "" : "（含 " + refWarnings.size() + " 条引用警告，建议立即修正）"));
    }

    /** 全图节点列表 + 目标节点替换为归一化后的 prospective 数据（引用校验需要上游真实输出声明） */
    private JSONArray prospectiveNodes(String sessionKey, JSONObject probe) {
        JSONArray nodes = new JSONArray();
        JSONObject doc = draftService.get(sessionKey);
        if (doc != null && doc.getJSONArray("nodes") != null) {
            for (Object n : doc.getJSONArray("nodes")) {
                JSONObject item = (JSONObject) n;
                if (probe.getStr("id").equals(item.getStr("id"))) {
                    continue;
                }
                nodes.set(item);
            }
        }
        nodes.set(probe);
        return nodes;
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

    private static java.util.List<String> sortedSupportedTypes() {
        java.util.List<String> types = new java.util.ArrayList<>(WorkflowDslCanonicalizer.supportedTypes());
        java.util.Collections.sort(types);
        return types;
    }

    private static String resolveRef(String raw, java.util.Map<String, String> refs) {
        if (raw == null) return null;
        return raw.startsWith("$") ? refs.get(raw.substring(1)) : raw;
    }
}
