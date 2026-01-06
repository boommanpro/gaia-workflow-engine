package cn.boommanpro.gaia.workflow.infra.extend.node.branch;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNodeParser;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * 分支节点解析器，用于解析branches.json文件
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/05/17
 */
public class BranchesNodeParser extends BaseNodeParser<BranchesNode> {

    private static final String BRANCHES_JSON_PATH = "$.data.branches";

    @Override
    public BranchesNode buildInstance(JSONObject nodeJSONObject, GaiaWorkflow workflow) {
        BranchesNode branchesNode = new BranchesNode();

        // 解析分支信息
        JSONArray branchesJsonArray = (JSONArray) nodeJSONObject.getByPath(BRANCHES_JSON_PATH);
        if (branchesJsonArray != null) {
            List<BranchesNode.Branch> branches = new ArrayList<>();

            for (int i = 0; i < branchesJsonArray.size(); i++) {
                JSONObject branchJson = branchesJsonArray.getJSONObject(i);
                BranchesNode.Branch branch = parseBranch(branchJson);
                branches.add(branch);
            }

            branchesNode.setBranches(branches);
        }

        return branchesNode;
    }

    /**
     * 解析单个分支
     */
    private BranchesNode.Branch parseBranch(JSONObject branchJson) {
        BranchesNode.Branch branch = new BranchesNode.Branch();

        branch.setId(branchJson.getStr("id"));
        branch.setTitle(branchJson.getStr("title"));
        branch.setLogic(branchJson.getStr("logic"));

        // 解析条件列表
        JSONArray conditionsJsonArray = branchJson.getJSONArray("conditions");
        if (conditionsJsonArray != null) {
            List<BranchesNode.Condition> conditions = new ArrayList<>();

            for (int i = 0; i < conditionsJsonArray.size(); i++) {
                JSONObject conditionJson = conditionsJsonArray.getJSONObject(i);
                BranchesNode.Condition condition = parseCondition(conditionJson);
                conditions.add(condition);
            }

            branch.setConditions(conditions);
        }

        return branch;
    }

    /**
     * 解析单个条件
     */
    private BranchesNode.Condition parseCondition(JSONObject conditionJson) {
        BranchesNode.Condition condition = new BranchesNode.Condition();

        condition.setKey(conditionJson.getStr("key"));

        // 解析表达式
        JSONObject expressionJson = conditionJson.getJSONObject("value");
        if (expressionJson != null) {
            BranchesNode.Expression expression = parseExpression(expressionJson);
            condition.setValue(expression);
        }

        return condition;
    }

    /**
     * 解析表达式
     */
    private BranchesNode.Expression parseExpression(JSONObject expressionJson) {
        BranchesNode.Expression expression = new BranchesNode.Expression();

        expression.setType(expressionJson.getStr("type"));
        expression.setContent(expressionJson.getStr("content"));
        expression.setOperator(expressionJson.getStr("operator"));

        // 解析左侧表达式部分
        JSONObject leftJson = expressionJson.getJSONObject("left");
        if (leftJson != null) {
            BranchesNode.ExpressionPart left = parseExpressionPart(leftJson);
            expression.setLeft(left);
        }

        // 解析右侧表达式部分
        JSONObject rightJson = expressionJson.getJSONObject("right");
        if (rightJson != null) {
            BranchesNode.ExpressionPart right = parseExpressionPart(rightJson);
            expression.setRight(right);
        }

        return expression;
    }

    /**
     * 解析表达式部分
     */
    private BranchesNode.ExpressionPart parseExpressionPart(JSONObject partJson) {
        BranchesNode.ExpressionPart part = new BranchesNode.ExpressionPart();

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
