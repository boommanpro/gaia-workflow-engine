package cn.boommanpro.gaia.workflow.infra.extend.node.workflow;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNodeParser;
import cn.hutool.json.JSONObject;

/**
 * 工作流节点解析器
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/11/10
 */
public class WorkflowNodeParser extends BaseNodeParser<WorkflowNode> {

    @Override
    public WorkflowNode buildInstance(JSONObject nodeJSONObject, GaiaWorkflow workflow) {
        WorkflowNode node = new WorkflowNode();

        // 解析基本属性
        node.setId(nodeJSONObject.getStr("id"));

        // 解析data字段
        JSONObject data = nodeJSONObject.getJSONObject("data");
        if (data != null) {
//            node.setTitle(data.getStr("title"));
            node.setWorkflowId(data.getStr("workflowId"));
            node.setWorkflowName(data.getStr("workflowName"));
            node.setWorkflowDescription(data.getStr("workflowDescription"));

            // 解析输入参数值
            JSONObject inputsValues = data.getJSONObject("inputsValues");
            if (inputsValues != null) {
                node.setInputsValues(inputsValues);
            }

            // 解析输入参数schema
            JSONObject inputs = data.getJSONObject("inputs");
            if (inputs != null) {
                node.setInputs(inputs);
            }

            // 解析输出参数schema
            JSONObject outputs = data.getJSONObject("outputs");
            if (outputs != null) {
                node.setOutputs(outputs);
            }
        }

        return node;
    }
}

