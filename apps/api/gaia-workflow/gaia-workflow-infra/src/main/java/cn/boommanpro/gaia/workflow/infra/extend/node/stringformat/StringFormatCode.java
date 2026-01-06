package cn.boommanpro.gaia.workflow.infra.extend.node.stringformat;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.base.tools.SpringExpressionParser;
import cn.boommanpro.gaia.workflow.base.tools.ThymeleafTemplateParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNode;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@EqualsAndHashCode(callSuper = true)
public class StringFormatCode extends BaseNode {

    private String formatString;
    private String language = "spel-standard"; // 默认使用SpEL标准语法

    @Override
    public Map<String, Object> execute(Chain chain) {
        Map<String, Object> result = new HashMap<>();

        // 获取输入参数
        Map<String, Object> parametersData = getParametersData(chain);
        Map<String, Object> context = new HashMap<>();
        getParametersData(chain).forEach(context::put);

        String formattedString;
        switch (language) {
            case "spel-standard":
                formattedString = SpringExpressionParser.getInstance().getTemplateStringValue(formatString,context);
                break;
            case "spel-vue":
                formattedString = SpringExpressionParser.getInstance().getVueStringValue(formatString,context);
                break;
            case "thymeleaf-text":
                formattedString = ThymeleafTemplateParser.parse(formatString, context);
                break;
            default:
                throw new RuntimeException("不支持的格式化语言：" + language);
        }

        result.put("formatStringResult", formattedString);
        return result;
    }



    @Override
    public List<Parameter> getOutputParameters() {
        return super.getOutputParameters();
    }

    @Override
    public List<Parameter> getParameters() {
        return super.getParameters();
    }

    @Override
    protected Map<String, Object> getParametersData(Chain chain) {
        return chain.getParametersData(this);
    }
}
