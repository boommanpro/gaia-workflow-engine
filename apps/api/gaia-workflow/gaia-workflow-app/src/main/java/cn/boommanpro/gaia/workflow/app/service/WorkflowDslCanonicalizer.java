package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;

import java.util.Collections;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
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
     *  出现即 fatal 打回（2026-10-16 起不再静默降级 variable）；多条件互斥分支用 branches，
     *  单条件用 condition。assignee（负责人标注节点）2026-10-28 起整体删除，AI 产出含它的
     *  草稿按未知类型 fatal 打回；note/group 同理不在 agent 可建清单。
     *  workflow（子流程）有真实解析器（infra WorkflowNodeParser）且契约文件齐备，
     *  2026-10-23 起加入白名单——此前被 fatal 打回导致子流程永远无法落版。 */
    private static final Set<String> SUPPORTED_TYPES = NodeSchemaRegistry.aiCreatableTypes();

    private WorkflowDslCanonicalizer() {
    }

    /** 规范化结果 */
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
     *
     * @param rawJson DSL 的 JSON 文本
     * @return 规范化结果；输入非法时 json 为 null
     */
    public static Result canonicalize(String rawJson) {
        /**
         * （画布 toJSON / agent 草稿两条来源都天然规范）。不再做任何别名翻译、缺字段补造、
         * 类型降级、自动接线——结构问题一律交给 {@link WorkflowDslValidator} 以 error 打回，
         * 错误可见好过静默修复。保留下来的仅是：data 归一化（AI 扁平简写）、缺坐标自动布局。
         * llm 凭证注入已移除（2026-10-25 用户决策）：凭证由 AI 生成时从知识库
         * platformDefaultModel 填进节点（表单可见），运行期不再隐式注入。
         *
         * @param rawJson DSL 的 JSON 文本
         * @return 规范化结果；输入非法时 json 为 null
         */
        List<String> repairs = new ArrayList<>();
        List<String> fatalIssues = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        if (rawJson == null || rawJson.trim().isEmpty()) {
            return new Result(null, repairs, fatalIssues, warnings, 0);
        }

        JSONObject root;
        JSONArray rawNodes;
        JSONArray rawEdges;
        Object globalVariable;
        try {
            Object parsed = JSONUtil.parse(rawJson.trim());
            if (!(parsed instanceof JSONObject)) {
                repairs.add("DSL 必须是 {\"nodes\":[...],\"edges\":[...]} 对象");
                return new Result(null, repairs, fatalIssues, warnings, 0);
            }
            root = (JSONObject) parsed;
            rawNodes = root.getJSONArray("nodes");
            rawEdges = root.getJSONArray("edges");
            globalVariable = root.get("globalVariable");
        } catch (Exception e) {
            return new Result(null, repairs, fatalIssues, warnings, 0);
        }
        if (rawNodes == null || rawNodes.isEmpty()) {
            repairs.add("未找到任何节点");
            return new Result(null, repairs, fatalIssues, warnings, 0);
        }
        if (rawEdges == null) {
            rawEdges = new JSONArray();
        }

        // ---------- 节点 ----------
        List<JSONObject> nodes = new ArrayList<>();

        for (int i = 0; i < rawNodes.size(); i++) {
            Object item = rawNodes.get(i);
            if (!(item instanceof JSONObject)) {
                repairs.add("第 " + (i + 1) + " 个节点不是对象，已跳过");
                continue;
            }
            JSONObject raw = (JSONObject) item;

            String type = trimToNull(raw.getStr("type"));
            if (type == null) {
                fatalIssues.add("第 " + (i + 1) + " 个节点缺少 type。可用类型: "
                    + String.join(", ", new java.util.TreeSet<>(SUPPORTED_TYPES)));
                continue;
            }
            type = type.toLowerCase();
            if (!SUPPORTED_TYPES.contains(type) && !cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum.notParse(type)) {
                // 未知类型不再降级（2026-10-16 起）也不做别名翻译（2026-10-24 起）——fatal 打回
                fatalIssues.add("节点类型 \"" + type + "\" 不受支持：运行时没有它的解析器（执行必然失败）。"
                    + "多条件互斥分支用 branches，单条件用 condition");
                continue;
            }

            String id = trimToNull(raw.getStr("id"));
            if (id == null) {
                fatalIssues.add("第 " + (i + 1) + " 个节点（" + type + "）缺少 id");
                continue;
            }

            JSONObject data = raw.getJSONObject("data");
            JSONObject mergedData = data != null ? new JSONObject(data.toString()) : new JSONObject();

            // data 归一化（AI 扁平简写 → 规范形状）；llm 凭证由 AI 从知识库填入，不再注入
            NodeDataNormalizer.normalize(type, mergedData);
            // 注意：prompt/url/script 不做占位填充 —— 占位值会让落版校验打不中 fatal、
            // 把失败推迟到运行期（2026-10-11 实证）。缺业务字段就在落版/试运行时 fatal，
            // 错误里带可直接抄的修复 JSON（见 checkNodeSemantics）。

            JSONObject node = new JSONObject();
            node.set("id", id);
            node.set("type", type);
            node.set("data", mergedData);
            JSONObject meta = raw.getJSONObject("meta");
            node.set("meta", meta != null ? new JSONObject(meta.toString()) : new JSONObject());
            if (raw.get("blocks") != null) {
                node.set("blocks", raw.get("blocks"));
            }
            if (raw.get("parentId") != null) {
                node.set("parentId", raw.get("parentId"));
            }
            nodes.add(node);
        }

        if (nodes.isEmpty()) {
            repairs.add("没有任何结构合法的节点");
            return new Result(null, repairs, fatalIssues, warnings, 0);
        }

        // 对象输出声明的引用驱动补全（引用驱动的展示契约收敛，落版与草稿同口径）
        NodeDataNormalizer.completeObjectOutputDeclarations(
            new JSONObject().set("nodes", nodes));

        // ---------- 语义完整性检查 ----------
        // 结构修好了不代表能跑：llm 没有 prompt、http 没有 url 这类「空壳节点」
        // 落库后执行必然失败或产出无意义结果，必须在落版前拦下并回传给模型补全。
        checkNodeSemantics(nodes, fatalIssues, warnings);

        Map<String, JSONObject> byId = new LinkedHashMap<>();
        for (JSONObject n : nodes) {
            byId.put(n.getStr("id"), n);
        }

        // ---------- 连线（规范键：sourceNodeID/targetNodeID[/sourcePortID/targetPortID]） ----------
        List<JSONObject> edges = new ArrayList<>();
        Set<String> seenEdges = new HashSet<>();
        for (int i = 0; i < rawEdges.size(); i++) {
            Object item = rawEdges.get(i);
            if (!(item instanceof JSONObject)) {
                continue;
            }
            JSONObject raw = (JSONObject) item;
            String source = trimToNull(raw.getStr("sourceNodeID"));
            String target = trimToNull(raw.getStr("targetNodeID"));
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
            String sourcePort = trimToNull(raw.getStr("sourcePortID"));
            // 去重键必须含端口：condition/branches 同一 source→target 的 if/else 双边是合法结构，
            // 只按端点判重会把 else 边静默丢弃（2026-10-17 E2E 实证：反例路径整体 canceled）
            String key = source + "->" + target + (sourcePort != null ? "[" + sourcePort + "]" : "");
            if (!seenEdges.add(key)) {
                repairs.add("连线 " + key + " 重复，已去重");
                continue;
            }
            String targetPort = trimToNull(raw.getStr("targetPortID"));

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
            WorkflowLayoutEngine.layoutNodeList(nodes, edges, false);
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
        return new Result(out.toString(), repairs, fatalIssues, warnings, nodes.size());
    }

    /**
     * （ConditionNode.evaluateCondition 返回 false，不报错）——空壳条件必须在落版前打回。
     */
    private static List<String> conditionsMissingOperator(String where, JSONArray conditions) {
        List<String> issues = new ArrayList<>();
        for (int i = 0; i < conditions.size(); i++) {
            JSONObject c = conditions.getJSONObject(i);
            if (c == null) {
                continue;
            }
            JSONObject value = c.getJSONObject("value");
            String operator = value == null ? null : value.getStr("operator");
            if (operator == null || operator.trim().isEmpty()) {
                issues.add("节点 " + where + " 的条件 \"" + c.getStr("key") + "\" 没有配置 operator"
                    + "（引擎会静默按 false 处理、该分支永远不命中）。"
                    + "修复：value 内补 \"operator\":\"contains|not_contains|eq|neq|gt|gte|lt|lte|"
                    + "is_empty|is_not_empty|is_true|is_false\" 之一（注意是 neq/gte/lte，不是 ne/ge/le）");
            }
        }
        return issues;
    }

    /**
     * 每个节点类型的合法出边端口集合：
     * condition=conditions[].key+else、branches=branches[].id+else，其余类型=null（不允许 fromPort）。
     * 声明顺序即连线校验与布局引擎（WorkflowLayoutEngine 端口排布）共用顺序。
     */
    public static Set<String> legalPortsOf(JSONObject node) {
        if (node == null) {
            return null;
        }
        String type = node.getStr("type");
        JSONObject data = node.getJSONObject("data");
        if (data == null) {
            return null;
        }
        Set<String> ports = new LinkedHashSet<>();
        if ("condition".equals(type)) {
            JSONArray conditions = data.getJSONArray("conditions");
            if (conditions != null) {
                for (int i = 0; i < conditions.size(); i++) {
                    JSONObject c = conditions.getJSONObject(i);
                    if (c != null && c.getStr("key") != null && !c.getStr("key").trim().isEmpty()) {
                        ports.add(c.getStr("key").trim());
                    }
                }
            }
        } else if ("branches".equals(type)) {
            JSONArray branches = data.getJSONArray("branches");
            if (branches != null) {
                for (int i = 0; i < branches.size(); i++) {
                    JSONObject b = branches.getJSONObject(i);
                    if (b != null && b.getStr("id") != null && !b.getStr("id").trim().isEmpty()) {
                        ports.add(b.getStr("id").trim());
                    }
                }
            }
        } else {
            return null;
        }
        if (ports.isEmpty()) {
            return null;
        }
        ports.add("else");
        return ports;
    }

    /**
     * 2026-10-24 校验前移：错误从 run 预检提前到连线动作当场，模型能立即归因修复）。
     * 返回空清单 = 合法。
     */
    public static List<String> edgeIssues(JSONObject doc, String from, String to, String fromPort) {
        List<String> issues = new ArrayList<>();
        if (doc == null || from == null || to == null) {
            issues.add("需要 from 和 to");
            return issues;
        }
        JSONObject fromNode = findNodeInDoc(doc, from);
        JSONObject toNode = findNodeInDoc(doc, to);
        if (fromNode == null) {
            issues.add("源节点 \"" + from + "\" 不在画布上。修复：先 get(target=canvas) 核对节点 id");
        }
        if (toNode == null) {
            issues.add("目标节点 \"" + to + "\" 不在画布上。修复：先 get(target=canvas) 核对节点 id");
        }
        if (fromNode == null || toNode == null) {
            return issues;
        }
        if (from.equals(to)) {
            issues.add("不能连线到自己（" + from + " → " + to + " 是自环）");
        }
        JSONArray edges = doc.getJSONArray("edges");
        if (edges != null) {
            String port = fromPort == null ? "" : fromPort;
            for (int i = 0; i < edges.size(); i++) {
                JSONObject e = edges.getJSONObject(i);
                if (e == null) {
                    continue;
                }
                String ePort = e.getStr("sourcePortID") == null ? "" : e.getStr("sourcePortID");
                if (from.equals(e.getStr("sourceNodeID")) && to.equals(e.getStr("targetNodeID"))
                    && port.equals(ePort)) {
                    issues.add("连线 " + from + " → " + to + (port.isEmpty() ? "" : "[" + port + "]") + " 已存在，不要重复连");
                    break;
                }
            }
        }
        // 端口合法性：条件/分支节点的出边必须带合法 fromPort；普通节点不允许 fromPort
        Set<String> legal = legalPortsOf(fromNode);
        String type = fromNode.getStr("type");
        if (legal != null) {
            if (fromPort == null || fromPort.trim().isEmpty()) {
                issues.add("从 " + type + " 节点 " + from + " 出发的边必须带 fromPort（本节点可用: "
                    + String.join(" / ", legal) + "）。绝不能用 true/false");
            } else if (!legal.contains(fromPort.trim())) {
                issues.add("连线 " + from + " →[fromPort=" + fromPort + "]→ " + to + " 的端口 \"" + fromPort
                    + "\" 不存在：" + type + " 节点的出边 fromPort 必须用 "
                    + ("branches".equals(type) ? "branches[].id" : "conditions[].key") + " 或 else"
                    + "（本节点可用: " + String.join(" / ", legal) + "）。"
                    + "端口匹配不到时该分支的下游节点不会执行——绝不能写 true/false");
            }
        } else if (fromPort != null && !fromPort.trim().isEmpty()
            && !"condition".equals(type) && !"branches".equals(type)) {
            issues.add("节点 " + from + "（" + type + "）不是条件/分支节点，出边不需要也不能带 fromPort（"
                + fromPort + "）——带端口的普通出边会导致下游永远不被执行");
        }
        return issues;
    }

    private static JSONObject findNodeInDoc(JSONObject doc, String id) {
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes == null) {
            return null;
        }
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject n = nodes.getJSONObject(i);
            if (n != null && id.equals(n.getStr("id"))) {
                return n;
            }
        }
        return null;
    }

    /**
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
            Set<String> ports = legalPortsOf(n);
            if (ports != null) {
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
     *
     * <p>致命（fatalIssues）：节点缺了业务必需字段，执行必然失败或无意义——
     * llm 无 prompt、http 无 url、code 无 script。落版门禁会据此拒绝。</p>
     *
     * <p>告警（warnings）：可能不是用户想要的但系统能兜住——start 没定义任何输出、
     * end 没引用上游、llm 没指定模型等。放行但随回执提示模型。</p>
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
                    // 模型凭证三字段统一必填（2026-10-26 用户决策「强制必填」，llm.schema.json
                    // x-gaia-form-inputs.required 同口径）：apiKey 空运行必然 401（10-25 C06 实证），
                    // apiHost/modelName 空 LlmNode 直接抛缺配置——此前 modelName 只给 warning、apiHost 不查，
                    // 空值要到试跑才暴露。一次点名全部缺项，回执带精确修复指引。
                    List<String> missingCredentials = new ArrayList<>();
                    for (String key : new String[]{"modelName", "apiHost", "apiKey"}) {
                        String value = constantContentOf(iv, key);
                        if (value == null || value.trim().isEmpty()) {
                            missingCredentials.add(key);
                        }
                    }
                    if (!missingCredentials.isEmpty()) {
                        fatalIssues.add("节点 " + id + "（LLM）模型凭证缺失：" + String.join("/", missingCredentials)
                            + " 为空，运行时无法调用模型。"
                            + "修复：先 get(target=knowledge, nodeType=llm) 取 platformDefaultModel 三个值原样填入，"
                            + "node 传 {\"action\":\"update\",\"nodeId\":\"" + id + "\",\"data\":{\"inputsValues\":"
                            + "{\"modelName\":{\"type\":\"constant\",\"content\":\"<platformDefaultModel.modelName>\"},"
                            + "\"apiHost\":{\"type\":\"constant\",\"content\":\"<platformDefaultModel.apiHost>\"},"
                            + "\"apiKey\":{\"type\":\"constant\",\"content\":\"<platformDefaultModel.apiKey>\"}}}}");
                    }
                    // json 输出模式必须声明输出字段（运行时按声明解析模型 JSON，缺声明=无输出进 memory）
                    if ("json".equalsIgnoreCase(data.getStr("outputMode"))) {
                        JSONObject outputs = data.getJSONObject("outputs");
                        JSONObject props = outputs != null ? outputs.getJSONObject("properties") : null;
                        if (props == null || props.isEmpty()) {
                            fatalIssues.add("节点 " + id + "（LLM，json 输出模式）缺少 outputs 声明："
                                + "运行时无法把模型 JSON 解析成可引用字段。"
                                + "修复：node 传 {\"action\":\"update\",\"nodeId\":\"" + id
                                + "\",\"data\":{\"outputs\":{\"type\":\"object\",\"properties\":"
                                + "{\"<字段名>\":{\"type\":\"string\"}}}}}，且 prompt 里要求模型只输出这些字段的 JSON 对象");
                        }
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
                case "workflow": {
                    String targetCode = data.getStr("workflowId");
                    if (targetCode == null || targetCode.trim().isEmpty()) {
                        fatalIssues.add("节点 " + id + "（子流程）缺少 workflowId：没有目标工作流无法执行。"
                            + "修复：先 get(target=canvas) 确认可用的 workflowCode，再 node 传 "
                            + "{\"action\":\"update\",\"nodeId\":\"" + id
                            + "\",\"data\":{\"workflowId\":\"<目标工作流code>\"}}");
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
                    } else {
                        fatalIssues.addAll(conditionsMissingOperator(id, conditions));
                    }
                    break;
                }
                case "branches": {
                    JSONArray branches = data.getJSONArray("branches");
                    if (branches == null || branches.isEmpty()) {
                        fatalIssues.add("节点 " + id + "（分支）没有配置任何分支——分支节点不配分支等于白建。"
                            + "修复：get 传 {\"target\":\"knowledge\",\"nodeType\":\"branches\"} 查看结构后补全 branches 列表");
                    } else {
                        for (int b = 0; b < branches.size(); b++) {
                            JSONObject branch = branches.getJSONObject(b);
                            if (branch == null) {
                                continue;
                            }
                            String logic = branch.getStr("logic");
                            if (logic != null && !"and".equals(logic) && !"or".equals(logic)) {
                                fatalIssues.add("节点 " + id + "（分支）分支 \"" + branch.getStr("id")
                                    + "\" 的 logic \"" + logic + "\" 非法（只认 and/or），该分支永远不命中");
                            }
                            JSONArray branchConditions = branch.getJSONArray("conditions");
                            if (branchConditions != null) {
                                fatalIssues.addAll(conditionsMissingOperator(id + "/" + branch.getStr("id"), branchConditions));
                            }
                        }
                    }
                    break;
                }
                case "loop": {
                    // 引擎读 data.loopFor（LoopNodeParser），此前误查 inputsValues.loopFor —— 2026-10-24 修正
                    if (data.get("loopFor") == null) {
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
     * 旧落库口径 inputsValues.url 的兼容读取已随 2026-10-24 全严格治理移除（引擎从不读它）。
     */
    private static String apiUrlOf(JSONObject data) {
        JSONObject api = data.getJSONObject("api");
        Object url = api != null ? api.get("url") : null;
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

    private static boolean isBlank(Object value) {
        return value == null || value.toString().trim().isEmpty();
    }

    /** inputsValues 中该字段是否已有包装值（normalize 后判断用） */
    private static boolean hasWrapperValue(JSONObject data, String key) {
        JSONObject iv = data.getJSONObject("inputsValues");
        if (iv == null) {
            return false;
        }
        return iv.get(key) != null;
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
     * 供服务端画布草稿的 autoLayout 操作复用。实现已收口到 {@link WorkflowLayoutEngine}
     * （2026-10-29 布局收口：ELK layered 按真实节点尺寸布局，替代旧 BFS 固定步长）。
     *
     * @param doc 含 nodes / edges 的文档对象
     */
    public static void applyLayout(JSONObject doc) {
        WorkflowLayoutEngine.applyLayout(doc, false);
    }

    /**
     * @param force true=强制重排所有节点（AI 构建完成的一字长蛇阵治理用）；
     *              false=只补缺失坐标的节点（落版「缺坐标自动布局」既有语义）
     */
    public static void applyLayout(JSONObject doc, boolean force) {
        WorkflowLayoutEngine.applyLayout(doc, force);
    }







    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
