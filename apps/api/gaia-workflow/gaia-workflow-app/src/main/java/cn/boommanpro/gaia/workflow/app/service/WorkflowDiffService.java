package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * 工作流版本 diff 计算。
 *
 * <p>节点按 id 对齐：新增/删除/变更（data 或 title 变了算变更，坐标变更不计——
 * 自动布局会大面积改坐标，算变更会产生噪声）。边按 source→target(→port) 键对齐。</p>
 */
@Service
public class WorkflowDiffService {

    /**
     * 计算两份 DSL 的差异。
     *
     * @param previous 上一版本的 workflowData JSON（首版传 null）
     * @param current  当前版本的 workflowData JSON
     * @return {nodes:{added,removed,changed}, edges:{added,removed}}；id 列表
     */
    public JSONObject diff(String previous, String current) {
        JSONObject result = new JSONObject()
            .set("nodes", new JSONObject()
                .set("added", new JSONArray())
                .set("removed", new JSONArray())
                .set("changed", new JSONArray()))
            .set("edges", new JSONObject()
                .set("added", new JSONArray())
                .set("removed", new JSONArray()));

        JSONObject prevNodes = nodesOf(previous);
        JSONObject currNodes = nodesOf(current);

        Set<String> added = new LinkedHashSet<>(currNodes.keySet());
        added.removeAll(prevNodes.keySet());
        Set<String> removed = new LinkedHashSet<>(prevNodes.keySet());
        removed.removeAll(currNodes.keySet());

        JSONArray changed = result.getJSONObject("nodes").getJSONArray("changed");
        for (String id : currNodes.keySet()) {
            if (!prevNodes.containsKey(id)) {
                continue;
            }
            if (nodeContentChanged(prevNodes.getJSONObject(id), currNodes.getJSONObject(id))) {
                changed.add(id);
            }
        }
        fill(result.getJSONObject("nodes").getJSONArray("added"), added);
        fill(result.getJSONObject("nodes").getJSONArray("removed"), removed);

        Set<String> prevEdges = edgesOf(previous);
        Set<String> currEdges = edgesOf(current);
        Set<String> edgesAdded = new LinkedHashSet<>(currEdges);
        edgesAdded.removeAll(prevEdges);
        Set<String> edgesRemoved = new LinkedHashSet<>(prevEdges);
        edgesRemoved.removeAll(currEdges);
        fill(result.getJSONObject("edges").getJSONArray("added"), edgesAdded);
        fill(result.getJSONObject("edges").getJSONArray("removed"), edgesRemoved);
        return result;
    }

    /** 变更摘要（一行人类可读，用于版本列表） */
    public String summarize(JSONObject diff) {
        if (diff == null) {
            return "";
        }
        JSONObject nodes = diff.getJSONObject("nodes");
        JSONObject edges = diff.getJSONObject("edges");
        int added = nodes.getJSONArray("added") != null ? nodes.getJSONArray("added").size() : 0;
        int removed = nodes.getJSONArray("removed") != null ? nodes.getJSONArray("removed").size() : 0;
        int changed = nodes.getJSONArray("changed") != null ? nodes.getJSONArray("changed").size() : 0;
        int eAdded = edges.getJSONArray("added") != null ? edges.getJSONArray("added").size() : 0;
        int eRemoved = edges.getJSONArray("removed") != null ? edges.getJSONArray("removed").size() : 0;
        StringBuilder sb = new StringBuilder();
        if (added > 0) {
            sb.append("+").append(added).append("节点 ");
        }
        if (changed > 0) {
            sb.append("~").append(changed).append("节点 ");
        }
        if (removed > 0) {
            sb.append("-").append(removed).append("节点 ");
        }
        if (eAdded > 0) {
            sb.append("+").append(eAdded).append("连线 ");
        }
        if (eRemoved > 0) {
            sb.append("-").append(eRemoved).append("连线 ");
        }
        return sb.toString().trim();
    }

    /** 是否为无实质变更（自动布局外的任何结构/数据都没动） */
    public boolean isEmpty(JSONObject diff) {
        return summarize(diff).isEmpty();
    }

    // ---------------- 内部 ----------------

    private JSONObject nodesOf(String dsl) {
        JSONObject byId = new JSONObject();
        if (dsl == null || dsl.trim().isEmpty()) {
            return byId;
        }
        try {
            JSONArray nodes = JSONUtil.parseObj(dsl).getJSONArray("nodes");
            if (nodes == null) {
                return byId;
            }
            for (int i = 0; i < nodes.size(); i++) {
                JSONObject node = nodes.getJSONObject(i);
                if (node != null && node.getStr("id") != null) {
                    byId.set(node.getStr("id"), node);
                }
            }
        } catch (Exception ignore) {
            // 不可解析按空处理
        }
        return byId;
    }

    private Set<String> edgesOf(String dsl) {
        Set<String> edges = new LinkedHashSet<>();
        if (dsl == null || dsl.trim().isEmpty()) {
            return edges;
        }
        try {
            JSONArray arr = JSONUtil.parseObj(dsl).getJSONArray("edges");
            if (arr == null) {
                return edges;
            }
            for (int i = 0; i < arr.size(); i++) {
                JSONObject edge = arr.getJSONObject(i);
                if (edge == null) {
                    continue;
                }
                edges.add(edgeKey(edge));
            }
        } catch (Exception ignore) {
            // 不可解析按空处理
        }
        return edges;
    }

    private String edgeKey(JSONObject edge) {
        String from = edge.containsKey("sourceNodeID") ? edge.getStr("sourceNodeID") : edge.getStr("from");
        String to = edge.containsKey("targetNodeID") ? edge.getStr("targetNodeID") : edge.getStr("to");
        String port = edge.getStr("sourcePortID") != null ? edge.getStr("sourcePortID") : edge.getStr("fromPort");
        return from + "→" + to + (port != null ? "@" + port : "");
    }

    private boolean nodeContentChanged(JSONObject a, JSONObject b) {
        return !semanticNodeJson(a).equals(semanticNodeJson(b));
    }

    /** 剥掉坐标后的节点语义 JSON（坐标变更不算 diff） */
    private String semanticNodeJson(JSONObject node) {
        JSONObject copy = new JSONObject(node.toString());
        JSONObject meta = copy.getJSONObject("meta");
        if (meta != null) {
            meta.remove("position");
        }
        return copy.toString();
    }

    private void fill(JSONArray target, Set<String> ids) {
        for (String id : ids) {
            target.add(id);
        }
    }
}
