package cn.boommanpro.gaia.workflow.app.executor.impl;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.app.executor.WorkflowExecutor;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.ErrorMessage;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.Messages;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.NodeReport;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.NodeStatus;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.Snapshot;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.TaskInfo;
import cn.hutool.json.JSONUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Gaia工作流执行器实现
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 15:35
 */
@Component
public class GaiaWorkflowExecutor implements WorkflowExecutor, ApplicationContextAware {

    private static final Logger logger = LoggerFactory.getLogger(GaiaWorkflowExecutor.class);

    private ApplicationContext applicationContext;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        this.applicationContext = applicationContext;
    }

    @Override
    public Map<String, Object> execute(String schema, Map<String, Object> inputs) {
        long startTime = System.currentTimeMillis();
        GaiaWorkflow workflow = null;
        try {
            // 使用GaiaWorkflow执行工作流
            workflow = createWorkflow(schema);
            Map<String, Object> result = workflow.run(inputs);

            // 记录测试调用日志
            recordTestCallLog(schema, inputs, result, startTime, null, workflow);

            return result;
        } catch (Exception e) {
            logger.error("执行工作流失败", e);
            // 记录测试调用日志（包含错误信息）
            recordTestCallLog(schema, inputs, null, startTime, e, workflow);
            throw e;
        }
    }


    @Override
    public void processExecutionException(TaskInfo taskInfo, Exception e) {
        logger.error("工作流执行异常", e);
        updateTaskStatusToFailed(taskInfo);
        recordErrorMessage(taskInfo, e);
    }

    /**
     * 记录测试调用日志
     *
     * @param schema    工作流Schema
     * @param inputs    输入参数
     * @param outputs   输出结果
     * @param startTime 开始时间
     * @param exception 异常信息（如果有的话）
     * @param workflow  工作流实例
     */
    private void recordTestCallLog(String schema, Map<String, Object> inputs, Map<String, Object> outputs, long startTime, Exception exception, GaiaWorkflow workflow) {
        try {
            // 解析工作流编码和版本ID（从schema中获取）
            String workflowCode = parseWorkflowCodeFromSchema(schema);
            Long versionId = parseVersionIdFromSchema(schema);
            String workflowContent = schema;

            // 计算耗时
            long costTime = System.currentTimeMillis() - startTime;

            // 准备日志字段
            String execParam = JSONUtil.toJsonStr(inputs);
            String execStatus = (exception == null) ? "SUCCESS" : "FAILED";
            String reports = "";
            if (workflow != null) {
                reports = JSONUtil.toJsonStr(workflow.getNodeReports());
            }
            String callResult = (outputs != null) ? JSONUtil.toJsonStr(outputs) : "";
            String errorMessage = (exception != null) ? exception.getMessage() : "";

            // 通过ApplicationContext获取TestCallLogRecorder并记录日志
            try {
                Object testCallLogRecorder = applicationContext.getBean("testCallLogRecorderImpl");
                if (testCallLogRecorder != null) {
                    testCallLogRecorder.getClass().getMethod("recordTestCallLog",
                            String.class, Long.class, String.class, Long.class,
                            String.class, String.class, String.class, String.class, String.class)
                        .invoke(testCallLogRecorder,
                                workflowCode, versionId, workflowContent,
                                costTime, execParam, execStatus,
                                reports, callResult, errorMessage);
                }
            } catch (Exception e) {
                // 如果获取或调用Bean失败，则仅记录到日志中
                logger.info("Test call log - WorkflowCode: {}, VersionId: {}, CostTime: {}ms, Status: {}, Error: {}",
                           workflowCode, versionId, costTime, execStatus, errorMessage);
            }

        } catch (Exception e) {
            logger.error("记录测试调用日志失败", e);
        }
    }

    /**
     * 从Schema中解析工作流编码
     *
     * @param schema 工作流Schema
     * @return 工作流编码
     */
    private String parseWorkflowCodeFromSchema(String schema) {
        try {
            // 简单实现，实际可能需要从Schema中提取特定字段
            return "workflow_" + System.currentTimeMillis();
        } catch (Exception e) {
            logger.warn("解析工作流编码失败", e);
            return "unknown_workflow";
        }
    }

    /**
     * 从Schema中解析版本ID
     *
     * @param schema 工作流Schema
     * @return 版本ID
     */
    private Long parseVersionIdFromSchema(String schema) {
        try {
            // 简单实现，实际可能需要从Schema中提取特定字段
            return System.currentTimeMillis();
        } catch (Exception e) {
            logger.warn("解析版本ID失败", e);
            return -1L;
        }
    }

    /**
     * 创建工作流实例
     *
     * @param schema 工作流Schema
     * @return 工作流实例
     */
    private GaiaWorkflow createWorkflow(String schema) {
        return new GaiaWorkflow(schema);
    }

    /**
     * 更新任务状态为成功
     *
     * @param taskInfo 任务信息
     */
    private void updateTaskStatusToSuccess(TaskInfo taskInfo) {
        taskInfo.getWorkflowStatus().setStatus(NodeStatus.SUCCESS.getValue());
        taskInfo.getWorkflowStatus().setTerminated(true);
    }

    /**
     * 更新任务状态为失败
     *
     * @param taskInfo 任务信息
     */
    private void updateTaskStatusToFailed(TaskInfo taskInfo) {
        taskInfo.getWorkflowStatus().setStatus(NodeStatus.FAIL.getValue());
        taskInfo.getWorkflowStatus().setTerminated(true);
    }

    /**
     * 记录错误信息
     *
     * @param taskInfo 任务信息
     * @param e 异常
     */
    private void recordErrorMessage(TaskInfo taskInfo, Exception e) {
        Messages messages = taskInfo.getMessages();
        if (messages == null) {
            messages = new Messages();
            taskInfo.setMessages(messages);
        }
        messages.getError().add(new ErrorMessage("workflow", e.getMessage()));
    }

    /**
     * 处理节点执行报告
     *
     * @param taskInfo 任务信息
     * @param workflow 工作流
     */
    private void processNodeReports(TaskInfo taskInfo, GaiaWorkflow workflow) {
        // 直接使用 GaiaWorkflow 提供的报告格式，避免重复处理逻辑
        Map<String, GaiaWorkflow.NodeReport> nodeReports = workflow.getNodeReports();
        Map<String, NodeReport> taskNodeReports = new HashMap<>();

        // 转换GaiaWorkflow.NodeReport为NodeReport
        nodeReports.forEach((nodeId, report) -> {
            // 直接使用 GaiaWorkflow.NodeReport 中的 snapshots 数据
            NodeReport taskReport = new NodeReport(
                    report.getId(),
                    convertNodeStatus(report.getStatus()),
                    report.getStartTime(),
                    report.getEndTime(),
                    report.getTimeCost(),
                    convertSnapshots(report.getSnapshots())
            );

            taskNodeReports.put(nodeId, taskReport);
        });

        // 设置节点报告
        taskInfo.setNodeReports(taskNodeReports);
    }

    /**
     * 转换 snapshots 格式
     *
     * @param snapshots 原始 snapshots
     * @return 转换后的 snapshots
     */
    private ArrayList<Snapshot> convertSnapshots(java.util.List<Object> snapshots) {
        ArrayList<Snapshot> convertedSnapshots = new ArrayList<>();

        for (Object snapshotObj : snapshots) {
            if (snapshotObj instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> snapshotMap = (Map<String, Object>) snapshotObj;

                Snapshot snapshot = new Snapshot();
                snapshot.setId((String) snapshotMap.get("id"));
                snapshot.setNodeID((String) snapshotMap.get("nodeID"));

                // 处理 inputs
                Object inputs = snapshotMap.get("inputs");
                if (inputs instanceof Map) {
                    snapshot.setInputs((Map<String, Object>) inputs);
                }

                // 处理 outputs
                Object outputs = snapshotMap.get("outputs");
                if (outputs instanceof Map) {
                    snapshot.setOutputs((Map<String, Object>) outputs);
                }

                // 处理 data
                snapshot.setData(snapshotMap.get("data"));

                // 处理 branch
                snapshot.setBranch((String) snapshotMap.get("branch"));

                // 处理 error
                snapshot.setError((String) snapshotMap.get("error"));

                convertedSnapshots.add(snapshot);
            }
        }

        return convertedSnapshots;
    }

    /**
     * 转换节点状态
     *
     * @param status 原始状态
     * @return 转换后的状态
     */
    private String convertNodeStatus(String status) {
        if (status == null) {
            return NodeStatus.PENDING.getValue();
        }

        switch (status.toUpperCase()) {
            case "READY":
            case "WAIT":
                return NodeStatus.PENDING.getValue();
            case "RUNNING":
                return NodeStatus.PROCESSING.getValue();
            case "FINISHED":
                return NodeStatus.SUCCEEDED.getValue();
            case "FAILED":
                return NodeStatus.FAILED.getValue();
            case "SKIPPED":
                return NodeStatus.CANCELED.getValue();
            default:
                return NodeStatus.PENDING.getValue();
        }
    }
}
