package cn.boommanpro.gaia.workflow.infra.extend.node.llm;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.base.tools.ParameterParseUtils;
import cn.boommanpro.gaia.workflow.base.type.DataType;
import cn.boommanpro.gaia.workflow.base.type.RefType;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.code.CodeNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.utils.NodeParserUtils;
import cn.hutool.json.JSONObject;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * LlmNode解析器
 * 使用通用工具类减少重复代码
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 */
public class LlmNodeParser extends BaseNodeParser<LlmNode> {

    private static final String INPUTS_VALUES_PATH = "$.data.inputsValues";
    private static final String TIMEOUT_CONFIG_PATH = "$.data.timeout";
    private static final String OUTPUT_MODE_PATH = "$.data.outputMode";
    private static final String OUTPUTS_PROPERTIES_PATH = "$.data.outputs.properties";

    @Override
    public LlmNode buildInstance(JSONObject nodeJSONObject, GaiaWorkflow workflow) {
        LlmNode llmNode = new LlmNode();

        // 获取data对象
        JSONObject dataObj = NodeParserUtils.getDataObject(nodeJSONObject);
        if (dataObj == null) {
            return llmNode;
        }

        // 使用通用工具类解析inputsValues
        JSONObject inputsValues = NodeParserUtils.parseValuesObject(nodeJSONObject, INPUTS_VALUES_PATH);
        if (inputsValues != null) {
            llmNode.setInputsValues(inputsValues);
        }

        // 使用通用工具类解析超时配置
        NodeParserUtils.TimeoutConfig timeoutConfig = NodeParserUtils.parseTimeoutConfig(
            nodeJSONObject, TIMEOUT_CONFIG_PATH, 30000, 1);
        LlmNode.TimeoutConfig nodeTimeoutConfig = new LlmNode.TimeoutConfig();
        nodeTimeoutConfig.setTimeout(timeoutConfig.getTimeout());
        nodeTimeoutConfig.setRetryTimes(timeoutConfig.getRetryTimes());
        llmNode.setTimeout(nodeTimeoutConfig);

        // 输出模式与输出白名单（引擎 parseOutputResult 按此过滤进 memory）：
        // text（默认）= 固定 [result]；json = outputs.properties 声明集（与 code 节点同机制）
        String outputMode = ParameterParseUtils.getStringByPath(nodeJSONObject, OUTPUT_MODE_PATH);
        llmNode.setOutputMode(outputMode);
        llmNode.setOutputParameters(buildOutputParameters(outputMode, nodeJSONObject));

        return llmNode;
    }

    private static List<Parameter> buildOutputParameters(String outputMode, JSONObject nodeJSONObject) {
        if (outputMode != null && "json".equalsIgnoreCase(outputMode)) {
            JSONObject outputsProperties = ParameterParseUtils.getJSONObjectByPath(nodeJSONObject, OUTPUTS_PROPERTIES_PATH);
            if (outputsProperties != null && !outputsProperties.isEmpty()) {
                return CodeNodeParser.parseNodeParameters(outputsProperties, null);
            }
            // json 模式但没声明输出：空白名单（无输出进 memory）——配置错误，
            // 由落版/校验链路（checkNodeSemantics）在写入前拦截并给出修复示例
            return Collections.emptyList();
        }
        Parameter resultParam = new Parameter();
        resultParam.setName("result");
        resultParam.setRefValue(Arrays.asList("result"));
        resultParam.setRefType(RefType.REF);
        resultParam.setType(DataType.String);
        return Arrays.asList(resultParam);
    }
}
