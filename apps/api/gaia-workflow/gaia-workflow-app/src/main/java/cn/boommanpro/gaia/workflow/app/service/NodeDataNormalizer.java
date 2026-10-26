package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;

/**
 * 节点数据归一化器 —— 把模型产出的「简化扁平字段」转成执行引擎认识的结构。
 *
 * <p>与前端 {@code node-templates/normalize.ts} 一一对应。规范形状以「画布 UI + 执行引擎」
 * 的一致口径为准：llm 写 {@code data.inputsValues}，http 写 {@code data.api} / {@code headersValues}
 * / {@code data.body} / {@code data.timeout}。归一化必须与引擎真实读取路径对齐，
 * 否则会出现「校验放行、执行必坏」的形状分裂。</p>
 */
public final class NodeDataNormalizer {

    private NodeDataNormalizer() {
    }

    /** 按节点类型归一化 data（原地修改） */
    public static void normalize(String type, JSONObject data) {
        if (data == null) {
            return;
        }
        if (type == null) {
            type = "";
        }
        switch (type) {
            case "http":
                normalizeHttp(data);
                break;
            case "llm":
                normalizeLlm(data);
                break;
            case "start":
                normalizeStart(data);
                break;
            case "end":
                normalizeEnd(data);
                break;
            case "code":
                normalizeCode(data);
                break;
            case "string-format":
                normalizeStringFormat(data);
                break;
            case "loop":
                // 模型常把循环体 blocks/edges 写进 data（schema additionalProperties:false 正确拒绝，
                // 但模型屡教不改——2026-10-25 C09 实证）。data 层直接剥离，避免契约探针噪音；
                // SessionWorkflowDraftService.relocateLoopContainerFields 负责搬到节点级（引擎从节点级解析）。
                data.remove("blocks");
                data.remove("edges");
                break;
        }
        // 全类型通用：已是包装形状的 template 值做 token 空格收敛。历史归一化只覆盖
        // 「扁平字符串 → 包装」的转换路径，模型直接写包装对象时（2026-10-25 会话 b9019b24
        // 实证：body.json 已是 template 包装、token 带空格）漏网——前端渲染层按 `.` 拆段
        // 不 trim，合法引用显示 Unknown。幂等：{{a.b}} 再跑不变。
        canonicalizeTemplateWrappers(data, java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>()));
    }

    /**
     * HTTP 节点归一化：统一为执行引擎（HttpNodeParser）实际读取的规范形状——
     * {@code data.api.{method,url}}、{@code data.headersValues}、{@code data.paramsValues}、
     * {@code data.body.{bodyType,json}}、{@code data.timeout.{timeout,retryTimes}}。
     *
     * <p>只保留「扁平简写 → 规范形状」的 AI 人体工学转换；旧版 inputsValues 历史口径的
     * 迁移代码已于 2026-10-24 全严格治理时删除（存量库为测试数据已清空，
     * inputsValues 从不是引擎读取路径——保留迁移只会让「正确答案」不唯一）。</p>
     */
    private static void normalizeHttp(JSONObject data) {
        JSONObject api = asObjectOrNew(data, "api");
        // 模型常把 headers/params/body/timeout 塞进 api（2026-10-24 多轮实证反复撞 additionalProperties）：
        // 先搬回 data 顶层，再按扁平简写归一——语义唯一、不该让模型为放置位置多跑一轮
        for (String misplaced : new String[]{"headers", "headersValues", "params", "paramsValues", "body", "timeout"}) {
            if (api.containsKey(misplaced)) {
                Object value = api.remove(misplaced);
                if (value != null && !data.containsKey(misplaced)) {
                    data.set(misplaced, value);
                }
            }
        }
        migrateIntoApi(api, data, "method");
        migrateIntoApi(api, data, "url");
        // method 恒大写（契约枚举为大写；AI 可能写小写 "get"）
        String method = api.getStr("method");
        if (method != null) {
            api.set("method", method.trim().toUpperCase());
        }
        // url 裸字符串 → template 包装（2026-10-25 会话 b9019b24 实证）：schema 允许
        // string|template|constant 三种形状、引擎 parseUrl 双形状兼容，但画布表单控件按
        // IFlowTemplateValue 包装读取——裸字符串 URL 在编辑器里显示为空。与 body.json 对称。
        if (api.get("url") instanceof String) {
            api.set("url", new JSONObject().set("type", "template")
                .set("content", canonicalizeTemplateTokens((String) api.get("url"))));
        }

        JSONObject headers = extractLooseMap(data, "headers");
        mergeWrappedInto(asObjectOrNew(data, "headersValues"), headers);
        JSONObject params = extractLooseMap(data, "params");
        mergeWrappedInto(asObjectOrNew(data, "paramsValues"), params);

        normalizeHttpBody(data);
        normalizeHttpTimeout(data);
        fillStaticOutputs("http", data);
    }

    /** method/url：data.api 优先，其次扁平字段，取到后清掉扁平残留 */
    private static void migrateIntoApi(JSONObject api, JSONObject data, String key) {
        if (api.containsKey(key) && api.get(key) != null) {
            removeLoose(data, key);
            return;
        }
        Object flat = removeLoose(data, key);
        if (flat != null) {
            api.set(key, "method".equals(key) ? String.valueOf(flat).toUpperCase() : flat);
        }
    }

    /** 把散落的 headers/params 扁平对象收成 Map */
    private static JSONObject extractLooseMap(JSONObject data, String key) {
        Object flat = removeLoose(data, key);
        return flat instanceof JSONObject ? (JSONObject) flat : null;
    }

    /** {k: 原始值} → {k: {type:"constant", content:原始值}}（引擎 parseValue 只认包装形状） */
    private static void mergeWrappedInto(JSONObject target, JSONObject source) {
        if (source == null) {
            return;
        }
        for (String key : source.keySet()) {
            if (!target.containsKey(key)) {
                target.set(key, constantWrapper(source.get(key)));
            }
        }
    }

    private static void normalizeHttpBody(JSONObject data) {
        if (data.get("body") instanceof JSONObject && data.getJSONObject("body").containsKey("bodyType")) {
            // 规范形状但 json 是裸字符串：引擎按字面量发送、{{ }} 不渲染（2026-10-24 实证
            // 物流单请求体原样带着 {{start_1.orderId}} 发出去）——统一包成 template，无 token 的文本原样渲染
            JSONObject body = data.getJSONObject("body");
            if (body.get("json") instanceof String) {
                body.set("json", new JSONObject().set("type", "template")
                    .set("content", canonicalizeTemplateTokens((String) body.get("json"))));
            }
            return;
        }
        Object body = removeLoose(data, "body");
        if (body == null) {
            return;
        }
        if (body instanceof JSONObject && ((JSONObject) body).containsKey("bodyType")) {
            data.set("body", body);
            return;
        }
        if (body instanceof JSONObject) {
            Object content = ((JSONObject) body).get("content");
            if (content != null && !(content instanceof JSONObject)) {
                body = content;
            }
        }
        if (body != null) {
            // 纯文本请求体统一走 template 包装：SpEL 模板对无 {{}} 的文本原样渲染
            data.set("body", new JSONObject()
                .set("bodyType", "JSON")
                .set("json", new JSONObject().set("type", "template").set("content", canonicalizeTemplateTokens(String.valueOf(body)))));
        }
    }

    private static void normalizeHttpTimeout(JSONObject data) {
        if (data.get("timeout") instanceof JSONObject && data.getJSONObject("timeout").containsKey("timeout")) {
            return;
        }
        Object timeout = removeLoose(data, "timeout");
        if (timeout instanceof JSONObject) {
            timeout = ((JSONObject) timeout).get("content");
        }
        if (timeout instanceof Number) {
            data.set("timeout", new JSONObject().set("timeout", ((Number) timeout).intValue()));
        } else if (timeout instanceof String && !((String) timeout).trim().isEmpty()) {
            try {
                data.set("timeout", new JSONObject().set("timeout", Integer.parseInt(((String) timeout).trim())));
            } catch (NumberFormatException ignored) {
                // 非数字超时配置丢弃，引擎按默认 10s
            }
        }
    }

    /** 从 data 移除字段并返回原值；不存在返回 null */
    private static Object removeLoose(JSONObject data, String key) {
        Object value = data.get(key);
        if (value != null) {
            data.remove(key);
        }
        return value;
    }

    /**
     * 静态输出契约对齐：schema 的 x-gaia-outputs 声明了该节点执行后写入 memory 的固定字段
     * （http=body/headers/statusCode、llm=result）。前端变量面板靠 data.outputs 推变量。
     * <p>声明集与运行时对齐（2026-10-25 D2）：固定输出节点的 properties 整体替换为声明集——
     * 运行时不会产出声明集之外的字段（LlmNode 只写 result），AI 自声明的额外输出
     * （如 llm 的 riskLevel）运行期恒为 null，却会进前端变量树诱导下游引用，
     * 直到落版才被 DANGLING_REF_FIELD 打回（会话 b9019b24 实证）。已有声明键保留原类型。</p>
     */
    private static void fillStaticOutputs(String type, JSONObject data) {
        java.util.List<String> declared = NodeSchemaRegistry.staticOutputs(type);
        if (declared == null || declared.isEmpty()) {
            return;
        }
        JSONObject outputs = asObjectOrNew(data, "outputs");
        JSONObject properties = outputs.getJSONObject("properties");
        if (properties == null) {
            properties = new JSONObject();
        }
        JSONObject aligned = new JSONObject();
        for (String field : declared) {
            Object existing = properties.get(field);
            aligned.set(field, existing instanceof JSONObject ? existing : new JSONObject().set("type", "string"));
        }
        outputs.set("properties", aligned);
        if (outputs.getStr("type") == null) {
            outputs.set("type", "object");
        }
    }

    /**
     * 对象输出声明的「引用驱动补全」（文档级，原地修改；2026-10-25 会话 84bf1596 实证）：
     * code 声明 {@code buyer:{type:"object"}} 但不写 properties 时，下游模板
     * {@code {{code.buyer.country}}} 在前端变量树查不到子字段——渲染成 Unknown
     * （运行期 SpEL 深路径解析正常，纯展示契约缺失，且提示词要求「object 写全 properties」
     * 模型不一定遵守）。扫描全图引用（ref 深路径 + 模板 token），把「被引用而未声明」的
     * 子字段补进 object 声明（类型默认 string）。length/size 是运行时内置访问器，跳过。
     */
    public static void completeObjectOutputDeclarations(JSONObject doc) {
        if (doc == null) {
            return;
        }
        JSONArray nodes = doc.getJSONArray("nodes");
        if (nodes == null || nodes.isEmpty()) {
            return;
        }
        // nodeId -> outputs.properties（活引用，补全直接落文档）
        java.util.Map<String, JSONObject> outputsByNode = new java.util.HashMap<>();
        for (Object item : nodes) {
            JSONObject node = (JSONObject) item;
            if (node == null || node.getStr("id") == null) {
                continue;
            }
            JSONObject data = node.getJSONObject("data");
            JSONObject outputs = data != null ? data.getJSONObject("outputs") : null;
            if (outputs != null && outputs.getJSONObject("properties") != null) {
                outputsByNode.put(node.getStr("id"), outputs);
            }
        }
        if (outputsByNode.isEmpty()) {
            return;
        }
        for (Object item : nodes) {
            JSONObject node = (JSONObject) item;
            JSONObject data = node != null ? node.getJSONObject("data") : null;
            if (data == null) {
                continue;
            }
            seedFromValue(data, outputsByNode);
        }
    }

    /** 递归扫节点 data：ref 深路径与 template content 都交给 seedDeepPath */
    private static void seedFromValue(Object value, java.util.Map<String, JSONObject> outputsByNode) {
        if (value instanceof JSONObject) {
            JSONObject obj = (JSONObject) value;
            if ("ref".equals(obj.getStr("type")) && obj.get("content") instanceof JSONArray) {
                java.util.List<String> path = new java.util.ArrayList<>();
                for (Object seg : (JSONArray) obj.get("content")) {
                    path.add(String.valueOf(seg));
                }
                seedDeepPath(path, outputsByNode);
                return;
            }
            if ("template".equals(obj.getStr("type")) && obj.get("content") instanceof String) {
                seedFromTemplate((String) obj.get("content"), outputsByNode);
                return;
            }
            for (String key : obj.keySet()) {
                seedFromValue(obj.get(key), outputsByNode);
            }
        } else if (value instanceof JSONArray) {
            for (Object item : (JSONArray) value) {
                seedFromValue(item, outputsByNode);
            }
        }
    }

    private static void seedFromTemplate(String content, java.util.Map<String, JSONObject> outputsByNode) {
        if (content == null || !content.contains("{{")) {
            return;
        }
        java.util.regex.Matcher matcher = java.util.regex.Pattern
            .compile("\\{\\{\\s*([^{}]+?)\\s*}}").matcher(content);
        while (matcher.find()) {
            String expr = matcher.group(1).trim();
            String head = expr.split("[.(\\s]", 2)[0].trim();
            if (head.isEmpty() || !outputsByNode.containsKey(head)) {
                continue;
            }
            String[] segments = expr.split("\\.");
            java.util.List<String> path = new java.util.ArrayList<>();
            path.add(head);
            // head 已是 segments[0]（token 首段即节点 id），从第 2 段开始收集，避免路径里 id 重复
            for (int i = 1; i < segments.length; i++) {
                String trimmed = segments[i].trim();
                if (!trimmed.isEmpty()) {
                    path.add(trimmed);
                }
            }
            seedDeepPath(path, outputsByNode);
        }
    }

    /** 路径 [nodeId, f1, f2, ...]：f1 声明为 object 而后续段未声明时逐层补 */
    private static void seedDeepPath(java.util.List<String> path, java.util.Map<String, JSONObject> outputsByNode) {
        if (path.size() < 3) {
            return;
        }
        JSONObject outputs = outputsByNode.get(path.get(0));
        JSONObject properties = outputs.getJSONObject("properties");
        JSONObject current = properties.getJSONObject(path.get(1));
        if (current == null || !"object".equals(current.getStr("type"))) {
            return; // 非对象字段不猜（数组/标量的越界引用是校验器的事）
        }
        for (int i = 2; i < path.size(); i++) {
            String field = path.get(i);
            if ("length".equals(field) || "size".equals(field)) {
                return; // 运行时内置访问器
            }
            JSONObject props = current.getJSONObject("properties");
            if (props == null) {
                props = new JSONObject();
                current.set("properties", props);
            }
            JSONObject next = props.getJSONObject(field);
            if (next == null) {
                next = new JSONObject().set("type", i == path.size() - 1 ? "string" : "object");
                props.set(field, next);
            }
            current = next;
        }
    }

    private static JSONObject asObjectOrNew(JSONObject data, String key) {
        Object value = data.get(key);
        if (value instanceof JSONObject) {
            return (JSONObject) value;
        }
        JSONObject created = new JSONObject();
        data.set(key, created);
        return created;
    }

    private static JSONObject constantWrapper(Object content) {
        JSONObject wrapper = new JSONObject().set("type", "constant").set("content", content);
        if (content instanceof String) {
            wrapper.set("schema", new JSONObject().set("type", "string"));
        }
        return wrapper;
    }

    /** LLM 节点：prompt/systemPrompt/temperature/modelName/apiKey/apiHost 扁平字段 → inputsValues */
    private static void normalizeLlm(JSONObject data) {
        JSONObject iv = ensureInputsValues(data);

        moveToTemplate(iv, data, "prompt");
        moveToTemplate(iv, data, "systemPrompt");
        moveToConstant(iv, data, "temperature");
        moveToConstant(iv, data, "modelName");
        moveToConstant(iv, data, "apiKey");
        moveToConstant(iv, data, "apiHost");
        alignFormInputs(data);
        // 固定输出对齐（outputs = {result}）只适用于 text 模式；json 模式的 outputs.properties
        // 是输出字段声明集（运行时把模型 JSON 解析成声明字段，机制与 code 一致）——保留声明，
        // 缺声明的配置错误由 canonicalizer checkNodeSemantics fatal 拦截。
        if (!"json".equalsIgnoreCase(data.getStr("outputMode"))) {
            fillStaticOutputs("llm", data);
        } else if (data.getJSONObject("outputs") != null
            && data.getJSONObject("outputs").getJSONObject("properties") != null) {
            // text → json 切换的残留清理（会话 020729 实证）：result 是 text 模式专属输出，
            // json 模式声明集里残留会以 null 出现在运行输出并误导前端变量面板
            data.getJSONObject("outputs").getJSONObject("properties").remove("result");
        }
    }

    /**
     * 表单 schema 对齐（2026-10-18 E2E 实证）：前端属性面板是纯 schema 驱动
     * （FormInputs 只渲染 data.inputs.properties，extra.formComponent 选提示词编辑器），
     * 手工添加走前端模板自带完整 inputs，而模型常自创声明（如 inputs.properties.text）
     * ——导致 AI 节点表单缺字段、6 个配置值无 UI 承载。此处以
     * node-schemas/llm.schema.json 的 x-gaia-form-inputs 扩展为单一事实源，
     * 归一化后整体替换 data.inputs。inputs 只是表单 schema：llm 运行时的模板引用
     * （{{nodeId.field}}）由 LlmNode 独立解析，不受此影响。
     */
    private static void alignFormInputs(JSONObject data) {
        JSONObject canonical = llmFormInputsSchema();
        if (canonical != null) {
            data.set("inputs", canonical);
        }
    }

    /** llm 规范表单 schema（来自 x-gaia-form-inputs 扩展；缺失时跳过对齐，保持宽容） */
    private static volatile JSONObject cachedLlmFormInputs;
    private static volatile boolean llmFormInputsResolved;

    private static JSONObject llmFormInputsSchema() {
        if (cachedLlmFormInputs != null) {
            return new JSONObject(cachedLlmFormInputs.toString());
        }
        if (llmFormInputsResolved) {
            return null;
        }
        synchronized (NodeDataNormalizer.class) {
            if (cachedLlmFormInputs == null && !llmFormInputsResolved) {
                try {
                    String raw = NodeSchemaRegistry.rawSchema("llm");
                    if (raw != null) {
                        JSONObject extension = JSONUtil.parseObj(raw)
                            .getJSONObject("x-gaia-form-inputs");
                        if (extension != null && extension.getJSONObject("properties") != null) {
                            cachedLlmFormInputs = extension;
                        }
                    }
                } catch (Exception e) {
                    // schema 扩展缺失/损坏不阻断归一化，仅放弃表单对齐
                }
                llmFormInputsResolved = true;
            }
        }
        return cachedLlmFormInputs != null
            ? new JSONObject(cachedLlmFormInputs.toString())
            : null;
    }

    /** Start 节点：自动补齐输出字段的 description 与默认值 */
    /** start.outputs 里不是参数声明的元字段（提升扁平声明到 properties 时跳过） */
    private static final java.util.Set<String> START_OUTPUTS_META_KEYS =
        java.util.Set.of("type", "properties", "required", "title", "description", "additionalProperties");

    private static void normalizeStart(JSONObject data) {
        Object outputs = data.get("outputs");
        if (!(outputs instanceof JSONObject)) {
            data.set("outputs", new JSONObject().set("type", "object").set("properties", new JSONObject()));
            outputs = data.get("outputs");
        }
        JSONObject outputsObj = (JSONObject) outputs;
        if (!(outputsObj.get("properties") instanceof JSONObject)) {
            // 模型常把参数声明直接写在 outputs 下（outputs:{orderId:{type:string}}，漏了 properties 一层），
            // 旧逻辑直接置空 → 「没有定义任何输出参数」被拒（2026-10-24 实证）。把看起来是声明的键提进 properties
            JSONObject lifted = new JSONObject();
            for (String key : new java.util.ArrayList<>(outputsObj.keySet())) {
                if (!START_OUTPUTS_META_KEYS.contains(key) && outputsObj.get(key) instanceof JSONObject) {
                    lifted.set(key, outputsObj.remove(key));
                }
            }
            outputsObj.set("properties", lifted);
        }
        if (outputsObj.getStr("type") == null) {
            outputsObj.set("type", "object");
        }
        JSONObject properties = outputsObj.getJSONObject("properties");
        for (String key : properties.keySet()) {
            Object propObj = properties.get(key);
            if (!(propObj instanceof JSONObject)) {
                continue;
            }
            JSONObject prop = (JSONObject) propObj;
            if (!prop.containsKey("description")) {
                prop.set("description", key);
            }
            if (!prop.containsKey("default")) {
                String type = prop.getStr("type");
                if (type != null) {
                    prop.set("default", defaultValueForType(type));
                }
            }
        }
    }

    /** End 节点：确保 inputsValues 与 inputs 结构存在 */
    private static void normalizeEnd(JSONObject data) {
        JSONObject iv = ensureInputsValues(data);
        if (!(data.get("inputs") instanceof JSONObject)) {
            data.set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()));
        }
        // 表单声明对齐（2026-10-18 会话 3d481faf 实证）：FormInputs 只渲染
        // inputs.properties 里声明的字段，inputsValues 有值而声明缺失 = 输出字段无 UI 承载
        JSONObject inputs = data.getJSONObject("inputs");
        JSONObject properties = inputs.getJSONObject("properties");
        if (properties == null) {
            properties = new JSONObject();
            inputs.set("properties", properties);
        }
        for (String key : iv.keySet()) {
            if (!properties.containsKey(key)) {
                properties.set(key, new JSONObject().set("type", "string"));
            }
        }
    }

    /**
     * Code 节点：inputsValues 绑了值但 inputs.properties 没声明的入参自动补声明。
     * 引擎只注入「已声明」的入参——2026-10-24 会话 b6e34195 实证：模型绑了 8 个 ref、
     * 只声明 2 个，运行时 orderId 等全部 undefined，它自己写的校验抛「缺少 orderId」，
     * update 却回 ok，12 轮整流调试找不到原因。声明类型按常量值推断，ref 退化为 string
     * （声明只影响表单/变量面板，不参与运行期取值）。
     */
    private static void normalizeCode(JSONObject data) {
        normalizeCodeScript(data);
        if (!(data.get("inputsValues") instanceof JSONObject)) {
            return;
        }
        JSONObject iv = data.getJSONObject("inputsValues");
        if (!(data.get("inputs") instanceof JSONObject)) {
            data.set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()));
        }
        JSONObject inputs = data.getJSONObject("inputs");
        if (!(inputs.get("properties") instanceof JSONObject)) {
            inputs.set("properties", new JSONObject());
        }
        JSONObject properties = inputs.getJSONObject("properties");
        for (String key : iv.keySet()) {
            if (!properties.containsKey(key)) {
                properties.set(key, new JSONObject().set("type", inferDeclaredType(iv.get(key))));
            }
        }
    }

    /**
     * code 的 script 扁平简写归一，<b>只处理意图无歧义的形态</b>：script 裸字符串 / code 字符串
     * <b>且</b>带平级 language（模型最常见写法，2026-10-24 实证连拒 3 次「/script: string found,
     * object expected; language 不在契约里」）→ {@code script:{language, content}}。
     * 不带 language 的裸字符串保持既定决策（契约拒绝，见 NodeDataNormalizerStringFormatTest）——
     * 语言不明不猜。
     */
    private static void normalizeCodeScript(JSONObject data) {
        Object flatLanguage = data.get("language");
        String language = flatLanguage != null && !String.valueOf(flatLanguage).trim().isEmpty()
            ? String.valueOf(flatLanguage).trim() : null;
        if (language == null) {
            return;
        }
        Object script = data.get("script");
        if (script instanceof String) {
            data.remove("language");
            data.set("script", new JSONObject().set("language", language).set("content", script));
        } else if (!(script instanceof JSONObject) && data.get("code") instanceof String) {
            data.remove("language");
            data.set("script", new JSONObject().set("language", language).set("content", removeLoose(data, "code")));
        } else if (script instanceof JSONObject) {
            data.remove("language");
            JSONObject scriptObj = (JSONObject) script;
            if (scriptObj.getStr("language") == null) {
                scriptObj.set("language", language);
            }
            if (scriptObj.get("content") == null && scriptObj.get("code") != null) {
                scriptObj.set("content", scriptObj.remove("code"));
            }
        }
    }

    /** 常量包装值按内容推断声明类型；ref/expression/template 运行期才知道，退化为 string */
    private static String inferDeclaredType(Object wrapped) {
        if (wrapped instanceof JSONObject && "constant".equals(((JSONObject) wrapped).getStr("type"))) {
            Object content = ((JSONObject) wrapped).get("content");
            if (content instanceof Boolean) return "boolean";
            if (content instanceof Number) return "number";
            if (content instanceof cn.hutool.json.JSONArray) return "array";
            if (content instanceof JSONObject) return "object";
        }
        return "string";
    }

    /**
     * string-format 节点归一化（2026-10-18 会话 3d481faf 实证的三类畸形）：
     * ① script 裸字符串 → {language, content} 对象（引擎只认对象，schema 曾宽容放行）；
     * ② language 简写别名（spel/vue/thymeleaf）→ 引擎合法值；
     * ③ 缺 outputs 声明 → 补 formatStringResult（前端变量面板靠 outputs 推变量，
     *    缺声明 = 下游 ref 显示「变量不存在」）。
     */
    private static void normalizeStringFormat(JSONObject data) {
        JSONObject outputs = asObjectOrNew(data, "outputs");
        // 注意用 getStr 判空：hutool 的 getJSONObject 对字符串值会尝试按 JSON 解析而抛异常
        if (outputs.getStr("type") == null) {
            outputs.set("type", "object");
        }
        JSONObject properties = outputs.getJSONObject("properties");
        if (properties == null) {
            properties = new JSONObject();
            outputs.set("properties", properties);
        }
        if (!properties.containsKey("formatStringResult")) {
            properties.set("formatStringResult", new JSONObject().set("type", "string"));
        }
    }

    // ---------------- 工具方法 ----------------

    private static JSONObject ensureInputsValues(JSONObject data) {
        Object iv = data.get("inputsValues");
        if (!(iv instanceof JSONObject)) {
            iv = new JSONObject();
            data.set("inputsValues", iv);
        }
        return (JSONObject) iv;
    }

    /** 把扁平字段移动为 constant 类型引用（仅当该字段在 inputsValues 里尚未设置时；已是包装形状的原样移动） */
    private static void moveToConstant(JSONObject iv, JSONObject data, String key) {
        if (!data.containsKey(key)) {
            return;
        }
        if (!iv.containsKey(key)) {
            Object content = data.get(key);
            if (content instanceof JSONObject && isWrapperType(((JSONObject) content).getStr("type"))) {
                iv.set(key, content);
            } else {
                JSONObject wrapper = new JSONObject()
                    .set("type", "constant")
                    .set("content", content);
                if (content instanceof String) {
                    wrapper.set("schema", new JSONObject().set("type", "string"));
                }
                iv.set(key, wrapper);
            }
        }
        data.remove(key);
    }

    /**
     * 把扁平字段移动为 template 类型引用（LLM 的 prompt/systemPrompt；已是包装形状的原样移动）。
     * 字符串内容统一过 {@link #canonicalizeTemplateTokens}——带空格的 {{ a.b }} 收敛为 {{a.b}}，
     * 与前端变量校验（key 段不 trim）和引擎渲染保持同一种规范形。
     */
    private static void moveToTemplate(JSONObject iv, JSONObject data, String key) {
        if (!data.containsKey(key)) {
            return;
        }
        if (!iv.containsKey(key)) {
            Object content = data.get(key);
            if (content instanceof JSONObject && isWrapperType(((JSONObject) content).getStr("type"))) {
                iv.set(key, canonicalizeWrapperTokens((JSONObject) content));
            } else if (content instanceof String) {
                iv.set(key, new JSONObject().set("type", "template").set("content", canonicalizeTemplateTokens((String) content)));
            } else if (content instanceof JSONObject || content instanceof JSONArray) {
                iv.set(key, new JSONObject().set("type", "constant").set("content", content));
            }
        }
        data.remove(key);
    }

    /** template 包装值的 content 做 token 规范化（非字符串 content 原样返回） */
    private static JSONObject canonicalizeWrapperTokens(JSONObject wrapper) {
        if (wrapper.get("content") instanceof String) {
            wrapper.set("content", canonicalizeTemplateTokens((String) wrapper.get("content")));
        }
        return wrapper;
    }

    /** {{ a.b }} → {{a.b}}：只收敛定界符内侧首尾空白，不动表达式内部（如 a + b 的运算空格） */
    static String canonicalizeTemplateTokens(String content) {
        if (content == null || !content.contains("{{")) {
            return content;
        }
        return content.replaceAll("\\{\\{\\s*([^{}]*?)\\s*}}", "{{$1}}");
    }

    /**
     * 递归收敛 data 内所有 template 包装值的 token 空格（原地修改）。
     * 只动 {@code {type:"template", content:string}} 的 content，其余结构原样。
     */
    private static void canonicalizeTemplateWrappers(Object value, java.util.Set<Object> visited) {
        if (!(value instanceof JSONObject) && !(value instanceof JSONArray)) {
            return;
        }
        if (!visited.add(value)) {
            return;
        }
        if (value instanceof JSONObject) {
            JSONObject obj = (JSONObject) value;
            if ("template".equals(obj.getStr("type")) && obj.get("content") instanceof String) {
                obj.set("content", canonicalizeTemplateTokens((String) obj.get("content")));
                return;
            }
            for (String key : obj.keySet()) {
                canonicalizeTemplateWrappers(obj.get(key), visited);
            }
        } else {
            for (Object item : (JSONArray) value) {
                canonicalizeTemplateWrappers(item, visited);
            }
        }
    }

    /**
     * code 入参声明类型传播（2026-10-25 F2）：inputsValues 的 ref 指向上游已声明输出时，
     * 拷贝上游声明类型覆盖占位的 "string"（inferDeclaredType 对 ref 一律退化为 string，
     * 会话 b9019b24 实证：buyer(object)/itemsList(array) 在表单里显示为 string）。
     * 声明只影响表单/变量面板展示，不参与运行期取值；幂等——非 string 占位或类型一致时不改。
     *
     * @param node         code 节点（{id,type,data}）
     * @param nodeDataById 全图查找器：节点 id → 其 data（找不到返回 null）
     */
    public static void propagateInputTypes(JSONObject node, java.util.function.Function<String, JSONObject> nodeDataById) {
        if (node == null || !"code".equals(node.getStr("type"))) {
            return;
        }
        JSONObject data = node.getJSONObject("data");
        JSONObject iv = data != null ? data.getJSONObject("inputsValues") : null;
        JSONObject inputs = data != null ? data.getJSONObject("inputs") : null;
        JSONObject properties = inputs != null ? inputs.getJSONObject("properties") : null;
        if (iv == null || properties == null) {
            return;
        }
        for (String key : iv.keySet()) {
            Object bound = iv.get(key);
            if (!(bound instanceof JSONObject) || !"ref".equals(((JSONObject) bound).getStr("type"))) {
                continue;
            }
            JSONArray content = ((JSONObject) bound).getJSONArray("content");
            if (content == null || content.size() < 2 || !(content.get(0) instanceof String) || !(content.get(1) instanceof String)) {
                continue;
            }
            JSONObject upstreamData = nodeDataById.apply((String) content.get(0));
            JSONObject upstreamOutputs = upstreamData != null ? upstreamData.getJSONObject("outputs") : null;
            JSONObject upstreamProps = upstreamOutputs != null ? upstreamOutputs.getJSONObject("properties") : null;
            JSONObject upstreamField = upstreamProps != null ? upstreamProps.getJSONObject((String) content.get(1)) : null;
            String upstreamType = upstreamField != null ? upstreamField.getStr("type") : null;
            if (upstreamType == null || upstreamType.isEmpty()) {
                continue;
            }
            JSONObject declaration = properties.getJSONObject(key);
            if (declaration != null && "string".equals(declaration.getStr("type"))) {
                declaration.set("type", upstreamType);
            }
        }
    }

    /** 是否已是值包装形状（constant/ref/template）——避免把包装再包一层 */
    private static boolean isWrapperType(String type) {
        return "constant".equals(type) || "ref".equals(type) || "template".equals(type);
    }

    private static Object defaultValueForType(String type) {
        switch (type == null ? "" : type) {
            case "string": return "";
            case "number": return 0;
            case "boolean": return false;
            case "object": return new JSONObject();
            case "array": return new JSONArray();
            default: return null;
        }
    }
}
