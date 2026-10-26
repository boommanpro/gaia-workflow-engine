package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 工作流 DSL 统一校验器 —— 「schema 是否可执行」在落库前的机器证明。
 *
 * <p>所有写入链路（agent 落版 / 编辑器手动保存 / set-current / 执行前预检 / task.validate）
 * 都必须经过这里。校验分级：error 必须拒绝入库，warning 放行但随回执提示。</p>
 *
 * <p>校验段：S1 结构（类型白名单 / id 唯一）→ S2 拓扑（start/end 完整性 / 环 / 悬空边 /
 * 可达性）→ S3 参数 schema（node-schemas 契约）+ 端口（委托 canonicalizer，与 agent
 * 修复回执共用文案）→ S4 引用（ref 指向的节点与字段必须存在）。
 * 2026-10-17 起该文件曾被误覆盖一次，已按会话编辑历史完整重建。</p>
 */
public final class WorkflowDslValidator {

    /** ref 数组形 {type:"ref", content:["nodeId", ...]} */
    private static final Set<String> REF_TYPES = new HashSet<>(List.of("ref"));
    /** 模板字符串里的 {{ expr }} 占位 */
    private static final Pattern TEMPLATE_TOKEN = Pattern.compile("\\{\\{\\s*([^{}]+?)\\s*}}");

    private WorkflowDslValidator() {
    }

    /** 单条校验问题 */
    public static final class Issue {
        private final String level;
        private final String code;
        private final String nodeId;
        private final String message;

        Issue(String level, String code, String nodeId, String message) {
            this.level = level;
            this.code = code;
            this.nodeId = nodeId;
            this.message = message;
        }

        public String getLevel() {
            return level;
        }

        public String getCode() {
            return code;
        }

        public String getNodeId() {
            return nodeId;
        }

        public String getMessage() {
            return message;
        }

        @Override
        public String toString() {
            return "[" + level + "/" + code + "]" + (nodeId != null ? "(" + nodeId + ") " : " ") + message;
        }
    }

    /** 校验一段 schema 文本；无法解析时返回单条 INVALID_JSON */
    public static List<Issue> validate(String schemaJson) {
        if (schemaJson == null || schemaJson.trim().isEmpty()) {
            return List.of(new Issue("error", "EMPTY_NODES", null, "schema 为空"));
        }
        JSONObject doc;
        try {
            Object parsed = JSONUtil.parse(schemaJson.trim());
            doc = parsed instanceof JSONObject ? (JSONObject) parsed : null;
        } catch (Exception e) {
            doc = null;
        }
        if (doc == null) {
            return List.of(new Issue("error", "INVALID_JSON", null, "schema 不是合法的 JSON 对象"));
        }
        return validate(doc);
    }

    /** 校验已解析的文档（nodes/edges） */
    public static List<Issue> validate(JSONObject doc) {
        List<Issue> issues = new ArrayList<>();
        if (doc == null) {
            issues.add(new Issue("error", "INVALID_JSON", null, "文档为空"));
            return issues;
        }
        JSONArray nodes = doc.getJSONArray("nodes");
        JSONArray edges = doc.getJSONArray("edges");
        if (nodes == null || nodes.isEmpty()) {
            issues.add(new Issue("error", "EMPTY_NODES", null, "没有任何节点"));
            return issues;
        }

        // ---------- S1 结构 ----------
        List<JSONObject> nodeList = new ArrayList<>();
        Set<String> allIds = new LinkedHashSet<>();
        Map<String, String> typeById = new LinkedHashMap<>();
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject n = nodes.getJSONObject(i);
            if (n == null) {
                issues.add(new Issue("error", "INVALID_JSON", null, "第 " + (i + 1) + " 个节点不是对象"));
                continue;
            }
            nodeList.add(n);
            String id = n.getStr("id");
            String type = n.getStr("type");
            if (id == null || id.trim().isEmpty()) {
                issues.add(new Issue("error", "MISSING_ID", null, "第 " + (i + 1) + " 个节点缺少 id"));
                continue;
            }
            if (!allIds.add(id)) {
                issues.add(new Issue("error", "DUPLICATE_ID", id, "节点 id 重复：" + id));
                continue;
            }
            if (type == null || type.trim().isEmpty()) {
                issues.add(new Issue("error", "MISSING_TYPE", id, "节点 " + id + " 缺少 type"));
                continue;
            }
            NodeTypeEnum known = NodeTypeEnum.of(type);
            if (known == null) {
                issues.add(new Issue("error", "UNKNOWN_TYPE", id,
                    "节点 " + id + " 的类型 \"" + type + "\" 不受支持（运行时没有它的解析器，执行必然失败）。"
                        + "多条件互斥分支用 branches，单条件用 condition；子流程用 workflow；其余可用类型见 NodeTypeEnum"));
                continue;
            }
            typeById.put(id, type);
        }

