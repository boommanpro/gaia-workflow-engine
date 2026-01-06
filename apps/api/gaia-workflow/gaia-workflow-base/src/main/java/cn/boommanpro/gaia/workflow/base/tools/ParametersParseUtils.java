package cn.boommanpro.gaia.workflow.base.tools;

import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.base.type.DataType;
import cn.boommanpro.gaia.workflow.base.type.RefType;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONObject;

import java.util.*;
import java.util.stream.Collectors;

public class ParametersParseUtils {
    //end使用
    public static List<Parameter> parse(JSONObject nodeJSONObject) {
        List<Parameter> parameters = new ArrayList<>();

        for (Map.Entry<String, Object> entry : nodeJSONObject.entrySet()) {
            JSONObject paramJson = (JSONObject) entry.getValue();

            Parameter parameter = new Parameter();
            parameter.setName(paramJson.getStr("name"));
            Object value = paramJson.get("default");
            if (value instanceof JSONObject) {
                parameter.setRefType(RefType.REF);
                JSONObject refValue = (JSONObject) value;
                parameter.setRefValue(refValue.getJSONArray("content").stream().map(Object::toString).collect(Collectors.toList()));
            } else {
                parameter.setDefaultValue(paramJson.getStr("default"));
                parameter.setRefType(RefType.CONSTANT);
            }
            if (StrUtil.isBlank(parameter.getName())) {
                parameter.setName(entry.getKey());
            }
            parameter.setRequire(Optional.ofNullable(paramJson.getBool("isPropertyRequired")).orElse(false));
            parameter.setType(DataType.ofValue(paramJson.getStr("type")));
            parameters.add(parameter);
        }

        return parameters;
    }

    //start 使用
    public static List<Parameter> parseStartNodeParameters(JSONObject nodeJSONObject) {
        List<Parameter> parameters = new ArrayList<>();

        for (Map.Entry<String, Object> entry : nodeJSONObject.entrySet()) {
            JSONObject paramJson = (JSONObject) entry.getValue();

            Parameter parameter = new Parameter();
            parameter.setName(paramJson.getStr("name"));
            parameter.setRefType(RefType.REF);
            parameter.setRefValue(Arrays.asList(paramJson.getStr("name")));
            parameter.setDefaultValue(paramJson.getStr("default"));
            parameter.setRequire(Optional.ofNullable(paramJson.getBool("isPropertyRequired")).orElse(false));
            parameter.setType(DataType.ofValue(paramJson.getStr("type")));
            parameters.add(parameter);
        }

        return parameters;
    }
}
