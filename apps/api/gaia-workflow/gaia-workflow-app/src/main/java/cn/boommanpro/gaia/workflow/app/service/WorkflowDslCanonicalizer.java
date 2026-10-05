package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 工作流 DSL 规范化器 —— 落版前的最后一道关口。
 *
 * <p>模型产出 DSL 时经常会「偷懒」，直接把这些写进库会让下游（画布、执行引擎）崩掉：</p>
 * <ul>
 *   <li>连线写成 {@code {from, to}} 而不是 {@code {sourceNodeID, targetNodeID}}</li>
 *   <li>节点不带 {@code meta.position}，画布上全部叠在原点</li>
 *   <li>业务字段散在节点顶层，没有收进 {@code data}</li>
 *   <li>缺 start / 多 start / 没有 end，导致工作流结构非法</li>
 *   <li>连线指向不存在的节点、自环、重复边</li>
 * </ul>
 *
 * <p>容错优先：能修的一律修好并记录「修补说明」回传给模型，而不是直接拒绝落版。
 * 这样 AI 下一轮就能知道系统替它做了什么。</p>
 */
public final class WorkflowDslCanonicalizer {

    /** 与前端 node-templates 保持一致的受支持节点类型 */
    private static final Set<String> SUPPORTED_TYPES = new HashSet<>(Arrays.asList(
        "start", "end", "llm", "code", "http", "condition", "multi-condition",
        "branches", "loop", "variable", "string-format", "assignee", "comment"));

    /** 不属于业务数据的节点保留键 */
    private static final Set<String> RESERVED_NODE_KEYS = new HashSet<>(Arrays.asList(
        "id", "type", "data", "meta", "position", "title", "parentId", "blocks"));

    private static final int X_BASE = 180;
    private static final int X_STEP = 320;
    private static final int Y_BASE = 180;
    private static final int Y_STEP = 200;

    private WorkflowDslCanonicalizer() {
    }

    /** 规范化结果 */
    public static final class Result {
        private final String json;
        private final List<String> repairs;
        private final int nodeCount;

        Result(String json, List<String> repairs, int nodeCount) {
            this.json = json;
            this.repairs = repairs;
            this.nodeCount = nodeCount;
        }

        public String getJson() {
            return json;
        }

        public List<String> getRepairs() {
            return repairs;
        }

        public int getNodeCount() {
            return nodeCount;
        }

        public boolean isChanged() {
            return !repairs.isEmpty();
        }
    }

