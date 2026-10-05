package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;

/**
 * 节点数据归一化器 —— 把模型产出的「简化扁平字段」转成执行引擎认识的结构。
 *
 * <p>与前端 {@code node-templates/normalize.ts} 一一对应。旧链路里这份转换只在前端做，
 * 后端 applyWorkflow / canvas 直接落库扁平字段，导致 LLM/HTTP 节点执行时报
 * 「url is null」——因为解析器只读 {@code data.inputsValues}。这里把转换搬回后端，
 * 使「纯后端自治」产出的工作流同样可直接运行。</p>
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

    /** HTTP 节点：method/url/headers/body/timeout 扁平字段 → inputsValues */
    private static void normalizeHttp(JSONObject data) {
        JSONObject iv = ensureInputsValues(data);

        moveToConstant(iv, data, "method");
        moveToConstant(iv, data, "url");
        moveToConstant(iv, data, "headers");
        moveToConstant(iv, data, "body");
        moveToConstant(iv, data, "timeout");
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
