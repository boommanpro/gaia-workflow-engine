package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;

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
            case "string-format":
            case "variable":
            case "condition":
            case "branches":
            case "loop":
            case "assignee":
                normalizeRefShorthand(data);
                break;
            default:
                normalizeRefShorthand(data);
                break;
        }
    }

    /**
     * HTTP 节点归一化：统一为执行引擎（HttpNodeParser）实际读取的规范形状——
     * {@code data.api.{method,url}}、{@code data.headersValues}、{@code data.paramsValues}、
     * {@code data.body.{bodyType,json}}、{@code data.timeout.{timeout,retryTimes}}。
     *
     * <p>历史教训：旧版归一化把扁平字段收进 {@code inputsValues}，而引擎从不读它——
     * 画布 UI 和引擎都写/读 {@code data.api}，结果 agent 产的 http 节点能过校验、
     * 试运行必报「HTTP节点缺少有效的 api 配置」。规范形状以画布+引擎的一致口径为准，
     * 这里同时兼容迁移：扁平字段（agent 简写）与旧版 inputsValues 包装（历史落库数据）。</p>
     */
    private static void normalizeHttp(JSONObject data) {
        JSONObject api = asObjectOrNew(data, "api");
        migrateIntoApi(api, data, "method");
        migrateIntoApi(api, data, "url");

        JSONObject headers = extractLooseMap(data, "headers");
        mergeWrappedInto(asObjectOrNew(data, "headersValues"), headers);
        JSONObject params = extractLooseMap(data, "params");
        mergeWrappedInto(asObjectOrNew(data, "paramsValues"), params);

        normalizeHttpBody(data);
        normalizeHttpTimeout(data);
    }

    /** method/url：data.api 优先，其次扁平字段，最后旧版 inputsValues 包装，取到后清掉残留 */
    private static void migrateIntoApi(JSONObject api, JSONObject data, String key) {
        if (api.containsKey(key) && api.get(key) != null) {
            removeLoose(data, key);
            return;
        }
        Object flat = removeLoose(data, key);
        if (flat != null) {
            api.set(key, "method".equals(key) ? String.valueOf(flat).toUpperCase() : flat);
            return;
        }
        Object legacy = takeFromInputsValues(data, key);
        if (legacy != null) {
            api.set(key, unwrapConstantToString(legacy));
        }
    }

    /** 把散落的 headers/params 收成 Map：扁平字段优先，其次旧版 inputsValues 包装的 content */
    private static JSONObject extractLooseMap(JSONObject data, String key) {
        Object flat = removeLoose(data, key);
        if (flat instanceof JSONObject) {
            return (JSONObject) flat;
        }
        Object legacy = takeFromInputsValues(data, key);
        if (legacy instanceof JSONObject) {
            Object content = ((JSONObject) legacy).get("content");
            if (content instanceof JSONObject) {
                return (JSONObject) content;
            }
        }
        return null;
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
            removeLegacyInputsValue(data, "body");
            return;
        }
        Object body = removeLoose(data, "body");
        if (body == null) {
            body = takeFromInputsValues(data, "body");
        }
        if (body == null) {
            return;
        }
        if (body instanceof JSONObject) {
            Object content = ((JSONObject) body).get("content");
            if (content != null && !(content instanceof JSONObject)) {
                body = content;
            } else if (content instanceof JSONObject) {
                body = ((JSONObject) content).get("content");
            }
        }
        if (body instanceof JSONObject && ((JSONObject) body).containsKey("bodyType")) {
            data.set("body", body);
            return;
        }
        if (body != null) {
            // 纯文本请求体统一走 template 包装：SpEL 模板对无 {{}} 的文本原样渲染
            data.set("body", new JSONObject()
                .set("bodyType", "JSON")
                .set("json", new JSONObject().set("type", "template").set("content", String.valueOf(body))));
        }
    }

    private static void normalizeHttpTimeout(JSONObject data) {
        if (data.get("timeout") instanceof JSONObject && data.getJSONObject("timeout").containsKey("timeout")) {
            removeLegacyInputsValue(data, "timeout");
            return;
        }
        Object timeout = removeLoose(data, "timeout");
        if (timeout == null) {
            timeout = takeFromInputsValues(data, "timeout");
        }
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

    /** 从 inputsValues 取出并移除指定键的包装值（无 inputsValues 或无该键返回 null） */
    private static Object takeFromInputsValues(JSONObject data, String key) {
        Object iv = data.get("inputsValues");
        if (!(iv instanceof JSONObject)) {
            return null;
        }
        JSONObject inputsValues = (JSONObject) iv;
        Object value = inputsValues.get(key);
        if (value != null) {
            inputsValues.remove(key);
        }
        return value;
    }

    private static void removeLegacyInputsValue(JSONObject data, String key) {
        Object iv = data.get("inputsValues");
        if (iv instanceof JSONObject) {
            ((JSONObject) iv).remove(key);
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

    /** {type:constant, content:x} → x；其他原样返回 */
    private static Object unwrapConstantToString(Object wrapper) {
        if (wrapper instanceof JSONObject && "constant".equals(((JSONObject) wrapper).getStr("type"))) {
            return ((JSONObject) wrapper).get("content");
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
    }

    /** Start 节点：自动补齐输出字段的 description 与默认值 */
    private static void normalizeStart(JSONObject data) {
        Object outputs = data.get("outputs");
        if (!(outputs instanceof JSONObject)) {
            data.set("outputs", new JSONObject().set("type", "object").set("properties", new JSONObject()));
            outputs = data.get("outputs");
        }
        JSONObject outputsObj = (JSONObject) outputs;
        if (!(outputsObj.get("properties") instanceof JSONObject)) {
            outputsObj.set("properties", new JSONObject());
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
        ensureInputsValues(data);
        if (!(data.get("inputs") instanceof JSONObject)) {
            data.set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()));
        }
    }

    /**
     * ref 简写归一化：{ref:"a.b"} → {type:"ref", content:"a.b"}。
     * 递归扫描 inputsValues，并处理 conditions/branches 里的 left/right。
     */
    private static void normalizeRefShorthand(JSONObject data) {
        Object iv = data.get("inputsValues");
        if (!(iv instanceof JSONObject)) {
            return;
        }
        JSONObject inputsValues = (JSONObject) iv;
        for (String key : inputsValues.keySet()) {
            Object val = inputsValues.get(key);
            if (val instanceof JSONObject) {
                normalizeValueRef((JSONObject) val);
            }
        }
        if (data.get("conditions") instanceof JSONArray) {
            JSONArray conditions = data.getJSONArray("conditions");
            for (int i = 0; i < conditions.size(); i++) {
                if (conditions.get(i) instanceof JSONObject) {
                    normalizeConditionRef(conditions.getJSONObject(i));
                }
            }
        }
        if (data.get("branches") instanceof JSONArray) {
            JSONArray branches = data.getJSONArray("branches");
            for (int i = 0; i < branches.size(); i++) {
                Object branchObj = branches.get(i);
                if (!(branchObj instanceof JSONObject)) {
                    continue;
                }
                JSONObject branch = (JSONObject) branchObj;
                if (branch.get("conditions") instanceof JSONArray) {
                    JSONArray branchConditions = branch.getJSONArray("conditions");
                    for (int j = 0; j < branchConditions.size(); j++) {
                        if (branchConditions.get(j) instanceof JSONObject) {
                            normalizeConditionRef(branchConditions.getJSONObject(j));
                        }
                    }
                }
            }
        }
    }

    /** 单个 inputsValues 值的 ref 简写 */
    private static void normalizeValueRef(JSONObject value) {
        if (value.containsKey("ref") && !value.containsKey("type")) {
            value.set("type", "ref");
            value.set("content", value.get("ref"));
            value.remove("ref");
        }
    }

    /** 条件节点的 left/right ref 简写 */
    private static void normalizeConditionRef(JSONObject cond) {
        normalizeRefField(cond, "left");
        normalizeRefField(cond, "right");
    }

    private static void normalizeRefField(JSONObject cond, String field) {
        Object value = cond.get(field);
        if (value instanceof JSONObject) {
            JSONObject obj = (JSONObject) value;
            if (obj.containsKey("ref") && !obj.containsKey("type")) {
                obj.set("type", "ref");
                obj.set("content", obj.get("ref"));
                obj.remove("ref");
            }
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

    /** 把扁平字段移动为 constant 类型引用（仅当该字段在 inputsValues 里尚未设置时） */
    private static void moveToConstant(JSONObject iv, JSONObject data, String key) {
        if (!data.containsKey(key)) {
            return;
        }
        if (!iv.containsKey(key)) {
            Object content = data.get(key);
            JSONObject wrapper = new JSONObject()
                .set("type", "constant")
                .set("content", content);
            if (content instanceof String) {
                wrapper.set("schema", new JSONObject().set("type", "string"));
            }
            iv.set(key, wrapper);
        }
        data.remove(key);
    }

    /** 把扁平字段移动为 template 类型引用（LLM 的 prompt/systemPrompt，支持 Vue 模板） */
    private static void moveToTemplate(JSONObject iv, JSONObject data, String key) {
        if (!data.containsKey(key)) {
            return;
        }
        if (!iv.containsKey(key)) {
            Object content = data.get(key);
            if (content instanceof String) {
                iv.set(key, new JSONObject().set("type", "template").set("content", content));
            } else if (content instanceof JSONObject || content instanceof JSONArray) {
                iv.set(key, new JSONObject().set("type", "constant").set("content", content));
            }
        }
        data.remove(key);
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
