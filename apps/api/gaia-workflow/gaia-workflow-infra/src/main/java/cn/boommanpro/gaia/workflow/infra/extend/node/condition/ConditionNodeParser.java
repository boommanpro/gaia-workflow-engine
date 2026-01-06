package cn.boommanpro.gaia.workflow.infra.extend.node.condition;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNodeParser;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * 条件节点解析器，用于解析condition.json文件
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17
 */
public class ConditionNodeParser extends BaseNodeParser<ConditionNode> {

    private static final String CONDITIONS_JSON_PATH = "$.data.conditions";

    @Override
    public ConditionNode buildInstance(JSONObject nodeJSONObject, GaiaWorkflow workflow) {
        ConditionNode conditionNode = new ConditionNode();

        // 解析条件信息
        JSONArray conditionsJsonArray = (JSONArray) nodeJSONObject.getByPath(CONDITIONS_JSON_PATH);
        if (conditionsJsonArray != null) {
            List<ConditionNode.Condition> conditions = new ArrayList<>();

            for (int i = 0; i < conditionsJsonArray.size(); i++) {
                JSONObject conditionJson = conditionsJsonArray.getJSONObject(i);
                ConditionNode.Condition condition = parseCondition(conditionJson);
                conditions.add(condition);
            }

            conditionNode.setConditions(conditions);
        }

        return conditionNode;
    }

    /**
     * 解析单个条件
     */
    private ConditionNode.Condition parseCondition(JSONObject conditionJson) {
        ConditionNode.Condition condition = new ConditionNode.Condition();

        condition.setKey(conditionJson.getStr("key"));

        // 解析表达式
        JSONObject expressionJson = conditionJson.getJSONObject("value");
        if (expressionJson != null) {
            ConditionNode.Expression expression = parseExpression(expressionJson);
            condition.setValue(expression);
        }

        return condition;
    }

    /**
     * 解析表达式
     */
    private ConditionNode.Expression parseExpression(JSONObject expressionJson) {
        ConditionNode.Expression expression = new ConditionNode.Expression();

        expression.setType(expressionJson.getStr("type"));
        expression.setContent(expressionJson.getStr("content"));
        expression.setOperator(expressionJson.getStr("operator"));

        // 解析左侧表达式部分
        JSONObject leftJson = expressionJson.getJSONObject("left");
        if (leftJson != null) {
            ConditionNode.ExpressionPart left = parseExpressionPart(leftJson);
            expression.setLeft(left);
        }

        // 解析右侧表达式部分
        JSONObject rightJson = expressionJson.getJSONObject("right");
        if (rightJson != null) {
            ConditionNode.ExpressionPart right = parseExpressionPart(rightJson);
            expression.setRight(right);
        }

        return expression;
    }

    /**
     * 解析表达式部分
     */
    private ConditionNode.ExpressionPart parseExpressionPart(JSONObject partJson) {
        ConditionNode.ExpressionPart part = new ConditionNode.ExpressionPart();

        part.setType(partJson.getStr("type"));

        // 根据类型设置内容
        if ("ref".equals(part.getType())) {
            // 引用类型，content是字符串列表
            JSONArray contentArray = partJson.getJSONArray("content");
            if (contentArray != null) {
                List<String> content = new ArrayList<>();
                for (int i = 0; i < contentArray.size(); i++) {
                    content.add(contentArray.getStr(i));
                }
                part.setContent(content);
            }
        } else if ("constant".equals(part.getType())) {
            // 常量类型，content是具体的常量值
            part.setContent(partJson.get("content"));
        }

        return part;
    }
}

