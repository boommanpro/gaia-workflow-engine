package cn.boommanpro.gaia.workflow.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.Error;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SpecificationVersion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 节点参数 schema 契约注册表 —— 节点 data 结构的单一事实源。
 *
 * <p>schema 文件：{@code resources/node-schemas/<type>.schema.json}（JSON Schema draft-07，
 * 附 {@link #OUTPUTS_EXTENSION} 扩展声明该节点执行后写入 memory 的输出字段）。
 * 按 NodeTypeEnum 逐类型探测加载，无需扫描；文件缺失即该类型不做参数校验。</p>
 *
 * <p>消费方：{@link WorkflowDslValidator}（S3 参数结构校验 + S4 输出字段推断）、
 * agent 的 get(target=knowledge) 工具（契约与 prompt 同源）。前端契约测试直接读取同一批文件
 * （monorepo 相对路径），模板漂移在 CI 红灯。</p>
 *
 * <p>放在 app 模块而非 base：base 的编译目标是 Java 8（历史遗留），且当前全部消费方都在 app。</p>
 */
public final class NodeSchemaRegistry {

    private static final Logger log = LoggerFactory.getLogger(NodeSchemaRegistry.class);

    /** schema 扩展键：该节点执行后的静态输出字段（动态输出如 start/code 不声明） */
    public static final String OUTPUTS_EXTENSION = "x-gaia-outputs";

    /** 有契约文件的节点类型（无文件的类型如 note/group 不做参数校验） */
    private static final List<String> SCHEMA_TYPES = List.of(
        "start", "end", "code", "branches", "condition", "string-format",
        "variable", "http", "llm", "loop", "workflow");

    private static final Map<String, Schema> SCHEMAS = new HashMap<>();
    private static final Map<String, String> SCHEMA_TEXTS = new HashMap<>();
    private static final Map<String, List<String>> STATIC_OUTPUTS = new HashMap<>();
    private static final ObjectMapper MAPPER = new ObjectMapper();

    static {
        // 2.0.0 默认容忍未知关键字，x-gaia-outputs 无需注册即可静默通过
        SchemaRegistry registry = SchemaRegistry.withDefaultDialect(SpecificationVersion.DRAFT_7);
        for (String type : SCHEMA_TYPES) {
            String path = "/node-schemas/" + type + ".schema.json";
            try (InputStream in = NodeSchemaRegistry.class.getResourceAsStream(path)) {
                if (in == null) {
                    log.warn("[node-schema] 契约文件缺失（按无 schema 处理）: {}", path);
                    continue;
                }
                String text = new String(in.readAllBytes(), StandardCharsets.UTF_8);
                SCHEMAS.put(type, registry.getSchema(text));
                SCHEMA_TEXTS.put(type, text);
                JsonNode root = MAPPER.readTree(text);
                if (root.has(OUTPUTS_EXTENSION)) {
                    List<String> outputs = new ArrayList<>();
                    root.get(OUTPUTS_EXTENSION).forEach(n -> outputs.add(n.asText()));
                    STATIC_OUTPUTS.put(type, Collections.unmodifiableList(outputs));
                }
            } catch (Exception e) {
                // 单个 schema 损坏不阻断启动：校验层按无 schema 处理，但要有日志可查
                log.error("[node-schema] 契约文件加载失败: {}", path, e);
            }
        }
        log.info("[node-schema] 已加载 {} 份节点契约（{}）", SCHEMAS.size(), String.join(",", SCHEMAS.keySet()));
    }

    private NodeSchemaRegistry() {
    }

    public static boolean hasSchema(String type) {
        return type != null && SCHEMAS.containsKey(type);
    }

    public static Set<String> schemaTypes() {
        return Collections.unmodifiableSet(SCHEMAS.keySet());
    }

    /** 该节点的静态输出字段（schema 未声明的动态输出类型返回 null = 未知） */
    public static List<String> staticOutputs(String type) {
        return STATIC_OUTPUTS.get(type);
    }

    /** 原始 schema JSON 文本（get(target=knowledge) 透出给模型用；无契约返回 null） */
    public static String rawSchema(String type) {
        return SCHEMA_TEXTS.get(type);
    }

    /**
     * 校验节点 data 是否符合契约。
     *
     * @param type     节点类型（须 hasSchema）
     * @param dataJson 节点 data 的 JSON 文本
     * @return 违规消息列表（空 = 合法）
     */
    public static List<String> validateParams(String type, String dataJson) {
        Schema schema = SCHEMAS.get(type);
        if (schema == null) {
            return List.of();
        }
        try {
            JsonNode node = MAPPER.readTree(dataJson == null ? "{}" : dataJson);
            List<Error> errors = schema.validate(node);
            List<String> result = new ArrayList<>(errors.size());
            for (Error error : errors) {
                result.add(error.getMessage());
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
