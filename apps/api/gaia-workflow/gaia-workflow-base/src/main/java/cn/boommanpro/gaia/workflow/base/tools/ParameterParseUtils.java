package cn.boommanpro.gaia.workflow.base.tools;

import cn.boommanpro.gaia.workflow.base.type.DataType;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.base.type.RefType;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 通用参数解析工具类
 * 统一处理各节点解析器中的参数解析逻辑，消除重复代码
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
@Slf4j
public class ParameterParseUtils {

    /**
     * 解析节点参数（带值映射）
     *
     * @param schemaObject 参数schema对象
     * @param valueMapObject 参数值映射对象
     * @return 解析后的参数列表
     */
    public static List<Parameter> parseParameters(JSONObject schemaObject, JSONObject valueMapObject) {
        List<Parameter> parameters = new ArrayList<>();

        if (schemaObject == null) {
            return parameters;
        }

        for (String key : schemaObject.keySet()) {
            try {
                JSONObject paramJson = schemaObject.getJSONObject(key);
                Parameter parameter = parseParameter(key, paramJson, valueMapObject);
                parameters.add(parameter);
            } catch (Exception e) {
                log.warn("解析参数失败: {}", key, e);
            }
        }

        return parameters;
    }

    /**
     * 解析单个参数
     *
     * @param key 参数名
     * @param paramJson 参数JSON
     * @param valueMapObject 值映射对象
     * @return 解析后的参数
     */
    private static Parameter parseParameter(String key, JSONObject paramJson, JSONObject valueMapObject) {
        Parameter parameter = new Parameter();
        parameter.setName(key);

        // 解析数据类型
        parameter.setType(DataType.ofValue(paramJson.getStr("type")));

        // 解析是否必填
        parameter.setRequire(Optional.ofNullable(paramJson.getBool("isPropertyRequired")).orElse(false));

        // 解析参数值
        if (valueMapObject != null && valueMapObject.containsKey(key)) {
            JSONObject valueObject = valueMapObject.getJSONObject(key);
            parseParameterValue(parameter, valueObject);
        } else {
            // 如果没有值映射，尝试从schema中获取默认值
            parameter.setDefaultValue(paramJson.getStr("default"));
            parameter.setRefType(RefType.CONSTANT);
        }

        return parameter;
    }

    /**
     * 解析参数值
     *
     * @param parameter 参数对象
     * @param valueObject 值对象
     */
    private static void parseParameterValue(Parameter parameter, JSONObject valueObject) {
        String refTypeStr = valueObject.getStr("type");
        parameter.setRefType(RefType.from(refTypeStr));

        if (parameter.getRefType() == RefType.REF) {
            // 引用类型
            List<String> refValue = valueObject.getJSONArray("content").stream()
                .map(Object::toString)
                .collect(Collectors.toList());
            parameter.setRefValue(refValue);
        } else {
            // 常量类型
            parameter.setDefaultValue(valueObject.getStr("content"));
        }
    }

    /**
     * 解析StartNode的输出参数（特殊处理）
     *
     * @param schemaObject 输出schema对象
     * @return 解析后的参数列表
     */
    public static List<Parameter> parseStartNodeOutputs(JSONObject schemaObject) {
        List<Parameter> parameters = new ArrayList<>();

        if (schemaObject == null) {
            return parameters;
        }

        for (String key : schemaObject.keySet()) {
            try {
                JSONObject paramJson = schemaObject.getJSONObject(key);
                Parameter parameter = new Parameter();
                parameter.setName(key);
                parameter.setType(DataType.ofValue(paramJson.getStr("type")));
                parameter.setRefType(RefType.REF);
                parameter.setRefValue(Arrays.asList(key));
                parameter.setDefaultValue(paramJson.getStr("default"));
                parameter.setRequire(Optional.ofNullable(paramJson.getBool("isPropertyRequired")).orElse(false));
                parameters.add(parameter);
            } catch (Exception e) {
                log.warn("解析StartNode输出参数失败: {}", key, e);
            }
        }

        return parameters;
    }

    /**
     * 解析EndNode的输入参数（特殊处理）
     *
     * @param schemaObject 输入schema对象
     * @param valueMapObject 值映射对象
     * @return 解析后的参数列表
     */
    public static List<Parameter> parseEndNodeInputs(JSONObject schemaObject, JSONObject valueMapObject) {
        return parseParameters(schemaObject, valueMapObject);
    }

    /**
     * 从JSON路径获取对象
     *
     * @param jsonObject JSON对象
     * @param path JSON路径（如 "$.data.inputs.properties"）
     * @return 获取到的对象，如果路径不存在则返回null
     */
    public static Object getByPath(JSONObject jsonObject, String path) {
        try {
            return jsonObject.getByPath(path);
        } catch (Exception e) {
            log.debug("获取JSON路径失败: {}", path, e);
            return null;
        }
    }

    /**
     * 从JSON路径获取JSONObject
     *
     * @param jsonObject JSON对象
     * @param path JSON路径
     * @return JSONObject，如果路径不存在或不是JSONObject则返回null
     */
    public static JSONObject getJSONObjectByPath(JSONObject jsonObject, String path) {
        Object obj = getByPath(jsonObject, path);
        return obj instanceof JSONObject ? (JSONObject) obj : null;
    }

    /**
     * 从JSON路径获取字符串
     *
     * @param jsonObject JSON对象
     * @param path JSON路径
     * @return 字符串值，如果路径不存在则返回null
     */
    public static String getStringByPath(JSONObject jsonObject, String path) {
        Object obj = getByPath(jsonObject, path);
        return obj != null ? obj.toString() : null;
    }
}

