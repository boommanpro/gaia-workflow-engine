package cn.boommanpro.gaia.workflow.infra.extend.node.variable;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.type.RefType;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNodeParser;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * VariableNode解析器
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 */
public class VariableNodeParser extends BaseNodeParser<VariableNode> {

    @Override
    public VariableNode buildInstance(JSONObject nodeJSONObject, GaiaWorkflow workflow) {
        VariableNode variableNode = new VariableNode();

        // 解析assign数组
        JSONArray assignArray = nodeJSONObject.getJSONObject("data").getJSONArray("assign");
        if (assignArray != null) {
            List<VariableNode.VariableAssign> assigns = new ArrayList<>();
            for (int i = 0; i < assignArray.size(); i++) {
                JSONObject assignObj = assignArray.getJSONObject(i);
                VariableNode.VariableAssign assign = new VariableNode.VariableAssign();
                assign.setOperator(assignObj.getStr("operator"));

                // 解析左值
                Object leftObj = assignObj.get("left");
                if (leftObj instanceof JSONObject) {
                    // 复杂左值（引用类型）
                    JSONObject leftJsonObj = (JSONObject) leftObj;
                    assign.setLeftType(RefType.from(leftJsonObj.getStr("type")));
                    if (assign.getLeftType() == RefType.REF) {
                        assign.setLeftContent(leftJsonObj.get("content"));
                    }
                } else {
                    // 简单左值（变量名）
                    assign.setLeft(leftObj.toString());
                }

                // 解析右值
                JSONObject rightObj = assignObj.getJSONObject("right");
                if (rightObj != null) {
                    VariableNode.VariableValue value = new VariableNode.VariableValue();
                    value.setType(RefType.from(rightObj.getStr("type")));

                    if (value.getType() == RefType.REF) {
                        // 引用类型，内容是数组
                        value.setContent(rightObj.getJSONArray("content"));
                    } else {
                        // 常量或表达式类型，内容是单值
                        value.setContent(rightObj.get("content"));
                    }

                    // 解析schema（如果存在）
                    JSONObject schemaObj = rightObj.getJSONObject("schema");
                    if (schemaObj != null) {
                        value.setSchema(schemaObj);
                    }

                    assign.setRight(value);
                }

                assigns.add(assign);
            }
            variableNode.setAssigns(assigns);
        }

        return variableNode;
    }
}
