package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;

import java.util.ArrayDeque;
import java.util.Collections;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
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

    /** 与前端 node-templates 保持一致的受支持节点类型。
     *  注意：multi-condition 不在其中 —— 运行时没有它的解析器（NodeTypeEnum/ChainParser 均无），
     *  出现即 fatal 打回（2026-10-16 起不再静默降级 variable）；多条件互斥分支用 branches，
     *  单条件用 condition。assignee 是画布标注节点（无执行语义），2026-10-16 起移出 agent
     *  可建清单（存量文档仍保留不执行）；note/group 同理不在 agent 可建清单。 */
    private static final Set<String> SUPPORTED_TYPES = new HashSet<>(Arrays.asList(
        "start", "end", "llm", "code", "http", "condition",
        "branches", "loop", "variable", "string-format", "comment"));

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
    /** 供工具链做 op 级类型校验（node add 的类型枚举检查） */
    public static boolean isSupportedType(String type) {
        return type != null && SUPPORTED_TYPES.contains(type);
    }

    /** 受支持节点类型清单（提示词目录 / 校验错误指引用） */
    public static Set<String> supportedTypes() {
        return Collections.unmodifiableSet(SUPPORTED_TYPES);
    }

    public static final class Result {
        private final String json;
        private final List<String> repairs;
        private final List<String> fatalIssues;
        private final List<String> warnings;
        private final int nodeCount;

        Result(String json, List<String> repairs, int nodeCount) {
            this(json, repairs, new ArrayList<>(), new ArrayList<>(), nodeCount);
        }

        Result(String json, List<String> repairs, List<String> fatalIssues, List<String> warnings, int nodeCount) {
            this.json = json;
            this.repairs = repairs;
            this.fatalIssues = fatalIssues;
            this.warnings = warnings;
            this.nodeCount = nodeCount;
        }

        public String getJson() {
            return json;
        }

        public List<String> getRepairs() {
            return repairs;
        }

        /** 致命语义缺失：节点缺了业务必需字段，落库也跑不起来（llm 无 prompt、http 无 url 等） */
        public List<String> getFatalIssues() {
            return fatalIssues;
        }

        /** 非致命告警：能落版但很可能不是用户想要的（start 无输出、end 无映射等） */
        public List<String> getWarnings() {
            return warnings;
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
        return canonicalize(rawJson, null);
    }

    /**
     * 规范化并可选地为 LLM 节点填充平台默认模型配置。
     *
     * <p>工作流运行时（LlmNode）只认节点级 apiKey/apiHost/modelName，没有平台兜底；
     * 模型产出 DSL 时又经常不带这些凭证。落版时把平台 llm_config 填进去，
     * 让「用户不贴 API Key」成为默认体验，同时保留节点级显式配置的优先级。</p>
     *
     * @param rawJson DSL 的 JSON 文本
     * @param llmDefaults 平台默认模型配置；null 表示不填充（保持调用方原语义）
     * @return 规范化结果；输入非法时 json 为 null
     */
    public static Result canonicalize(String rawJson, LlmDefaults llmDefaults) {
        List<String> repairs = new ArrayList<>();
        List<String> fatalIssues = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        if (rawJson == null || rawJson.trim().isEmpty()) {
            return new Result(null, repairs, fatalIssues, warnings, 0);
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
                return new Result(null, repairs, fatalIssues, warnings, 0);
            }
        } catch (Exception e) {
            return new Result(null, repairs, fatalIssues, warnings, 0);
        }
        if (rawNodes == null) {
            rawNodes = new JSONArray();
        }
        if (rawEdges == null) {
            rawEdges = new JSONArray();
        }
        if (rawNodes.isEmpty()) {
            repairs.add("未找到任何节点");
            return new Result(null, repairs, fatalIssues, warnings, 0);
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
                if (cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum.notParse(type)) {
                    // 画布标注类节点（note/group/comment/assignee）：引擎 parse 阶段本就跳过，
                    // 保留原样落库，让「画布导出 → apply 落版」通道可用
                    repairs.add("节点 \"" + raw.getStr("id") + "\" 类型 \"" + type
                        + "\" 为画布标注类节点，保留不执行");
                } else {
                    // 2026-10-16 起：未知类型不再静默降级 variable——降级改语义且把失败
                    // 推迟到运行期（旁路入库时更是 NPE 全崩）。这里显式 fatal 打回。
                    fatalIssues.add("节点类型 \"" + type + "\" 不受支持：运行时没有它的解析器（执行必然失败）。"
                        + "多条件互斥分支用 branches，单条件用 condition");
                    continue;
                }
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
            int llmFilled = fillLlmDefaults(type, mergedData, llmDefaults);
            NodeDataNormalizer.normalize(type, mergedData);
            if (llmFilled > 0) {
                repairs.add("节点 \"" + id + "\"（LLM）缺少模型配置，已自动填入平台默认模型（"
                    + llmFilled + " 项），用户无需手动提供 API Key");
            }
            // 注意：prompt/url/script 不做占位填充 —— 占位值会让落版校验打不中 fatal、
            // 把失败推迟到运行期（2026-10-11 实证：空 url 节点 save 放行、run 报
            // 「HTTP节点缺少有效的 api 配置」）。缺业务字段就在落版/试运行时 fatal，
            // 错误里带可直接抄的修复 JSON（见 checkNodeSemantics）。

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
            return new Result(null, repairs, fatalIssues, warnings, 0);
        }

        // ---------- 语义完整性检查 ----------
        // 结构修好了不代表能跑：llm 没有 prompt、http 没有 url 这类「空壳节点」
        // 落库后执行必然失败或产出无意义结果，必须在落版前拦下并回传给模型补全。
        checkNodeSemantics(nodes, fatalIssues, warnings);

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
            String sourcePort = firstNonEmpty(raw.getStr("sourcePortID"), raw.getStr("sourcePort"),
                raw.getStr("fromPort"));
            // 去重键必须含端口：condition/branches 同一 source→target 的 if/else 双边是合法结构，
            // 只按端点判重会把 else 边静默丢弃（2026-10-17 E2E 实证：反例路径整体 canceled）
            String key = source + "->" + target + (sourcePort != null ? "[" + sourcePort + "]" : "");
            if (!seenEdges.add(key)) {
                repairs.add("连线 " + key + " 重复，已去重");
                continue;
            }
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

        // 连线端口检查（2026-10-11 实证：fromPort 猜成 true/false 时引擎 SpEL
        // memory["节点.端口"] 永远取不到值，下游全 canceled 却报 succeed），
        // 静态比对 key 集合毫秒级打回，edit/save/write/run 预检全层复用。
        checkEdgePorts(nodes, edges, fatalIssues, warnings);

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
        // schema 契约版本标记：后续契约演进（改形状/迁移）靠它识别存量数据
        out.set("schemaVersion", 1);
        if (globalVariable != null) {
            out.set("globalVariable", globalVariable);
        }
        return new Result(out.toString(), repairs, fatalIssues, warnings, nodes.size());
    }

    /**
     * 连线端口合法性检查：condition/branches 的出边 fromPort 必须命中真实存在的分支端口，
     * 否则引擎的 SpEL 匹配（memory["节点ID.端口"]）永远取不到值，下游节点全部 canceled
     * 而运行状态仍是 succeed —— 静态比对毫秒级打回，错误文案带可直接抄的修复 JSON。
     */
    private static void checkEdgePorts(List<JSONObject> nodes, List<JSONObject> edges,
                                           List<String> fatalIssues, List<String> warnings) {
        if (edges == null || edges.isEmpty()) {
            return;
        }
        Map<String, JSONObject> byId = new LinkedHashMap<>();
        for (JSONObject n : nodes) {
            byId.put(n.getStr("id"), n);
        }
        // 每个 condition/branches 节点的合法端口集合（key/分支id + else），同一节点只报一次
        Map<String, Set<String>> legalPorts = new LinkedHashMap<>();
        for (JSONObject n : nodes) {
            String type = n.getStr("type");
            JSONObject data = n.getJSONObject("data");
            if (data == null) {
                continue;
            }
            Set<String> ports = null;
            if ("condition".equals(type) || "multi-condition".equals(type)) {
                JSONArray conditions = data.getJSONArray("conditions");
                if (conditions != null && !conditions.isEmpty()) {
                    ports = new LinkedHashSet<>();
                    for (int i = 0; i < conditions.size(); i++) {
                        JSONObject c = conditions.getJSONObject(i);
                        if (c != null && c.getStr("key") != null && !c.getStr("key").trim().isEmpty()) {
                            ports.add(c.getStr("key").trim());
                        }
                    }
                }
            } else if ("branches".equals(type)) {
                JSONArray branches = data.getJSONArray("branches");
                if (branches != null && !branches.isEmpty()) {
                    ports = new LinkedHashSet<>();
                    for (int i = 0; i < branches.size(); i++) {
                        JSONObject b = branches.getJSONObject(i);
                        if (b != null && b.getStr("id") != null && !b.getStr("id").trim().isEmpty()) {
                            ports.add(b.getStr("id").trim());
                        }
                    }
                }
            }
            if (ports != null && !ports.isEmpty()) {
                ports.add("else");
                legalPorts.put(n.getStr("id"), ports);
            }
        }
        if (legalPorts.isEmpty()) {
            return;
        }
        Set<String> reportedSources = new LinkedHashSet<>();
        for (JSONObject e : edges) {
            String port = e.getStr("sourcePortID");
            if (port == null || port.trim().isEmpty()) {
                continue;
            }
            String source = e.getStr("sourceNodeID");
            Set<String> legal = legalPorts.get(source);
            if (legal == null || legal.contains(port.trim())) {
                continue;
            }
            JSONObject sourceNode = byId.get(source);
            String sourceType = sourceNode == null ? "" : sourceNode.getStr("type");
            if (reportedSources.add(source + "#" + port)) {
                boolean isBranches = "branches".equals(sourceType);
                String portField = isBranches ? "branches[].id" : "conditions[].key";
                String fixPort = String.join("|", legal);
                fatalIssues.add("连线 " + source + " →[fromPort=" + port + "]→ " + e.getStr("targetNodeID")
                    + " 的端口 \"" + port + "\" 不存在：" + sourceType + " 节点的出边 fromPort 必须用 "
                    + portField + "（本节点可用: " + String.join(" / ", legal) + "），"
                    + "不能用 true/false 这类猜测值——端口匹配不到时该分支的下游节点不会执行。"
                    + "修复：先 edge 传 {\"action\":\"remove\",\"from\":\"" + source + "\",\"to\":\""
                    + e.getStr("targetNodeID") + "\"}，再 edge 传 {\"action\":\"connect\",\"from\":\"" + source + "\",\"to\":\""
                    + e.getStr("targetNodeID") + "\",\"fromPort\":\"" + fixPort.split("\\|", 2)[0] + "\"}"
                    + "（多条分支出边逐条改）");
            }
        }
        // condition/branches 没有任何出边时引擎不筛分支、下游全部照跑，条件等于白配
        // （2026-10-11 二轮实证：模型 removeEdges 删掉非法边后忘记重建，分支语义整体丢失）。
        // 分支端口显式化：每个 key 都要有出边，且必须连 else 兜底 —— 否则未命中场景依赖
        // 引擎 fallback（未命中全跑下游），false 语义静默出错（2026-10-11 用户实测：
        // 只连 if_match 一条边，false 场景 end canceled 报"没有结束节点执行过"）。
        for (Map.Entry<String, Set<String>> entry : legalPorts.entrySet()) {
            String nodeId = entry.getKey();
            boolean isBranches = "branches".equals(byId.get(nodeId) == null ? "" : byId.get(nodeId).getStr("type"));
            Set<String> connectedPorts = new LinkedHashSet<>();
            boolean hasOutgoing = false;
            for (JSONObject e : edges) {
                if (nodeId.equals(e.getStr("sourceNodeID"))) {
                    hasOutgoing = true;
                    String p = e.getStr("sourcePortID");
                    connectedPorts.add(p == null || p.trim().isEmpty() ? "" : p.trim());
                }
            }
            if (!hasOutgoing) {
                if (reportedSources.add(nodeId + "#no-edge")) {
                    fatalIssues.add("节点 " + nodeId + "（条件/分支）没有任何出边：分支后的路径没有接到任何节点，"
                        + "下游会全部照跑、条件等于没配。"
                        + "修复：edge 传 {\"action\":\"connect\",\"from\":\"" + nodeId + "\",\"to\":\"<下游节点id>\","
                        + "\"fromPort\":\"" + String.join("|", entry.getValue()) + "\"}（每个 key/else 至少一条出边）");
                }
                continue;
            }
            // 每个声明的 key 都应连边（否则该场景静默不执行）
            for (String port : entry.getValue()) {
                if ("else".equals(port)) {
                    continue;
                }
                if (!connectedPorts.contains(port) && reportedSources.add(nodeId + "#missing-" + port)) {
                    fatalIssues.add("节点 " + nodeId + " 的分支端口 \"" + port + "\" 没有连线："
                        + "命中该条件时下游不会执行、结果为空。"
                        + "修复：edge 传 {\"action\":\"connect\",\"from\":\"" + nodeId + "\",\"to\":\"<下游节点id>\","
                        + "\"fromPort\":\"" + port + "\"}");
                }
            }
            // 缺 else 降为 warning（2026-10-11 落地校准）：引擎在「无端口命中」时 fallback 全跑下游，
            // 单边 if_match 结构 + end ref 条件 key 在两个方向上都是功能正确的（E2E 双向实证）。
            // 显式 else 边结构更清晰，但不强制 —— 用警告提示而不是挡用户保存。
            if (!connectedPorts.contains("else") && warnings != null
                && reportedSources.add(nodeId + "#missing-else")) {
                String portField = isBranches ? "branches[].id" : "conditions[].key";
                warnings.add("节点 " + nodeId + "（" + (isBranches ? "分支" : "条件")
                    + "）缺少 else 兜底出边：当前依赖引擎的「未命中全跑下游」兜底语义。"
                    + "更稳妥的写法：edge 传 {\"action\":\"connect\",\"from\":\"" + nodeId + "\",\"to\":\"<下游节点id>\","
                    + "\"fromPort\":\"else\"}（可指向同一个 end）。注意 fromPort 用 " + portField
                    + " 或 else，不能用 true/false");
            }
        }
    }

    /**
     * 节点语义完整性检查：收集致命缺失与可疑告警。
     *
     * <p>致命（fatalIssues）：节点缺了业务必需字段，执行必然失败或无意义——
     * llm 无 prompt、http 无 url、code 无 script。落版门禁会据此拒绝。</p>
     *
     * <p>告警（warnings）：可能不是用户想要的但系统能兜住——start 没定义任何输出、
     * end 没引用上游、llm 没指定模型等。放行但随回执提示模型。</p>
     */
    /**
     * 业务字段预检（落版 / 试运行共用）：返回 fatal 问题清单（带可直接抄的修复 JSON）。
     * 空清单 = 可跑。run(target=workflow) 执行前先调它，把「跑 30 秒才发现 url 是空」提前成毫秒级失败。
     */
    public static List<String> businessFieldIssues(JSONObject doc) {
        List<String> fatalIssues = new ArrayList<>();
        if (doc == null) {
            return fatalIssues;
        }
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes == null) {
            return fatalIssues;
        }
        List<JSONObject> nodeList = new ArrayList<>();
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject n = nodes.getJSONObject(i);
            if (n != null) {
                nodeList.add(n);
            }
        }
        checkNodeSemantics(nodeList, fatalIssues, new ArrayList<>());
        JSONArray edges = doc.getJSONArray("edges");
        List<JSONObject> edgeList = new ArrayList<>();
        if (edges != null) {
            for (int i = 0; i < edges.size(); i++) {
                JSONObject e = edges.getJSONObject(i);
                if (e != null) {
                    edgeList.add(e);
                }
            }
        }
        checkEdgePorts(nodeList, edgeList, fatalIssues, new ArrayList<>());
        return fatalIssues;
    }

    private static void checkNodeSemantics(List<JSONObject> nodes, List<String> fatalIssues, List<String> warnings) {
        for (JSONObject n : nodes) {
            String type = n.getStr("type");
            String id = n.getStr("id");
            JSONObject data = n.getJSONObject("data");
            if (data == null) {
                data = new JSONObject();
            }
            JSONObject iv = data.getJSONObject("inputsValues");
            switch (type == null ? "" : type) {
                case "llm": {
                    if (!hasTemplateContent(iv, "prompt") && !hasTemplateContent(iv, "systemPrompt")) {
                        fatalIssues.add("节点 " + id + "（LLM）缺少 prompt：没有提示词无法完成任何任务。"
                            + "修复：node 传 {\"action\":\"update\",\"nodeId\":\"" + id
                            + "\",\"data\":{\"prompt\":\"<从需求推导的提示词，可引用上游输出，如：总结以下文本：{{ start.text }}\"}}");
                    } else if (isDerivedPlaceholderPrompt(constantContentOf(iv, "prompt"))) {
                        warnings.add("节点 " + id + "（LLM）的提示词是系统生成的占位内容（按标题派生），"
                            + "请改为真实业务提示词");
                    }
                    if (iv == null || iv.get("modelName") == null) {
                        warnings.add("节点 " + id + "（LLM）未指定 modelName，节点运行时将缺少模型配置");
                    }
                    break;
                }
                case "http": {
                    String url = apiUrlOf(data);
                    if (url == null || url.trim().isEmpty()) {
                        fatalIssues.add("节点 " + id + "（HTTP）缺少 url：无法发起请求。"
                            + "修复：node 传 {\"action\":\"update\",\"nodeId\":\"" + id
                            + "\",\"data\":{\"api\":{\"method\":\"POST\",\"url\":\"https://真实地址\"}}}；"
                            + "确实缺地址信息就先 ask_user 问用户");
                    } else if (url.contains("example.com")) {
                        fatalIssues.add("节点 " + id + "（HTTP）的 url 是占位地址（" + url + "）：调用必然失败。"
                            + "修复：node 传 {\"action\":\"update\",\"nodeId\":\"" + id
                            + "\",\"data\":{\"api\":{\"url\":\"https://真实地址\"}}}");
                    }
                    JSONObject api = data.getJSONObject("api");
                    if (api == null || api.get("method") == null) {
                        warnings.add("节点 " + id + "（HTTP）未指定 method，将默认使用 GET");
                    }
                    break;
                }
                case "code": {
                    if (!hasScript(data)) {
                        fatalIssues.add("节点 " + id + "（Code）缺少 script：空脚本无法产出结果。"
                            + "修复：node 传 {\"action\":\"update\",\"nodeId\":\"" + id
                            + "\",\"data\":{\"script\":{\"language\":\"java\",\"content\":\"return Map.of(\\\"result\\\", input.get(\\\"text\\\"));\"}}}"
                            + "（content 写 java 语句，input 是上游输出 Map）");
                    }
                    break;
                }
                case "start": {
                    JSONObject outputs = data.getJSONObject("outputs");
                    JSONObject properties = outputs == null ? null : outputs.getJSONObject("properties");
                    if (properties == null || properties.isEmpty()) {
                        // 2026-10-11 升 fatal：空壳骨架策略（先写骨架再填数据）曾导致连跑 3 次失败
                        //（"start 没有输出参数下游拿不到输入" warning 模型不当回事）
                        fatalIssues.add("节点 " + id + "（开始）没有定义任何输出参数，下游节点将拿不到输入。"
                            + "修复：node 传 {\"action\":\"update\",\"nodeId\":\"" + id + "\",\"data\":"
                            + "{\"outputs\":{\"type\":\"object\",\"properties\":{\"<参数名>\":{\"type\":\"string\",\"title\":\"<说明>\"}}}}}"
                            + "（按用户需求定义输入参数）");
                    }
                    break;
                }
                case "end": {
                    if (iv == null || iv.isEmpty()) {
                        fatalIssues.add("节点 " + id + "（结束）没有引用任何上游输出，工作流运行结果将为空。"
                            + "修复：node 传 {\"action\":\"update\",\"nodeId\":\"" + id + "\",\"data\":"
                            + "{\"inputsValues\":{\"<结果字段>\":{\"type\":\"ref\",\"content\":[\"<上游节点id>\",\"<字段名>\"]}}}}"
                            + "（把上游要输出的字段引用进来）");
                    }
                    break;
                }
                case "condition": {
                    JSONArray conditions = data.getJSONArray("conditions");
                    if (conditions == null || conditions.isEmpty()) {
                        fatalIssues.add("节点 " + id + "（条件）没有配置任何条件分支——条件节点不配条件等于白建。"
                            + "修复：node 传 {\"action\":\"update\",\"nodeId\":\"" + id + "\",\"data\":"
                            + "{\"conditions\":[{\"key\":\"if_match\",\"value\":{\"left\":{\"type\":\"ref\","
                            + "\"content\":[\"<上游id>\",\"<字段>\"]},\"operator\":\"contains\","
                            + "\"right\":{\"type\":\"constant\",\"content\":\"<比较值>\"}}}]}}");
                    }
                    break;
                }
                case "branches": {
                    JSONArray branches = data.getJSONArray("branches");
                    if (branches == null || branches.isEmpty()) {
                        fatalIssues.add("节点 " + id + "（分支）没有配置任何分支——分支节点不配分支等于白建。"
                            + "修复：get 传 {\"target\":\"knowledge\",\"nodeType\":\"branches\"} 查看结构后补全 branches 列表");
                    }
                    break;
                }
                case "loop": {
                    if (iv == null || iv.get("loopFor") == null) {
                        warnings.add("节点 " + id + "（循环）未配置 loopFor，不知道要循环什么");
                    }
                    break;
                }
                default:
                    break;
            }
        }
    }

    /** 旧版自动派生的占位提示词（「请完成X任务：阅读输入内容并给出结果。」）—— 提示但不硬拒 */
    private static boolean isDerivedPlaceholderPrompt(String prompt) {
        return prompt != null && prompt.startsWith("请完成") && prompt.endsWith("阅读输入内容并给出结果。");
    }

    /** inputsValues[key] 的常量/模板文本（ref 返回引用串），取不到返回 null */
    private static String constantContentOf(JSONObject iv, String key) {
        if (iv == null) {
            return null;
        }
        Object value = iv.get(key);
        if (!(value instanceof JSONObject)) {
            return value == null ? null : String.valueOf(value);
        }
        JSONObject wrapper = (JSONObject) value;
        Object content = wrapper.get("content");
        if (content instanceof String) {
            return (String) content;
        }
        if (content instanceof JSONArray) {
            return "ref:" + ((JSONArray) content).join(".");
        }
        return null;
    }

    /**
     * http 节点的 url 文本：规范形状读 {@code data.api.url}（字符串或 constant/template 包装），
     * 兼容旧落库数据的 {@code data.inputsValues.url}。取不到返回 null。
     */
    private static String apiUrlOf(JSONObject data) {
        JSONObject api = data.getJSONObject("api");
        Object url = api != null ? api.get("url") : null;
        if (url == null) {
            JSONObject iv = data.getJSONObject("inputsValues");
            url = iv != null ? iv.get("url") : null;
        }
        if (url instanceof JSONObject) {
            Object content = ((JSONObject) url).get("content");
            if (content instanceof JSONArray) {
                return "ref:" + ((JSONArray) content).join(".");
            }
            url = content;
        }
        return url == null ? null : String.valueOf(url);
    }

    /** inputsValues[key] 是 template/constant 且 content 非空 */
    private static boolean hasTemplateContent(JSONObject iv, String key) {
        return hasWrapperContent(iv, key, "template") || hasWrapperContent(iv, key, "constant");
    }

    /**
     * 为 llm 节点补齐平台默认模型配置（apiKey/apiHost/modelName），返回填充项数。
     * 只补缺失项，绝不覆盖模型/用户显式给出的配置。
     */
    private static int fillLlmDefaults(String type, JSONObject data, LlmDefaults defaults) {
        if (!"llm".equals(type) || defaults == null) {
            return 0;
        }
        int filled = 0;
        if (isBlank(data.get("apiKey")) && !isBlank(defaults.apiKey)) {
            data.set("apiKey", defaults.apiKey);
            filled++;
        }
        if (isBlank(data.get("apiHost")) && !isBlank(defaults.apiHost)) {
            data.set("apiHost", defaults.apiHost);
            filled++;
        }
        if (isBlank(data.get("modelName")) && !isBlank(defaults.modelName)) {
            data.set("modelName", defaults.modelName);
            filled++;
        }
        return filled;
    }

    private static boolean isBlank(Object value) {
        return value == null || value.toString().trim().isEmpty();
    }

    /** inputsValues 中该字段是否已有 template/constant 包装值（normalize 后判断用） */
    private static boolean hasWrapperValue(JSONObject data, String key) {
        JSONObject iv = data.getJSONObject("inputsValues");
        if (iv == null) {
            return false;
        }
        return iv.get(key) != null;
    }

    /** 平台默认模型配置（来自 agent_config 的 llm_config），用于 LLM 节点缺省填充 */
    public static final class LlmDefaults {
        public final String apiHost;
        public final String apiKey;
        public final String modelName;

        public LlmDefaults(String apiHost, String apiKey, String modelName) {
            this.apiHost = apiHost;
            this.apiKey = apiKey;
            this.modelName = modelName;
        }
    }

    private static boolean hasWrapperContent(JSONObject iv, String key, String expectedType) {
        if (iv == null) {
            return false;
        }
        Object value = iv.get(key);
        if (!(value instanceof JSONObject)) {
            return false;
        }
        JSONObject wrapper = (JSONObject) value;
        String type = wrapper.getStr("type");
        if (type != null && !expectedType.equals(type)) {
            return false;
        }
        Object content = wrapper.get("content");
        if (content instanceof String) {
            return !((String) content).trim().isEmpty();
        }
        // ref 引用（{type:ref, content:[nodeId, field]}）也算有值
        return "ref".equals(wrapper.getStr("type")) && content != null;
    }

    /** code 节点的 script：data.script（{language, content}）或 data.inputsValues.script */
    private static boolean hasScript(JSONObject data) {
        Object script = data.get("script");
        if (hasScriptContent(script)) {
            return true;
        }
        JSONObject iv = data.getJSONObject("inputsValues");
        return iv != null && hasScriptContent(iv.get("script"));
    }

    private static boolean hasScriptContent(Object script) {
        if (script instanceof JSONObject) {
            Object content = ((JSONObject) script).get("content");
            return content instanceof String && !((String) content).trim().isEmpty();
        }
        return script instanceof String && !((String) script).trim().isEmpty();
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
