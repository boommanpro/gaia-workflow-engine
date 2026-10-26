package cn.boommanpro.gaia.workflow.infra.extend.node.stringformat;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNodeParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.code.CodeNodeParser;
import cn.hutool.json.JSONObject;

/**
 * StringFormatCode节点解析器
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 */
public class StringFormatCodeParser extends BaseNodeParser<StringFormatCode> {

    private static final String INPUTS_JSON_PATH = "$.data.inputs.properties";
    private static final String INPUTS_VALUES_JSON_PATH = "$.data.inputsValues";
    private static final String OUTPUTS_JSON_PATH = "$.data.outputs.properties";
    private static final String SCRIPT_CONTENT_PATH = "$.data.script.content";
    private static final String SCRIPT_LANGUAGE_PATH = "$.data.script.language";

    @Override
    public StringFormatCode buildInstance(JSONObject nodeJSONObject, GaiaWorkflow workflow) {
        StringFormatCode stringFormatCode = new StringFormatCode();

        // 设置格式化字符串
        Object scriptContentObj = nodeJSONObject.getByPath(SCRIPT_CONTENT_PATH);
        if (scriptContentObj != null) {
            stringFormatCode.setFormatString(scriptContentObj.toString());
        }

        // 设置语言类型；非法值 parse 期即报（此前要等运行期 RuntimeException，错误暴露太晚）
        Object languageObj = nodeJSONObject.getByPath(SCRIPT_LANGUAGE_PATH);
        if (languageObj != null) {
            String language = languageObj.toString();
            if (!"spel-standard".equals(language) && !"spel-vue".equals(language) && !"thymeleaf-text".equals(language)) {
                throw new IllegalArgumentException("节点 " + nodeJSONObject.getStr("id")
                    + "（string-format）的 script.language \"" + language + "\" 不受支持，"
                    + "只支持 spel-standard（${a.b}）/ spel-vue（{{ a.b }}）/ thymeleaf-text（[(${a.b})]）");
            }
            stringFormatCode.setLanguage(language);
        }

        // 解析输入参数
        JSONObject inputsSchema = (JSONObject) nodeJSONObject.getByPath(INPUTS_JSON_PATH);
        JSONObject inputsValues = (JSONObject) nodeJSONObject.getByPath(INPUTS_VALUES_JSON_PATH);
        stringFormatCode.setParameters(CodeNodeParser.parseNodeParameters(inputsSchema, inputsValues));

        // 解析输出参数
        JSONObject outputsSchema = (JSONObject) nodeJSONObject.getByPath(OUTPUTS_JSON_PATH);
        stringFormatCode.setOutputParameters(CodeNodeParser.parseNodeParameters(outputsSchema, null));

        return stringFormatCode;
    }
}
