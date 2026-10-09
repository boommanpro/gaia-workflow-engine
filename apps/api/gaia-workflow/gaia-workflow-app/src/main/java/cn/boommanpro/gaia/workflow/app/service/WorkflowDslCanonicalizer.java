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
            int llmFilled = fillLlmDefaults(type, mergedData, llmDefaults);
            NodeDataNormalizer.normalize(type, mergedData);
            if (llmFilled > 0) {
                repairs.add("节点 \"" + id + "\"（LLM）缺少模型配置，已自动填入平台默认模型（"
                    + llmFilled + " 项），用户无需手动提供 API Key");
            }
            if (llmPromptDerived(type, mergedData, llmDefaults)) {
                String title = mergedData.getStr("title");
                String derived = "请完成" + (title != null && !title.trim().isEmpty() ? "「" + title.trim() + "」" : "当前环节")
                    + "任务：阅读输入内容并给出结果。";
                mergedData.set("prompt", derived);
                NodeDataNormalizer.normalize(type, mergedData);
                repairs.add("节点 \"" + id + "\"（LLM）缺少 prompt，已按节点标题生成占位提示词，落版后可在编辑器中修改");
                warnings.add("节点 " + id + "（LLM）的提示词是系统生成的占位内容，请确认后修改为真实业务提示词");
            }
            if ("http".equals(type) && llmDefaults != null && isBlank(mergedData.get("url"))
                && !hasWrapperValue(mergedData, "url")) {
                mergedData.set("method", isBlank(mergedData.get("method")) ? "GET" : mergedData.get("method"));
                mergedData.set("url", "https://example.com/api");
                NodeDataNormalizer.normalize(type, mergedData);
                repairs.add("节点 \"" + id + "\"（HTTP）缺少 url，已填占位地址 https://example.com/api，落版后请改为真实地址");
                warnings.add("节点 " + id + "（HTTP）的 url 是占位地址，必须修改后才能真正调用");
            }
            if ("code".equals(type) && llmDefaults != null && !hasScript(mergedData)) {
                mergedData.set("script", new JSONObject()
                    .set("language", "java")
                    .set("content", "return input;"));
                NodeDataNormalizer.normalize(type, mergedData);
                repairs.add("节点 \"" + id + "\"（Code）缺少 script，已填占位脚本 return input，落版后请修改为真实逻辑");
                warnings.add("节点 " + id + "（Code）的脚本是占位内容，请修改为真实业务逻辑");
            }

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
        return new Result(out.toString(), repairs, fatalIssues, warnings, nodes.size());
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
                        fatalIssues.add("节点 " + id + "（LLM）缺少 prompt/systemPrompt，没有提示词无法完成任何任务");
                    }
                    if (iv == null || iv.get("modelName") == null) {
                        warnings.add("节点 " + id + "（LLM）未指定 modelName，节点运行时将缺少模型配置");
                    }
                    break;
                }
                case "http": {
                    if (!hasConstantContent(iv, "url")) {
                        fatalIssues.add("节点 " + id + "（HTTP）缺少 url，无法发起请求");
                    }
                    if (iv == null || iv.get("method") == null) {
                        warnings.add("节点 " + id + "（HTTP）未指定 method，将默认使用 GET");
                    }
                    break;
                }
                case "code": {
                    if (!hasScript(data)) {
                        fatalIssues.add("节点 " + id + "（Code）缺少 script，空脚本无法产出结果");
                    }
                    break;
                }
                case "start": {
                    JSONObject outputs = data.getJSONObject("outputs");
                    JSONObject properties = outputs == null ? null : outputs.getJSONObject("properties");
                    if (properties == null || properties.isEmpty()) {
                        warnings.add("节点 " + id + "（开始）没有定义任何输出参数，下游节点将拿不到输入");
                    }
                    break;
                }
                case "end": {
                    if (iv == null || iv.isEmpty()) {
                        warnings.add("节点 " + id + "（结束）没有引用任何上游输出，工作流运行结果将为空");
                    }
                    break;
                }
                case "condition":
                case "multi-condition": {
                    JSONArray conditions = data.getJSONArray("conditions");
                    if (conditions == null || conditions.isEmpty()) {
                        warnings.add("节点 " + id + "（条件）没有配置任何条件分支");
                    }
                    break;
                }
                case "branches": {
                    JSONArray branches = data.getJSONArray("branches");
                    if (branches == null || branches.isEmpty()) {
                        warnings.add("节点 " + id + "（分支）没有配置任何分支");
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

    /**
     * llm 节点 prompt/systemPrompt 均缺失时是否可派生占位提示词。
     * 仅限 agent 落版路径（llmDefaults != null）：编辑器手动发布保持严格校验，
     * 弱模型反复漏写 data 时不至于陷入「报错→重试」死循环，占位内容交给用户在确认卡/编辑器里修正。
     */
    private static boolean llmPromptDerived(String type, JSONObject data, LlmDefaults llmDefaults) {
        if (!"llm".equals(type) || llmDefaults == null) {
            return false;
        }
        // normalize 之后 prompt/systemPrompt 已进 inputsValues
        JSONObject iv = data.getJSONObject("inputsValues");
        boolean hasPrompt = iv != null && (iv.get("prompt") != null || iv.get("systemPrompt") != null);
        if (hasPrompt) {
            return false;
        }
        // data 扁平字段兜底检查（normalize 未覆盖的非标准写法）
        return isBlank(data.get("prompt")) && isBlank(data.get("systemPrompt"));
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

    private static boolean hasConstantContent(JSONObject iv, String key) {
        return hasWrapperContent(iv, key, "constant") || hasWrapperContent(iv, key, "template");
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
