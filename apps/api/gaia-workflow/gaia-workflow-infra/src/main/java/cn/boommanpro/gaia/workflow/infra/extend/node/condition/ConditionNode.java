package cn.boommanpro.gaia.workflow.infra.extend.node.condition;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import cn.boommanpro.gaia.workflow.base.type.DataType;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.base.type.RefType;
import cn.boommanpro.gaia.workflow.base.tools.SpringExpressionParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNode;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONUtil;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 条件节点，用于处理工作流中的条件判断
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17
 */
@Slf4j
@Data
@EqualsAndHashCode(callSuper = true)
public class ConditionNode extends BaseNode {

    // 条件列表
    private List<Condition> conditions = new ArrayList<>();

    private static final String ELSE_BRANCH_ID = "else";

    @Override
    public Map<String, Object> execute(Chain chain) {
        // 执行所有条件的判断，并将结果存入memory
        Map<String, Object> result = new HashMap<>();

        for (Condition condition : conditions) {
            boolean conditionResult = evaluateCondition(condition, chain);
            result.put(condition.getKey(), conditionResult);
            if (conditionResult) {
                return result;
            }
        }
        result.put(ELSE_BRANCH_ID, true);
        return result;
    }

    @Override
    protected Map<String, Object> getParametersData(Chain chain) {
        return chain.getMemory();
    }

    /**
     * 评估单个条件是否满足
     */
    private boolean evaluateCondition(Condition condition, Chain chain) {
        Expression expression = condition.getValue();
        if (expression == null) {
            return false;
        }

        String operator = expression.getOperator();
        if (operator == null) {
            return false;
        }

        // 使用策略模式处理操作符
        ConditionOperator<Object> operatorHandler = ConditionOperatorFactory.getOperator(operator);
        if (operatorHandler == null) {
            log.warn("不支持的操作符: {}", operator);
            return false;
        }

        Object leftValue = getExpressionValue(expression.getLeft(), chain);

        switch (operator) {
            case "is_empty":
            case "is_not_empty":
            case "is_true":
            case "is_false":
            case "contains":
            case "not_contains":
                // 这些操作符只需要左值或只需要比较左值与右值
                Object rightValue = getExpressionValue(expression.getRight(), chain);
                return operatorHandler.apply(leftValue, rightValue);
            case "eq":
            case "neq":
            case "gt":
            case "gte":
            case "lt":
            case "lte":
                // 这些操作符需要左右两个值
                rightValue = getExpressionValue(expression.getRight(), chain);
                return operatorHandler.apply(leftValue, rightValue);
            default:
                // 默认情况
                rightValue = getExpressionValue(expression.getRight(), chain);
                return operatorHandler.apply(leftValue, rightValue);
        }
    }

    /**
     * 获取表达式的值
     */
    private Object getExpressionValue(ExpressionPart part, Chain chain) {
        if (part == null) {
            return null;
        }

        String type = part.getType();

        if ("ref".equals(type)) {
            // 引用类型，从chain的memory中获取值
            Object content = part.getContent();
            if (content instanceof List) {
                List<String> contentList = (List<String>) content;
                String key = String.join(".", contentList);
                return SpringExpressionParser.getInstance().getValue(key,chain.getMemory());
            } else if (content instanceof String) {
                // 如果content是字符串，直接使用它作为key
                return SpringExpressionParser.getInstance().getValue((String) content,chain.getMemory());
            }
        } else if ("constant".equals(type)) {
            // 常量类型，直接返回值
            Object content = part.getContent();
            // 如果是字符串且看起来像JSON数组，则尝试解析为List
            if (content instanceof String) {
                String contentStr = (String) content;
                if (contentStr.startsWith("[") && contentStr.endsWith("]")) {
                    try {
                        JSONArray array = JSONUtil.parseArray(contentStr);
                        return array.toList(Object.class);
                    } catch (Exception e) {
                        // 解析失败则返回原始字符串
                        log.warn("Failed to parse constant array string: {}", contentStr, e);
                    }
                }
            }
            return content;
        }

        return null;
    }

    /**
     * 条件内部类
     */
    @Data
    public static class Condition {
        private String key;
        private Expression value;
    }

    /**
     * 表达式内部类
     */
    @Data
    public static class Expression {
        private String type;
        private String content;
        private ExpressionPart left;
        private String operator;
        private ExpressionPart right;
    }

    /**
     * 表达式部分内部类
     */
    @Data
    public static class ExpressionPart {
        private String type;
        private Object content; // 可以是字符串、布尔值、数字或字符串列表
    }

    @Override
    public List<Parameter> getOutputParameters() {
        List<Parameter> parameters = new ArrayList<>();
        for (Condition condition : conditions) {
            Parameter parameter = new Parameter();
            parameter.setName(condition.getKey());
            parameter.setType(DataType.Boolean);
            parameter.setDescription(condition.getKey());
            parameter.setRefType(RefType.REF);
            parameter.setRefValue(Collections.singletonList(condition.getKey()));
            parameters.add(parameter);
        }
        Parameter parameter = new Parameter();
        parameter.setName(ELSE_BRANCH_ID);
        parameter.setType(DataType.Boolean);
        parameter.setDescription(ELSE_BRANCH_ID);
        parameter.setRefType(RefType.REF);
        parameter.setRefValue(Collections.singletonList(ELSE_BRANCH_ID));
        parameters.add(parameter);
        return parameters;
    }

    @Override
    public NodeTypeEnum getNodeType() {
        return  NodeTypeEnum.CONDITION;
    }
}

