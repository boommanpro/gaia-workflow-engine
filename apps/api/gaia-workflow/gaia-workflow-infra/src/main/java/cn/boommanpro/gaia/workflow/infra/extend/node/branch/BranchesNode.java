package cn.boommanpro.gaia.workflow.infra.extend.node.branch;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.type.DataType;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.base.type.RefType;
import cn.boommanpro.gaia.workflow.base.tools.SpringExpressionParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNode;
import cn.boommanpro.gaia.workflow.infra.extend.node.condition.ConditionOperator;
import cn.boommanpro.gaia.workflow.infra.extend.node.condition.ConditionOperatorFactory;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONUtil;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.extern.slf4j.Slf4j;

import java.util.*;

/**
 * 分支节点，用于处理工作流中的条件分支
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17
 */
@Slf4j
@Data
@EqualsAndHashCode(callSuper = true)
public class BranchesNode extends BaseNode {

    // 分支列表
    private List<Branch> branches = new ArrayList<>();

    private static final String ELSE_BRANCH_ID = "else";


    @Override
    public Map<String, Object> execute(Chain chain) {
        // 执行所有分支的条件判断，并将结果存入memory
        Map<String, Object> result = new HashMap<>();

        for (Branch branch : branches) {
            boolean branchResult = evaluateBranch(branch, chain);
            result.put(branch.getId(), branchResult);
            if (branchResult) {
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
     * 评估一个分支的条件是否满足
     */
    protected boolean evaluateBranch(Branch branch, Chain chain) {
        List<Condition> conditions = branch.getConditions();
        String logic = branch.getLogic();

        if (conditions.isEmpty()) {
            return true;
        }

        if ("and".equals(logic)) {
            // AND逻辑：所有条件都必须满足
            for (Condition condition : conditions) {
                if (!evaluateCondition(condition, chain)) {
                    return false;
                }
            }
            return true;
        } else if ("or".equals(logic)) {
            // OR逻辑：至少有一个条件满足
            for (Condition condition : conditions) {
                if (evaluateCondition(condition, chain)) {
                    return true;
                }
            }
            return false;
        }

        // 默认返回false
        return false;
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
     * 分支内部类
     */
    @Data
    public static class Branch {
        private String id;
        private String title;
        private String logic; // "and" or "or"
        private List<Condition> conditions = new ArrayList<>();
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
        for (Branch branch : branches) {
            Parameter parameter = new Parameter();
            parameter.setName(branch.getId());
            parameter.setType(DataType.Boolean);
            parameter.setDescription(branch.getTitle());
            parameter.setRefType(RefType.REF);
            parameter.setRefValue(Collections.singletonList(branch.getId()));
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
}