        // ---------- S2 拓扑 ----------
        int startCount = 0;
        int endCount = 0;
        List<String> startIds = new ArrayList<>();
        Set<String> endIds = new LinkedHashSet<>();
        for (JSONObject n : nodeList) {
            String id = n.getStr("id");
            String type = typeById.get(id);
            if ("start".equals(type)) {
                startCount++;
                startIds.add(id);
            }
            if ("end".equals(type)) {
                endCount++;
                endIds.add(id);
            }
        }
        if (startCount == 0) {
            issues.add(new Issue("error", "NO_START", null, "缺少 start 节点：工作流没有入口"));
        } else if (startCount > 1) {
            issues.add(new Issue("error", "MULTI_START", String.join(",", startIds),
                "存在 " + startCount + " 个 start 节点（" + String.join(", ", startIds) + "）：入口必须唯一"));
        }
        if (endCount == 0) {
            issues.add(new Issue("error", "NO_END", null, "缺少 end 节点：工作流没有产出出口"));
        } else if (endCount > 1) {
            issues.add(new Issue("error", "MULTI_END", String.join(",", endIds),
                "存在 " + endCount + " 个 end 节点（" + String.join(", ", endIds) + "）：出口必须唯一，"
                    + "条件/分支的各路径请汇合到同一个 end"));
        }

        List<String[]> edgeList = new ArrayList<>();
        Set<String> seenEdges = new HashSet<>();
        for (int i = 0; i < (edges == null ? 0 : edges.size()); i++) {
            JSONObject e = edges.getJSONObject(i);
            if (e == null) {
                continue;
            }
            String source = e.getStr("sourceNodeID");
            String target = e.getStr("targetNodeID");
            if (source == null || target == null) {
                issues.add(new Issue("error", "DANGLING_EDGE", null, "存在缺少起止节点的连线"));
                continue;
            }
            if (!allIds.contains(source) || !allIds.contains(target)) {
                issues.add(new Issue("error", "DANGLING_EDGE", source,
                    "连线 " + source + " → " + target + " 指向不存在的节点"));
                continue;
            }
            if (source.equals(target)) {
                issues.add(new Issue("error", "SELF_LOOP", source, "节点 " + source + " 存在自环连线"));
                continue;
            }
            String port = e.getStr("sourcePortID");
            if (!seenEdges.add(source + "->" + target + (port != null ? "[" + port + "]" : ""))) {
                issues.add(new Issue("warning", "DUPLICATE_EDGE", source,
                    "连线 " + source + " → " + target + (port != null ? "[" + port + "]" : "") + " 重复"));
                continue;
            }
            edgeList.add(new String[]{source, target});
        }

        // 环检测：顶层有向图 DFS（画布子节点同在一个数组里，一并覆盖）
        List<String> cycle = findCycle(allIds, edgeList);
        if (cycle != null) {
            issues.add(new Issue("error", "CYCLE", cycle.get(0),
                "存在循环连线：" + String.join(" → ", cycle) + "（循环节点请用 loop 容器表达）"));
        }

        // 可达性：从 start 出发
        if (startCount >= 1 && endCount >= 1) {
            Set<String> reachable = reachableFrom(startIds.get(0), edgeList);
            boolean endReachable = false;
            for (String endId : endIds) {
                if (reachable.contains(endId)) {
                    endReachable = true;
                    break;
                }
            }
            if (!endReachable) {
                issues.add(new Issue("error", "NO_PATH_TO_END", startIds.get(0),
                    "从 start 无法到达任何 end 节点：即使执行也不会有产出"));
            }
            for (String id : allIds) {
                String type = typeById.get(id);
                if (type == null || "block-start".equals(type) || "block-end".equals(type)) {
                    continue;
                }
                if (!reachable.contains(id) && !id.equals(startIds.get(0))) {
                    issues.add(new Issue("warning", "UNREACHABLE_NODE", id,
                        "节点 " + id + "（" + type + "）从 start 不可达，永远不会执行"));
                }
            }
        }

