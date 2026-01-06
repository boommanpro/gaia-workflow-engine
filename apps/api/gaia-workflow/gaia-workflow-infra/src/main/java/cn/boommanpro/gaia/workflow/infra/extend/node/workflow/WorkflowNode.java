package cn.boommanpro.gaia.workflow.infra.extend.node.workflow;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import cn.boommanpro.gaia.workflow.base.type.DataType;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.base.tools.SpringExpressionParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNode;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 工作流节点，用于嵌入另一个工作流
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/11/10
 */
@Slf4j
@Data
@EqualsAndHashCode(callSuper = true)
public class WorkflowNode extends BaseNode {

    // 工作流ID
    private String workflowId;

    // 工作流名称
    private String workflowName;

    // 工作流描述
    private String workflowDescription;

    // 输入参数值
    private Map<String, Object> inputsValues = new HashMap<>();

    // 输入参数schema
    private Map<String, Object> inputs;

    // 输出参数schema
    private Map<String, Object> outputs;

    // 工作流存储服务（静态注入，因为节点不是Spring管理的bean）
//    private static WorkflowStorageService workflowStorageService;

    @Override
    public Map<String, Object> execute(Chain chain) {
        Map<String, Object> result = new HashMap<>();

        try {
            log.debug("执行工作流节点: {}, 目标工作流ID: {}", getId(), workflowId);

            if (workflowId == null || workflowId.isEmpty()) {
                throw new IllegalArgumentException("工作流ID不能为空");
            }

            // 解析输入参数值
            Map<String, Object> resolvedInputs = resolveInputValues(chain);

            // 获取目标工作流定义
//            String targetWorkflowSchema = getTargetWorkflowSchema(workflowId);
            String targetWorkflowSchema = "";

            // 创建并执行目标工作流
            GaiaWorkflow targetWorkflow = new GaiaWorkflow(targetWorkflowSchema);
            Map<String, Object> workflowResult = targetWorkflow.run(resolvedInputs);

            // 将目标工作流的输出作为当前节点的输出
            result.putAll(workflowResult);

            log.debug("工作流节点执行完成: {}, 输出: {}", getId(), result);

        } catch (Exception e) {
            log.error("工作流节点执行失败: {}", getId(), e);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * 解析输入参数值
     * 处理常量和引用类型
     */
    private Map<String, Object> resolveInputValues(Chain chain) {
        Map<String, Object> resolvedInputs = new HashMap<>();

        if (inputsValues == null) {
            return resolvedInputs;
        }

        for (Map.Entry<String, Object> entry : inputsValues.entrySet()) {
            String paramName = entry.getKey();
            Object paramValue = entry.getValue();

            if (paramValue instanceof Map) {
                Map<String, Object> paramConfig = (Map<String, Object>) paramValue;
                String type = (String) paramConfig.get("type");
                Object content = paramConfig.get("content");

                if ("ref".equals(type) && content instanceof java.util.List) {
                    // 引用类型：从chain memory中获取值
                    java.util.List<?> refPath = (java.util.List<?>) content;
                    if (refPath.size() >= 2) {
                        String nodeId = (String) refPath.get(0);
                        String outputName = (String) refPath.get(1);
                        String expression = String.format("%s.%s", nodeId, outputName);
                        Object resolvedValue = SpringExpressionParser.getInstance()
                                .getValue(expression, chain.getMemory());
                        resolvedInputs.put(paramName, resolvedValue);
                    }
                } else if ("constant".equals(type)) {
                    // 常量类型：直接使用值
                    resolvedInputs.put(paramName, content);
                }
            } else {
                // 直接值
                resolvedInputs.put(paramName, paramValue);
            }
        }

        return resolvedInputs;
    }


    @Override
    public NodeTypeEnum getNodeType() {
        return NodeTypeEnum.WORKFLOW;
    }

    @Override
    public List<Parameter> getOutputParameters() {
        List<Parameter> outputParameters = new ArrayList<>();

        if (outputs == null || outputs.get("properties") == null) {
            return outputParameters;
        }

        Map<String, Object> properties = (Map<String, Object>) outputs.get("properties");
        for (Map.Entry<String, Object> entry : properties.entrySet()) {
            String paramName = entry.getKey();
            Map<String, Object> paramDef = (Map<String, Object>) entry.getValue();

            Parameter parameter = new Parameter();
            parameter.setName(paramName);
            parameter.setType(DataType.ofValue((String) paramDef.get("type")));
            parameter.setDescription("输出参数: " + paramName);

            // 设置默认值
            if (paramDef.containsKey("default")) {
                parameter.setDefaultValue(paramDef.get("default").toString());
            }

            // 设置是否必需
            List<String> required = (List<String>) outputs.get("required");
            parameter.setRequire(required != null && required.contains(paramName));

            outputParameters.add(parameter);
        }

        return outputParameters;
    }

    @Override
    public List<Parameter> getParameters() {
        List<Parameter> parameters = new ArrayList<>();

        if (inputs == null || inputs.get("properties") == null) {
            return parameters;
        }

        Map<String, Object> properties = (Map<String, Object>) inputs.get("properties");
        for (Map.Entry<String, Object> entry : properties.entrySet()) {
            String paramName = entry.getKey();
            Map<String, Object> paramDef = (Map<String, Object>) entry.getValue();

            Parameter parameter = new Parameter();
            parameter.setName(paramName);
            parameter.setType(DataType.ofValue((String) paramDef.get("type")));
            parameter.setDescription("输入参数: " + paramName);

            // 设置默认值
            if (paramDef.containsKey("default")) {
                parameter.setDefaultValue(paramDef.get("default").toString());
            }

            // 设置是否必需
            List<String> required = (List<String>) inputs.get("required");
            parameter.setRequire(required != null && required.contains(paramName));

            parameters.add(parameter);
        }

        return parameters;
    }

    @Override
    protected Map<String, Object> getParametersData(Chain chain) {
        return chain.getMemory();
    }
}

