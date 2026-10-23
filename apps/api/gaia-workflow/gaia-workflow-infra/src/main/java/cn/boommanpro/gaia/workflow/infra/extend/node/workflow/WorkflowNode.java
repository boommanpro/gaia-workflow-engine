package cn.boommanpro.gaia.workflow.infra.extend.node.workflow;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.type.NodeTypeEnum;
import cn.boommanpro.gaia.workflow.base.type.DataType;
import cn.boommanpro.gaia.workflow.base.type.RefType;
import cn.boommanpro.gaia.workflow.base.model.Parameter;
import cn.boommanpro.gaia.workflow.base.tools.SpringExpressionParser;
import cn.boommanpro.gaia.workflow.infra.extend.node.BaseNode;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Collections;
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

    /**
     * 目标工作流 schema 解析钩子：infra 不依赖 DB，由 app 层启动时注入实现。
     * 测试可直接 set 桩实现。
     */
    public interface WorkflowSchemaResolver {
        /** 按 workflowId（workflowCode 或版本 id）返回目标工作流的 schema JSON 文本；找不到返回 null */
        String resolve(String workflowId);
    }

    private static volatile WorkflowSchemaResolver schemaResolver;

    public static void setSchemaResolver(WorkflowSchemaResolver resolver) {
        WorkflowNode.schemaResolver = resolver;
    }

    /** 嵌套守卫：本线程正在执行的 workflowId 栈（防自嵌套成环 + 限深） */
    private static final ThreadLocal<java.util.Deque<String>> ACTIVE_CHAIN =
        ThreadLocal.withInitial(java.util.ArrayDeque::new);
    private static final int MAX_NESTING_DEPTH = 8;

    @Override
    public Map<String, Object> execute(Chain chain) {
        Map<String, Object> result = new HashMap<>();

        try {
            log.debug("执行工作流节点: {}, 目标工作流ID: {}", getId(), workflowId);

            if (workflowId == null || workflowId.isEmpty()) {
                throw new IllegalArgumentException("工作流ID不能为空");
            }

            WorkflowSchemaResolver resolver = schemaResolver;
            if (resolver == null) {
                throw new IllegalStateException("工作流节点不可用：未注入 schema 解析器（应用未启动完成）");
            }

            java.util.Deque<String> active = ACTIVE_CHAIN.get();
            if (active.contains(workflowId)) {
                throw new IllegalStateException("工作流嵌套成环: " + workflowId
                    + "（调用链: " + String.join(" → ", active) + " → " + workflowId + "）");
            }
            if (active.size() >= MAX_NESTING_DEPTH) {
                throw new IllegalStateException("工作流嵌套超过最大深度 " + MAX_NESTING_DEPTH);
            }

            String targetWorkflowSchema = resolver.resolve(workflowId);
            if (targetWorkflowSchema == null || targetWorkflowSchema.isEmpty()) {
                throw new IllegalArgumentException("目标工作流不存在: " + workflowId);
            }

            // 解析输入参数值
            Map<String, Object> resolvedInputs = resolveInputValues(chain);

            // 创建并执行目标工作流
            active.push(workflowId);
            try {
                GaiaWorkflow targetWorkflow = new GaiaWorkflow(targetWorkflowSchema);
                Map<String, Object> workflowResult = targetWorkflow.run(resolvedInputs);

                // 将目标工作流的输出作为当前节点的输出
                result.putAll(workflowResult);
            } finally {
                active.pop();
                if (active.isEmpty()) {
                    ACTIVE_CHAIN.remove();
                }
            }

            log.debug("工作流节点执行完成: {}, 输出: {}", getId(), result);

        } catch (Exception e) {
            // 失败必须上抛（引擎置节点 FAILED + 工作流终态 FAILED）：
            // 旧行为吞成 error 字段、节点 FINISHED、父流程继续跑——假成功
            log.error("工作流节点执行失败: {}", getId(), e);
            throw (e instanceof RuntimeException) ? (RuntimeException) e : new RuntimeException(e);
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
            // 必须声明 REF + refValue，否则 Chain.parseOutputResult 按默认值取 null，
            // 把节点 execute 真实返回的输出覆盖掉（嵌套输出回传丢失的根因）
            parameter.setRefType(RefType.REF);
            parameter.setRefValue(Collections.singletonList(paramName));

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

