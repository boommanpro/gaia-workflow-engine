package cn.boommanpro.gaia.workflow.infra.extend.node.base;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.tools.ParameterParseUtils;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNodeParser;
import cn.hutool.json.JSONObject;

import java.util.List;

/**
 * EndNode解析器
 * 使用通用工具类减少重复代码
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17 11:35
 */
public class EndNodeParser extends BaseNodeParser<EndNode> {

    private static final String INPUTS_JSON_PATH = "$.data.inputs.properties";
    private static final String INPUTS_VALUES_JSON_PATH = "$.data.inputsValues";

    @Override
    public EndNode buildInstance(JSONObject nodeJSONObject, GaiaWorkflow workflow) {
        EndNode endNode = new EndNode();

        // 使用通用工具类解析输入参数
        JSONObject inputsSchema = ParameterParseUtils.getJSONObjectByPath(nodeJSONObject, INPUTS_JSON_PATH);
        JSONObject inputsValues = ParameterParseUtils.getJSONObjectByPath(nodeJSONObject, INPUTS_VALUES_JSON_PATH);
        endNode.setOutputParameters(ParameterParseUtils.parseEndNodeInputs(inputsSchema, inputsValues));

        return endNode;
    }

    /**
     * 解析EndNode参数（保留向后兼容性）
     *
     * @param schemaObject 参数schema对象
     * @param valueMapObject 参数值映射对象
     * @return 解析后的参数列表
     * @deprecated 使用 {@link ParameterParseUtils#parseEndNodeInputs(JSONObject, JSONObject)} 替代
     */
    @Deprecated
    public static List<Parameter> parseStartNodeParameters(JSONObject schemaObject, JSONObject valueMapObject) {
        return ParameterParseUtils.parseEndNodeInputs(schemaObject, valueMapObject);
    }
}