        // 孤立节点：无入边也无出边（start/end/标注类除外）
        Set<String> withEdges = new HashSet<>();
        for (String[] e : edgeList) {
            withEdges.add(e[0]);
            withEdges.add(e[1]);
        }
        for (String id : allIds) {
            String type = typeById.get(id);
            if (type == null || withEdges.contains(id)) {
                continue;
            }
            if ("start".equals(type) || "end".equals(type) || NodeTypeEnum.notParse(type)) {
                continue;
            }
            issues.add(new Issue("warning", "ISOLATED_NODE", id,
                "节点 " + id + "（" + type + "）没有任何连线，不会被执行"));
        }

        // ---------- S3 参数结构：节点 data 过 JSON Schema 契约（node-schemas/*.schema.json） ----------
        // 契约是严格版（additionalProperties:false）：未知字段/拼错字段名/错误包装形状在此拦截。
        // data 缺失或不是对象时按 {} 校验——required 不允许因「没写 data」被绕过。
        for (JSONObject n : nodeList) {
            String id = n.getStr("id");
            String type = typeById.get(id);
            if (type == null || !NodeSchemaRegistry.hasSchema(type)) {
                continue;
            }
            Object data = n.get("data");
            JSONObject dataObj = data instanceof JSONObject ? (JSONObject) data : new JSONObject();
            if (data == null) {
                issues.add(new Issue("error", "MISSING_DATA", id,
                    "节点 " + id + "（" + type + "）缺少 data 配置"));
            }
            for (String violation : NodeSchemaRegistry.validateParams(type, dataObj.toString())) {
                issues.add(new Issue("error", "INVALID_PARAM", id,
                    "节点 " + id + "（" + type + "）参数结构不合法：" + violation));
            }
        }

        // ---------- S3b + 端口：委托 canonicalizer（与 agent 修复回执共用文案） ----------
        for (String fatal : WorkflowDslCanonicalizer.businessFieldIssues(doc)) {
            issues.add(new Issue("error", "SEMANTIC", extractNodeId(fatal), fatal));
        }

