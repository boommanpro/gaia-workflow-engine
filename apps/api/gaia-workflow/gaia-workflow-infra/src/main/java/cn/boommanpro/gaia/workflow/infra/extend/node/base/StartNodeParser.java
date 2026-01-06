package cn.boommanpro.gaia.workflow.infra.extend.node.base;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.tools.ParameterParseUtils;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNodeParser;
import cn.hutool.json.JSONObject;

import java.util.List;

/**
 * StartNode解析器
 * 使用通用工具类减少重复代码
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17 11:35
 */
public class StartNodeParser extends BaseNodeParser<StartNode> {

    private static final String OUTPUTS_JSON_PATH = "$.data.outputs.properties";

    @Override
    public StartNode buildInstance(JSONObject nodeJSONObject, GaiaWorkflow workflow) {
        StartNode startNode = new StartNode();

        // 使用通用工具类解析输出参数
        JSONObject outputsSchema = ParameterParseUtils.getJSONObjectByPath(nodeJSONObject, OUTPUTS_JSON_PATH);
        startNode.setOutputParameters(ParameterParseUtils.parseStartNodeOutputs(outputsSchema));

        return startNode;
    }

    /**
     * 解析StartNode参数（保留向后兼容性）
     *
     * @param nodeJSONObject 参数schema对象
     * @return 解析后的参数列表
     * @deprecated 使用 {@link ParameterParseUtils#parseStartNodeParameters(JSONObject)} 替代
     */
    @Deprecated
    public static List<Parameter> parseStartNodeParameters(JSONObject nodeJSONObject) {
        return ParameterParseUtils.parseStartNodeOutputs(nodeJSONObject);
    }
}