    /**
     * 把任意宽松 DSL 规范化为可安全落库的结构。
     *
     * @param rawJson DSL 的 JSON 文本
     * @return 规范化结果；输入非法时 json 为 null
     */
    public static Result canonicalize(String rawJson) {
        List<String> repairs = new ArrayList<>();
        if (rawJson == null || rawJson.trim().isEmpty()) {
            return new Result(null, repairs, 0);
        }

        JSONObject root;
        JSONArray rawNodes;
        JSONArray rawEdges;
        Object globalVariable = null;
        try {
            Object parsed = JSONUtil.parse(rawJson.trim());
            if (parsed instanceof JSONArray) {
                // 模型偶尔直接吐一个节点数组
                rawNodes = (JSONArray) parsed;
                rawEdges = new JSONArray();
                root = new JSONObject();
                repairs.add("输入是节点数组而不是 {nodes, edges} 对象，已按此包装");
            } else if (parsed instanceof JSONObject) {
                root = (JSONObject) parsed;
                rawNodes = firstArray(root, "nodes", "nodeList", "steps");
                rawEdges = firstArray(root, "edges", "lines", "connections");
                globalVariable = root.get("globalVariable");
                if (rawNodes == null && root.get("steps") != null) {
                    rawNodes = firstArray(root, "steps");
                }
            } else {
                return new Result(null, repairs, 0);
            }
        } catch (Exception e) {
            return new Result(null, repairs, 0);
        }
        if (rawNodes == null) {
            rawNodes = new JSONArray();
        }
        if (rawEdges == null) {
            rawEdges = new JSONArray();
        }
        if (rawNodes.isEmpty()) {
            repairs.add("未找到任何节点");
            return new Result(null, repairs, 0);
        }

        // ---------- 节点 ----------
        List<JSONObject> nodes = new ArrayList<>();
        Set<String> usedIds = new HashSet<>();
        boolean hasStart = false;
        boolean hasEnd = false;

        for (int i = 0; i < rawNodes.size(); i++) {
            Object item = rawNodes.get(i);
            if (!(item instanceof JSONObject)) {
                repairs.add("第 " + (i + 1) + " 个节点不是对象，已跳过");
                continue;
            }
            JSONObject raw = (JSONObject) item;

            String type = trimToNull(raw.getStr("type"));
            if (type == null) {
                type = "variable";
                repairs.add("第 " + (i + 1) + " 个节点缺少 type，已按 variable 处理");
            }
            type = type.toLowerCase();
            if (!SUPPORTED_TYPES.contains(type)) {
                repairs.add("节点类型 \"" + type + "\" 不受支持，已降级为 variable");
                type = "variable";
            }

            // start / end 必须唯一，多余的降级，避免结构非法
            if ("start".equals(type) && hasStart) {
                repairs.add("出现多个 start 节点，多余的已降级为 variable");
                type = "variable";
            }
            if ("end".equals(type) && hasEnd) {
                repairs.add("出现多个 end 节点，多余的已降级为 variable");
                type = "variable";
            }

            String id = trimToNull(raw.getStr("id"));
            if (id == null) {
                id = type + "_auto" + (i + 1);
                repairs.add("第 " + (i + 1) + " 个节点缺少 id，已生成 \"" + id + "\"");
            }
            if (usedIds.contains(id)) {
                String newId = id + "_dup" + (i + 1);
                repairs.add("节点 id \"" + id + "\" 重复，已重命名为 \"" + newId + "\"");
                id = newId;
            }
            usedIds.add(id);

            // 业务数据：data 为主，节点顶层的散落字段合并进去
            JSONObject data = raw.getJSONObject("data");
            JSONObject mergedData = data != null ? new JSONObject(data.toString()) : new JSONObject();
            boolean hasFlatFields = false;
            for (String key : raw.keySet()) {
                if (RESERVED_NODE_KEYS.contains(key)) {
                    continue;
                }
                hasFlatFields = true;
                if (!mergedData.containsKey(key)) {
                    mergedData.set(key, raw.get(key));
                }
            }
            if (hasFlatFields && data == null) {
                repairs.add("节点 \"" + id + "\" 的业务字段散在顶层，已收拢进 data");
            }
            // 标题双写：data.title 是画布读取的位置
            if (!mergedData.containsKey("title")) {
                String title = trimToNull(raw.getStr("title"));
                if (title != null) {
                    mergedData.set("title", title);
                }
            }

            // 扁平字段 → inputsValues（llm/http/start/end 等），保证落库后节点可直接执行
            NodeDataNormalizer.normalize(type, mergedData);

            // meta：保留原 meta 的其他字段，只补 position
            JSONObject meta = raw.getJSONObject("meta");
            JSONObject mergedMeta = meta != null ? new JSONObject(meta.toString()) : new JSONObject();
            JSONObject position = mergedMeta.getJSONObject("position");
            if (position == null) {
                position = raw.getJSONObject("position");
                if (position != null) {
                    repairs.add("节点 \"" + id + "\" 的 position 写在顶层，已移入 meta");
                }
            }
            if (position != null) {
                mergedMeta.set("position", position);
            }

            JSONObject node = new JSONObject();
            node.set("id", id);
            node.set("type", type);
            node.set("data", mergedData);
            node.set("meta", mergedMeta);
            if (raw.get("blocks") != null) {
                node.set("blocks", raw.get("blocks"));
            }
            if (raw.get("parentId") != null) {
                node.set("parentId", raw.get("parentId"));
            }
            nodes.add(node);

            if ("start".equals(type)) {
                hasStart = true;
            }
            if ("end".equals(type)) {
                hasEnd = true;
            }
        }

        if (nodes.isEmpty()) {
            repairs.add("没有任何结构合法的节点");
            return new Result(null, repairs, 0);
        }

        Map<String, JSONObject> byId = new LinkedHashMap<>();
        for (JSONObject n : nodes) {
            byId.put(n.getStr("id"), n);
        }

        // ---------- 连线 ----------
        List<JSONObject> edges = new ArrayList<>();
        Set<String> seenEdges = new HashSet<>();
        for (int i = 0; i < rawEdges.size(); i++) {
            Object item = rawEdges.get(i);
            if (!(item instanceof JSONObject)) {
                continue;
            }
            JSONObject raw = (JSONObject) item;
            String source = firstNonEmpty(raw.getStr("sourceNodeID"), raw.getStr("source"),
                raw.getStr("from"), raw.getStr("sourceId"), raw.getStr("fromNodeID"));
            String target = firstNonEmpty(raw.getStr("targetNodeID"), raw.getStr("target"),
                raw.getStr("to"), raw.getStr("targetId"), raw.getStr("toNodeID"));
            if (source == null || target == null) {
                repairs.add("存在缺少起止节点的连线，已跳过");
                continue;
            }
            if (!byId.containsKey(source) || !byId.containsKey(target)) {
                repairs.add("连线 " + source + " → " + target + " 指向不存在的节点，已跳过");
                continue;
            }
            if (source.equals(target)) {
                repairs.add("节点 " + source + " 存在自环连线，已跳过");
                continue;
            }
            String key = source + "->" + target;
            if (!seenEdges.add(key)) {
                repairs.add("连线 " + key + " 重复，已去重");
                continue;
            }
            String sourcePort = firstNonEmpty(raw.getStr("sourcePortID"), raw.getStr("sourcePort"),
                raw.getStr("fromPort"));
            String targetPort = firstNonEmpty(raw.getStr("targetPortID"), raw.getStr("targetPort"),
                raw.getStr("toPort"));

            JSONObject edge = new JSONObject();
            edge.set("sourceNodeID", source);
            edge.set("targetNodeID", target);
            if (sourcePort != null) {
                edge.set("sourcePortID", sourcePort);
            }
            if (targetPort != null) {
                edge.set("targetPortID", targetPort);
            }
            edges.add(edge);
            if ("from".equals((Object) raw.getStr("from")) || raw.containsKey("from")) {
                // 记录一次别名修补，避免重复刷屏
                if (!repairs.contains("连线使用了 from/to 简写，已规范化为 sourceNodeID/targetNodeID")) {
                    repairs.add("连线使用了 from/to 简写，已规范化为 sourceNodeID/targetNodeID");
                }
            }
        }

        // ---------- 补齐 start / end ----------
        if (!hasStart) {
            JSONObject start = new JSONObject();
            start.set("id", uniqueId(byId.keySet(), "start_auto"));
            start.set("type", "start");
            start.set("data", new JSONObject().set("title", "开始"));
            start.set("meta", new JSONObject());
            String head = findRoot(byId, edges);
            nodes.add(0, start);
            byId.put(start.getStr("id"), start);
            if (head != null) {
                edges.add(0, simpleEdge(start.getStr("id"), head));
            }
            repairs.add("缺少 start 节点，已自动补齐并接入主链");
        }
        if (!hasEnd) {
            JSONObject end = new JSONObject();
            end.set("id", uniqueId(byId.keySet(), "end_auto"));
            end.set("type", "end");
            end.set("data", new JSONObject().set("title", "结束"));
            end.set("meta", new JSONObject());
            String tail = findTail(byId, edges);
            nodes.add(end);
            byId.put(end.getStr("id"), end);
            if (tail != null) {
                edges.add(simpleEdge(tail, end.getStr("id")));
            }
            repairs.add("缺少 end 节点，已自动补齐并接入主链");
        }

        // ---------- 坐标 ----------
        boolean missingPosition = false;
        for (JSONObject n : nodes) {
            JSONObject meta = n.getJSONObject("meta");
            if (meta == null || meta.getJSONObject("position") == null) {
                missingPosition = true;
                break;
            }
        }
        if (missingPosition) {
            autoLayout(nodes, edges);
            repairs.add("部分节点缺少坐标，已自动分层布局");
        }

        // ---------- 输出 ----------
        JSONArray outNodes = new JSONArray();
        for (JSONObject n : nodes) {
            outNodes.add(n);
        }
        JSONArray outEdges = new JSONArray();
        for (JSONObject e : edges) {
            outEdges.add(e);
        }
        JSONObject out = new JSONObject();
        out.set("nodes", outNodes);
        out.set("edges", outEdges);
        if (globalVariable != null) {
            out.set("globalVariable", globalVariable);
        }
        return new Result(out.toString(), repairs, nodes.size());
    }