        // ---------- S4 引用：ref/模板指向的节点必须存在；字段必须命中上游已知输出 ----------
        Map<String, Set<String>> knownOutputs = inferOutputFields(nodeList, typeById);
        validateReferences(nodeList, allIds, knownOutputs, issues);
        return issues;
    }

    public static boolean hasErrors(List<Issue> issues) {
        return issues != null && issues.stream().anyMatch(i -> "error".equals(i.level));
    }

    /** error 级问题的单行摘要（拼进接口报错文案用） */
    public static String errorSummary(List<Issue> issues) {
        StringBuilder sb = new StringBuilder();
        for (Issue issue : issues) {
            if (!"error".equals(issue.level)) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append("；");
            }
            sb.append(issue.message);
        }
        return sb.toString();
    }

    /**
     * 推断每个节点的输出字段集合（引用校验 / get(target=variables) 共用）。
     * 静态可判定：http/llm/string-format（schema 契约）、start/condition/branches（结构）、
     * code/variable/loop（outputs.properties 声明）。值为 null = 动态输出，跳过字段级检查。
     */
    public static Map<String, Set<String>> inferOutputFields(List<JSONObject> nodeList, Map<String, String> typeById) {
        Map<String, Set<String>> result = new HashMap<>();
        for (JSONObject n : nodeList) {
            String id = n.getStr("id");
            String type = typeById.get(id);
            if (type == null) {
                continue;
            }
            JSONObject data = n.getJSONObject("data") != null ? n.getJSONObject("data") : new JSONObject();
            Set<String> fields = null;
            if (NodeSchemaRegistry.staticOutputs(type) != null) {
                fields = new LinkedHashSet<>(NodeSchemaRegistry.staticOutputs(type));
            }
            switch (type) {
                // llm json 输出模式：输出=outputs.properties 声明集（运行时按声明解析模型 JSON）；
                // text 模式保持固定 result
                case "llm":
                    if ("json".equalsIgnoreCase(data.getStr("outputMode"))) {
                        Set<String> declared = NodeSchemaRegistry.declaredOutputFields(data);
                        if (declared != null) {
                            fields = declared;
                        }
                    }
                    break;
                case "start":
                case "code":
                case "variable":
                case "loop":
                case "workflow":
                    Set<String> declared = NodeSchemaRegistry.declaredOutputFields(data);
                    if (declared != null) {
                        fields = declared;
                    } else if ("start".equals(type)) {
                        fields = new LinkedHashSet<>();
                    }
                    break;
                case "condition": {
                    fields = new LinkedHashSet<>();
                    JSONArray conditions = data.getJSONArray("conditions");
                    if (conditions != null) {
                        for (int i = 0; i < conditions.size(); i++) {
                            JSONObject c = conditions.getJSONObject(i);
                            if (c != null && c.getStr("key") != null) {
                                fields.add(c.getStr("key"));
                            }
                        }
                    }
                    fields.add("else");
                    break;
                }
                case "branches": {
                    fields = new LinkedHashSet<>();
                    JSONArray branches = data.getJSONArray("branches");
                    if (branches != null) {
                        for (int i = 0; i < branches.size(); i++) {
                            JSONObject b = branches.getJSONObject(i);
                            if (b != null && b.getStr("id") != null) {
                                fields.add(b.getStr("id"));
                            }
                        }
                    }
                    fields.add("else");
                    break;
                }
                default:
                    break;
            }
            result.put(id, fields);
        }
        return result;
    }

    // ---------------- S4：引用校验 ----------------

    /**
     * 引用级问题的公开子集（2026-10-25 D1）：给定全图节点列表，返回 ref/模板引用问题。
     * 供 node add/update 在写入当场校验——此前 S4 只在落版/执行时运行，AI 写入断裂引用
     * （如引用 llm 的非 result 字段）要到用户保存版本才暴露，修复成本最高。
     *
     * @param ownerFilter 只返回该节点拥有的问题；null = 全部节点
     */
    public static List<Issue> referenceIssues(JSONArray nodeList, String ownerFilter) {
        Set<String> allIds = new HashSet<>();
        Map<String, String> typeById = new HashMap<>();
        List<JSONObject> nodes = new ArrayList<>();
        for (Object item : nodeList) {
            if (!(item instanceof JSONObject)) {
                continue;
            }
            JSONObject n = (JSONObject) item;
            nodes.add(n);
            String id = n.getStr("id");
            if (id != null) {
                allIds.add(id);
                typeById.put(id, n.getStr("type"));
            }
        }
        Map<String, Set<String>> knownOutputs = inferOutputFields(nodes, typeById);
        List<Issue> issues = new ArrayList<>();
        for (JSONObject n : nodes) {
            String id = n.getStr("id");
            if (ownerFilter != null && !ownerFilter.equals(id)) {
                continue;
            }
            JSONObject data = n.getJSONObject("data");
            if (data != null) {
                scanRefObjects(data, id, allIds, knownOutputs, issues, new HashSet<>());
                scanTemplateStrings(data, id, allIds, knownOutputs, issues, new HashSet<>());
            }
        }
        return issues;
    }

    private static void validateReferences(List<JSONObject> nodeList, Set<String> allIds,
                                           Map<String, Set<String>> knownOutputs, List<Issue> issues) {
        for (JSONObject n : nodeList) {
            String id = n.getStr("id");
            JSONObject data = n.getJSONObject("data");
            if (data != null) {
                scanRefObjects(data, id, allIds, knownOutputs, issues, new HashSet<>());
                scanTemplateStrings(data, id, allIds, knownOutputs, issues, new HashSet<>());
            }
        }
    }

    /** 递归找 {type:"ref", content:["nodeId", ...]}：nodeId 必须存在；字段命中上游已知输出 */
    /** 循环迭代变量作用域：<loopId>_locals（item/index）是引擎内置，等价于画布上存在 id 为 loopId 的循环节点 */
    private static boolean isLoopLocalsTarget(String target, Set<String> allIds) {
        if (target == null || !target.endsWith("_locals")) {
            return false;
        }
        String loopId = target.substring(0, target.length() - "_locals".length());
        return !loopId.isEmpty() && allIds.contains(loopId);
    }

    private static void scanRefObjects(Object value, String ownerNodeId, Set<String> allIds,
                                       Map<String, Set<String>> knownOutputs,
                                       List<Issue> issues, Set<Object> visited) {
        if (value instanceof JSONObject) {
            JSONObject obj = (JSONObject) value;
            if (!visited.add(obj)) {
                return;
            }
            if (REF_TYPES.contains(obj.getStr("type")) && obj.get("content") instanceof JSONArray) {
                JSONArray content = obj.getJSONArray("content");
                if (!content.isEmpty() && content.get(0) instanceof String) {
                    String target = (String) content.get(0);
                    // 循环迭代变量 <loopId>_locals.item/.index 是引擎内置作用域，不是画布节点
                    if (!allIds.contains(target) && !isLoopLocalsTarget(target, allIds)) {
                        issues.add(new Issue("error", "DANGLING_REF", ownerNodeId,
                            "节点 " + ownerNodeId + " 引用了不存在的节点 \"" + target + "\"（ref 引用指向的节点必须在画布上）"));
                        return;
                    }
                    // 字段级检查：上游输出可静态判定时，字段必须存在——否则运行期静默 null 假成功
                    if (content.size() >= 2 && content.get(1) instanceof String) {
                        String field = (String) content.get(1);
                        Set<String> outputs = knownOutputs.get(target);
                        if (outputs != null && !outputs.contains(field)) {
                            issues.add(new Issue("error", "DANGLING_REF_FIELD", ownerNodeId,
                                "节点 " + ownerNodeId + " 引用 " + target + " 的字段 \"" + field
                                    + "\" 不存在（该节点输出只有: " + String.join(", ", outputs) + "），"
                                    + "运行期将静默解析为 null"));
                        }
                    }
                }
                return;
            }
            for (String key : obj.keySet()) {
                scanRefObjects(obj.get(key), ownerNodeId, allIds, knownOutputs, issues, visited);
            }
        } else if (value instanceof JSONArray) {
            JSONArray arr = (JSONArray) value;
            if (!visited.add(arr)) {
                return;
            }
            for (Object item : arr) {
                scanRefObjects(item, ownerNodeId, allIds, knownOutputs, issues, visited);
            }
        }
    }

    /** 递归扫 template 型包装的字符串内容，{{ nodeId.field }} 的 nodeId 必须存在；字段命中上游已知输出（warning） */
    private static void scanTemplateStrings(Object value, String ownerNodeId, Set<String> allIds,
                                            Map<String, Set<String>> knownOutputs,
                                            List<Issue> issues, Set<Object> visited) {
        if (value instanceof JSONObject) {
            JSONObject obj = (JSONObject) value;
            if (!visited.add(obj)) {
                return;
            }
            boolean isTemplate = "template".equals(obj.getStr("type"));
            for (String key : obj.keySet()) {
                Object child = obj.get(key);
                if (isTemplate && "content".equals(key) && child instanceof String) {
                    scanTemplateToken((String) child, ownerNodeId, allIds, knownOutputs, issues);
                } else {
                    scanTemplateStrings(child, ownerNodeId, allIds, knownOutputs, issues, visited);
                }
            }
        } else if (value instanceof JSONArray) {
            JSONArray arr = (JSONArray) value;
            if (!visited.add(arr)) {
                return;
            }
            for (Object item : arr) {
                scanTemplateStrings(item, ownerNodeId, allIds, knownOutputs, issues, visited);
            }
        }
    }

    private static void scanTemplateToken(String template, String ownerNodeId, Set<String> allIds,
                                          Map<String, Set<String>> knownOutputs, List<Issue> issues) {
        Matcher matcher = TEMPLATE_TOKEN.matcher(template);
        Set<String> reported = new HashSet<>();
        while (matcher.find()) {
            String expr = matcher.group(1).trim();
            String head = expr.split("[.(\\s]", 2)[0].trim();
            if (head.isEmpty() || !head.matches("[A-Za-z0-9_\\-\\u4e00-\\u9fa5]+")) {
                continue;
            }
            if (!allIds.contains(head) && !isLoopLocalsTarget(head, allIds) && reported.add(head)) {
                // 2026-10-24 升 error（原 warning）：模板引用未知节点必须让模型/前端/后端三方
                // 都感知——静默放行的结果是运行期解析为空、节点「假成功」（用户实测踩坑）
                issues.add(new Issue("error", "TEMPLATE_REF_UNKNOWN", ownerNodeId,
                    "节点 " + ownerNodeId + " 的模板引用 {{" + expr + "}} 中的 \"" + head
                        + "\" 不是画布上的节点 id，运行时将解析为空。"
                        + "修复：先 get(target=canvas) 核对节点 id，模板里只能引用画布上存在的节点"));
                continue;
            }
            // 字段级 warning（2026-10-25 E）：head 命中但首段字段不在上游已知输出集——
            // 典型如引用 llm 的非 result 字段（llm 输出固定为 result 字符串）。
            // 只查首段（深层路径的类型传播不完整，深查必误报）；length/size 是运行时
            // 内置访问器（CollectionLengthAccessor），跳过；上游动态输出（null）跳过。
            if (reported.add(expr)) {
                String[] segments = expr.split("\\.");
                if (segments.length >= 2) {
                    String field = segments[1].trim();
                    Set<String> outputs = knownOutputs.get(head);
                    if (outputs != null && !outputs.contains(field)
                        && !"length".equals(field) && !"size".equals(field)) {
                        issues.add(new Issue("warning", "TEMPLATE_REF_FIELD", ownerNodeId,
                            "节点 " + ownerNodeId + " 的模板引用 {{" + expr + "}}：\"" + head
                                + "\" 的输出只有: " + String.join(", ", outputs)
                                + "，字段 \"" + field + "\" 运行期将解析为空"));
                    }
                }
            }
        }
    }

    private static String extractNodeId(String message) {
        Matcher matcher = Pattern.compile("节点\\s+(\\S+?)\\s*（").matcher(message);
        return matcher.find() ? matcher.group(1) : null;
    }

    // ---------------- 图工具 ----------------

    /** 找一条有向环，返回路径（含回到起点的闭合）；无环返回 null。迭代式 DFS 三色标记。 */
    private static List<String> findCycle(Set<String> ids, List<String[]> edges) {
        Map<String, List<String>> adj = new LinkedHashMap<>();
        for (String[] e : edges) {
            adj.computeIfAbsent(e[0], k -> new ArrayList<>()).add(e[1]);
        }
        Map<String, Integer> state = new HashMap<>();
        Map<String, String> parent = new HashMap<>();
        for (String id : ids) {
            if (state.getOrDefault(id, 0) != 0) {
                continue;
            }
            Deque<String> stack = new ArrayDeque<>();
            stack.push(id);
            state.put(id, 1);
            while (!stack.isEmpty()) {
                String current = stack.peek();
                boolean descended = false;
                for (String next : adj.getOrDefault(current, List.of())) {
                    int stateNext = state.getOrDefault(next, 0);
                    if (stateNext == 0) {
                        state.put(next, 1);
                        parent.put(next, current);
                        stack.push(next);
                        descended = true;
                        break;
                    } else if (stateNext == 1) {
                        List<String> cycle = new ArrayList<>();
                        String node = current;
                        cycle.add(next);
                        while (node != null && !node.equals(next)) {
                            cycle.add(node);
                            node = parent.get(node);
                        }
                        cycle.add(next);
                        java.util.Collections.reverse(cycle);
                        return cycle;
                    }
                }
                if (!descended) {
                    state.put(current, 2);
                    stack.pop();
                }
            }
        }
        return null;
    }

    private static Set<String> reachableFrom(String startId, List<String[]> edges) {
        Map<String, List<String>> adj = new LinkedHashMap<>();
        for (String[] e : edges) {
            adj.computeIfAbsent(e[0], k -> new ArrayList<>()).add(e[1]);
        }
        Set<String> visited = new HashSet<>();
        Deque<String> queue = new ArrayDeque<>();
        visited.add(startId);
        queue.add(startId);
        while (!queue.isEmpty()) {
            String current = queue.poll();
            for (String next : adj.getOrDefault(current, List.of())) {
                if (visited.add(next)) {
                    queue.add(next);
                }
            }
        }
        return visited;
    }
}
