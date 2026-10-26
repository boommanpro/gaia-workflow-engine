package cn.boommanpro.gaia.workflow.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.Error;
import com.networknt.schema.Schema;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public final class NodeSchemaRegistry {

    /** schema 扩展键：该节点执行后的静态输出字段（动态输出如 start/code 不声明） */
    public static final String OUTPUTS_EXTENSION = "x-gaia-outputs";

    private static final NodeCatalog CATALOG = new NodeCatalog(NodeSchemaRegistry.class.getClassLoader());
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static JsonNode contract(String type) {
        return CATALOG.contract(type);
    }

    public static JsonNode defaultData(String type) {
        JsonNode contract = contract(type);
        return contract == null ? null : contract.get("defaults");
    }

    private NodeSchemaRegistry() {
    }

    public static boolean hasSchema(String type) {
        return type != null && CATALOG.schema(type) != null;
    }

    public static Set<String> schemaTypes() {
        return CATALOG.types();
    }

    public static Set<String> aiCreatableTypes() {
        return CATALOG.aiCreatableTypes();
    }

    /** 该节点的静态输出字段（schema 未声明的动态输出类型返回 null = 未知） */
    public static List<String> staticOutputs(String type) {
        JsonNode contract = contract(type);
        JsonNode outputs = contract == null ? null : contract.path("paramSchema").get(OUTPUTS_EXTENSION);
        if (outputs == null) return null;
        List<String> result = new ArrayList<>();
        outputs.forEach(output -> result.add(output.asText()));
        return List.copyOf(result);
    }

    /** 原始 schema JSON 文本（get(target=knowledge) 透出给模型用；无契约返回 null） */
    public static String rawSchema(String type) {
        JsonNode contract = contract(type);
        return contract == null ? null : contract.get("paramSchema").toString();
    }

    /**
     * 校验节点 data 是否符合契约。
     *
     * @param type     节点类型（须 hasSchema）
     * @param dataJson 节点 data 的 JSON 文本
     * @return 违规消息列表（空 = 合法）
     */
    public static List<String> validateParams(String type, String dataJson) {
        Schema schema = CATALOG.schema(type);
        if (schema == null) {
            return List.of();
        }
        try {
            JsonNode node = MAPPER.readTree(dataJson == null ? "{}" : dataJson);
            List<Error> errors = schema.validate(node);
            List<String> result = new ArrayList<>(errors.size());
            for (Error error : errors) {
                // 带实例路径（如 /inputsValues/prompt）：AI 拿到 violations 可直接定位字段自修
                String path = error.getInstanceLocation() == null ? "" : error.getInstanceLocation().toString();
                result.add(path + ": " + error.getMessage());
            }
            return result;
        } catch (Exception e) {
            return List.of("data 不是合法 JSON: " + e.getMessage());
        }
    }

    /** 从 start/code/variable/loop 等节点的 outputs.properties 声明里提取输出字段名（未声明返回 null） */
    public static Set<String> declaredOutputFields(cn.hutool.json.JSONObject data) {
        if (data == null) {
            return null;
        }
        cn.hutool.json.JSONObject outputs = data.getJSONObject("outputs");
        cn.hutool.json.JSONObject properties = outputs == null ? null : outputs.getJSONObject("properties");
        if (properties == null || properties.isEmpty()) {
            return null;
        }
        return new LinkedHashSet<>(properties.keySet());
    }
}