    /**
     * 对已规范化的文档执行自动分层布局（为缺失坐标的节点补位）。
     * 供服务端画布草稿的 autoLayout 操作复用。
     *
     * @param doc 含 nodes / edges 的文档对象
     */
    public static void applyLayout(JSONObject doc) {
        if (doc == null) {
            return;
        }
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes == null) {
            return;
        }
        List<JSONObject> nodeList = new ArrayList<>();
        for (int i = 0; i < nodes.size(); i++) {
            nodeList.add(nodes.getJSONObject(i));
        }
        JSONArray edges = doc.getJSONArray("edges");
        List<JSONObject> edgeList = new ArrayList<>();
        if (edges != null) {
            for (int i = 0; i < edges.size(); i++) {
                edgeList.add(edges.getJSONObject(i));
            }
        }
        autoLayout(nodeList, edgeList);
    }

    /** 分层布局：按 BFS 深度定 x，同层依次错开 y，避免节点重叠 */
    private static void autoLayout(List<JSONObject> nodes, List<JSONObject> edges) {
        Map<String, List<String>> outgoing = new HashMap<>();
        Map<String, Integer> indegree = new HashMap<>();
        for (JSONObject n : nodes) {
            indegree.put(n.getStr("id"), 0);
        }
        for (JSONObject e : edges) {
            String s = e.getStr("sourceNodeID");
            String t = e.getStr("targetNodeID");
            outgoing.computeIfAbsent(s, k -> new ArrayList<>()).add(t);
            indegree.merge(t, 1, Integer::sum);
        }

        Map<String, Integer> depth = new HashMap<>();
        Deque<String> queue = new ArrayDeque<>();
        for (JSONObject n : nodes) {
            String id = n.getStr("id");
            String type = n.getStr("type");
            // 起点优先从 start / 入度为 0 的节点出发
            if ("start".equals(type) || indegree.getOrDefault(id, 0) == 0) {
                if (!depth.containsKey(id)) {
                    depth.put(id, 0);
                    queue.add(id);
                }
            }
        }
        if (queue.isEmpty() && !nodes.isEmpty()) {
            depth.put(nodes.get(0).getStr("id"), 0);
            queue.add(nodes.get(0).getStr("id"));
        }

        int guard = 0;
        while (!queue.isEmpty() && guard++ < nodes.size() * 8) {
            String current = queue.poll();
            int d = depth.get(current);
            for (String next : outgoing.getOrDefault(current, new ArrayList<>())) {
                int candidate = d + 1;
                Integer existing = depth.get(next);
                if (existing == null || existing < candidate) {
                    depth.put(next, candidate);
                    queue.add(next);
                }
            }
        }
        // 环或孤立节点兜底
        for (JSONObject n : nodes) {
            depth.putIfAbsent(n.getStr("id"), 0);
        }

        Map<Integer, Integer> layerCursor = new HashMap<>();
        for (JSONObject n : nodes) {
            int d = depth.get(n.getStr("id"));
            int indexInLayer = layerCursor.merge(d, 1, Integer::sum) - 1;
            JSONObject meta = n.getJSONObject("meta");
            if (meta == null) {
                meta = new JSONObject();
                n.set("meta", meta);
            }
            if (meta.getJSONObject("position") == null) {
                meta.set("position", new JSONObject()
                    .set("x", X_BASE + d * X_STEP)
                    .set("y", Y_BASE + indexInLayer * Y_STEP));
            }
        }
    }

    private static String findRoot(Map<String, JSONObject> byId, List<JSONObject> edges) {
        Set<String> targets = new HashSet<>();
        for (JSONObject e : edges) {
            targets.add(e.getStr("targetNodeID"));
        }
        for (String id : byId.keySet()) {
            if (!targets.contains(id) && !"end".equals(byId.get(id).getStr("type"))) {
                return id;
            }
        }
        return null;
    }

    private static String findTail(Map<String, JSONObject> byId, List<JSONObject> edges) {
        Set<String> sources = new HashSet<>();
        for (JSONObject e : edges) {
            sources.add(e.getStr("sourceNodeID"));
        }
        String tail = null;
        for (String id : byId.keySet()) {
            if (!sources.contains(id) && !"start".equals(byId.get(id).getStr("type"))) {
                tail = id;
            }
        }
        return tail;
    }

    private static JSONObject simpleEdge(String from, String to) {
        return new JSONObject().set("sourceNodeID", from).set("targetNodeID", to);
    }

    private static String uniqueId(Set<String> used, String base) {
        if (!used.contains(base)) {
            return base;
        }
        int i = 2;
        while (used.contains(base + "_" + i)) {
            i++;
        }
        return base + "_" + i;
    }

    private static JSONArray firstArray(JSONObject obj, String... keys) {
        for (String key : keys) {
            Object value = obj.get(key);
            if (value instanceof JSONArray) {
                return (JSONArray) value;
            }
        }
        return null;
    }

    private static String firstNonEmpty(String... values) {
        for (String v : values) {
            String t = trimToNull(v);
            if (t != null) {
                return t;
            }
        }
        return null;
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
