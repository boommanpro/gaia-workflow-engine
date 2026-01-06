package cn.boommanpro.gaia.workflow.app.executor.impl;

import cn.boommanpro.gaia.workflow.app.domain.testrun.model.*;
import cn.boommanpro.gaia.workflow.base.type.ChainNodeStatus;
import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.listener.ChainExecutionListener;
import cn.boommanpro.gaia.workflow.base.model.ChainNodeExecuteInfo;
import cn.boommanpro.gaia.workflow.app.executor.AsyncWorkflowExecutor;
import cn.boommanpro.gaia.workflow.app.domain.testrun.input.TaskRunInput;
import cn.boommanpro.gaia.workflow.app.service.TaskRepository;
import cn.hutool.json.JSONUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * 基于线程池的异步工作流执行器实现
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22 16:15
 */
@Component
public class ThreadPoolAsyncWorkflowExecutor implements AsyncWorkflowExecutor, ApplicationContextAware {

    private static final Logger logger = LoggerFactory.getLogger(ThreadPoolAsyncWorkflowExecutor.class);

    /**
     * 线程池大小
     */
    private static final int THREAD_POOL_SIZE = 10;

    /**
     * 线程池
     */
    private ExecutorService executorService;

    private final TaskRepository taskRepository;
    private ApplicationContext applicationContext;

    @Autowired
    public ThreadPoolAsyncWorkflowExecutor(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        this.applicationContext = applicationContext;
    }

    @PostConstruct
    public void init() {
        executorService = Executors.newFixedThreadPool(THREAD_POOL_SIZE);
        logger.info("异步工作流执行器线程池已初始化，大小：{}", THREAD_POOL_SIZE);
    }

    @PreDestroy
    public void destroy() {
        if (executorService != null) {
            executorService.shutdown();
            try {
                if (!executorService.awaitTermination(30, TimeUnit.SECONDS)) {
                    executorService.shutdownNow();
                }
            } catch (InterruptedException e) {
                executorService.shutdownNow();
                Thread.currentThread().interrupt();
            }
            logger.info("异步工作流执行器线程池已关闭");
        }
    }

    @Override
    public void executeAsync(String taskId, TaskInfo taskInfo, TaskRunInput input) {
        executorService.submit(() -> {
            try {
                // 更新工作流状态为处理中
                updateTaskStatus(taskId, taskInfo, NodeStatus.PROCESSING);

                long startTime = System.currentTimeMillis();
                GaiaWorkflow workflow = new GaiaWorkflow(input.getSchema());

                ChainExecutionListener listener = new ChainExecutionListener() {
                    @Override
                    public void onNodeStatusChanged(String chainId, String nodeId, ChainNodeExecuteInfo executeInfo) {
                        try {
                            updateNodeStatus(taskId, taskInfo, nodeId, executeInfo);
                        } catch (Exception e) {
                            logger.warn("更新节点状态失败, taskId: {}, nodeId: {}", taskId, nodeId, e);
                        }
                    }

                    @Override
                    public void onProgressUpdate(String chainId, Map<String, ChainNodeExecuteInfo> executeInfoMap,
                                                 int completedNodes, int totalNodes) {
                        // 简化实现，不处理进度更新
                    }

                    @Override
                    public void onExecutionComplete(String chainId, Map<String, Object> result, Exception exception) {
                        try {
                            handleExecutionComplete(taskId, taskInfo, workflow, input, result, exception, startTime);
                        } catch (Exception e) {
                            logger.error("处理工作流完成回调失败, taskId: {}", taskId, e);
                        }
                    }
                };
                // 添加监听器
                workflow.addListener(listener);

                // 异步执行工作流
                workflow.runAsync(input.getInputs())
                        .whenComplete((result, throwable) -> {
                            try {
                                // 确保资源被清理
                                workflow.removeListener(listener);
                                workflow.shutdownAsyncExecution();
                            } catch (Exception e) {
                                logger.warn("清理工作流资源失败, taskId: {}", taskId, e);
                            }
                        });

            } catch (Exception e) {
                logger.error("异步执行工作流失败", e);
                // 处理执行异常
                processExecutionException(taskId, taskInfo, e);
                taskRepository.updateTask(taskId, taskInfo);
            }
        });
    }

    /**
     * 处理节点执行报告
     *
     * @param taskId   任务ID
     * @param taskInfo 任务信息
     * @param workflow 工作流实例
     */
    private void processNodeReports(String taskId, TaskInfo taskInfo, GaiaWorkflow workflow) {
        try {
            // 直接使用 GaiaWorkflow 提供的报告格式
            Map<String, GaiaWorkflow.NodeReport> nodeReports = workflow.getNodeReports();

            // 获取现有的节点报告，如果不存在则创建新的
            Map<String, NodeReport> taskNodeReports = taskInfo.getNodeReports();
            // 转换GaiaWorkflow.NodeReport为NodeReport
            nodeReports.forEach((nodeId, report) -> {
                NodeReport taskReport = new NodeReport(
                        report.getId(),
                        convertNodeStatus(report.getStatus()),
                        report.getStartTime(),
                        report.getEndTime(),
                        report.getTimeCost(),
                        convertSnapshots(report.getSnapshots())
                );

                taskNodeReports.put(nodeId, taskReport);
                String newStatus = convertNodeStatus(report.getStatus());
                List<Snapshot> newSnapshots = convertSnapshots(report.getSnapshots());

                NodeReport existingReport = taskInfo.getNodeReports().get(nodeId);

                if (existingReport != null) {
                    // 只更新状态和时间信息，不处理snapshot（避免重复添加）
                    // snapshot已经在onNodeStatusChanged和onProgressUpdate中处理过了
                    existingReport.setStatus(newStatus);
                    existingReport.setStartTime(report.getStartTime());
                    existingReport.setEndTime(report.getEndTime());
                    existingReport.setTimeCost(report.getTimeCost());
                } else {
                    // 不存在则加入，包含完整的snapshot信息
                    taskReport = new NodeReport(
                            report.getId(),
                            newStatus,
                            report.getStartTime(),
                            report.getEndTime(),
                            report.getTimeCost(),
                            newSnapshots
                    );
                    taskInfo.getNodeReports().put(nodeId, taskReport);
                }
            });

            // 设置节点报告
            taskInfo.setNodeReports(taskNodeReports);
        } catch (Exception e) {
            logger.error("处理节点报告失败, taskId: {}", taskId, e);

            // 即使处理报告失败，也要确保任务信息被正确设置
            if (taskInfo.getNodeReports() == null) {
                taskInfo.setNodeReports(new HashMap<>());
            }
        }
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
                return NodeStatus.PENDING.getValue();
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

    /**
     * 记录测试调用日志
     *
     * @param taskId    任务ID
     * @param taskInfo  任务信息
     * @param input     输入参数
     * @param outputs   输出结果
     * @param costTime  耗时
     * @param exception 异常信息（如果有的话）
     */
    private void recordTestCallLog(String taskId, TaskInfo taskInfo, TaskRunInput input,
                                   Map<String, Object> outputs, long costTime, Exception exception) {
        try {
            String schema = input.getSchema();
            Map<String, Object> inputs = input.getInputs();

            // 解析工作流编码和版本ID（从schema中获取）
            String workflowCode = parseWorkflowCodeFromSchema(schema);
            Long versionId = parseVersionIdFromSchema(schema);
            String workflowContent = schema;

            // 准备日志字段
            String execParam = JSONUtil.toJsonStr(inputs);
            String execStatus = (exception == null) ? "SUCCESS" : "FAILED";
            String reports = "";
            // 注意：这里我们不重新执行工作流来获取报告，而是从taskInfo中获取
            if (taskInfo.getNodeReports() != null) {
                reports = JSONUtil.toJsonStr(taskInfo.getNodeReports());
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
                logger.info("Test call log - TaskId: {}, WorkflowCode: {}, VersionId: {}, CostTime: {}ms, Status: {}, Error: {}",
                        taskId, workflowCode, versionId, costTime, execStatus, errorMessage);
            }

        } catch (Exception e) {
            logger.error("记录测试调用日志失败, taskId: {}", taskId, e);
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
     * 处理执行异常
     *
     * @param taskId   任务ID
     * @param taskInfo 任务信息
     * @param e        异常
     */
    private void processExecutionException(String taskId, TaskInfo taskInfo, Exception e) {
        try {
            logger.error("工作流执行异常, taskId: {}", taskId, e);
            taskInfo.getWorkflowStatus().setStatus(NodeStatus.FAIL.getValue());
            taskInfo.getWorkflowStatus().setTerminated(true);

            // 记录错误信息
            Messages messages = taskInfo.getMessages();
            if (messages == null) {
                messages = new Messages();
                taskInfo.setMessages(messages);
            }
            messages.getError().add(new ErrorMessage("workflow", e.getMessage()));

            // 记录测试调用日志（包含错误信息）
            recordTestCallLog(taskId, taskInfo, new TaskRunInput() {{
                setSchema(taskInfo.getSchema());
                setInputs(taskInfo.getInputs());
            }}, null, 0L, e);
        } catch (Exception ex) {
            logger.error("处理执行异常失败, taskId: {}", taskId, ex);
        }
    }

    /**
     * 更新节点状态
     * 简化实现：只监听节点状态变更并存储
     *
     * @param taskId      任务ID
     * @param taskInfo    任务信息
     * @param nodeId      节点ID
     * @param executeInfo 节点执行信息
     */
    private void updateNodeStatus(String taskId, TaskInfo taskInfo, String nodeId, ChainNodeExecuteInfo executeInfo) {
        try {
            // 获取现有的节点报告，如果不存在则创建新的
            Map<String, NodeReport> taskNodeReports = taskInfo.getNodeReports();
            if (taskNodeReports == null) {
                taskNodeReports = new HashMap<>();
                taskInfo.setNodeReports(taskNodeReports);
            }

            // 计算执行时长
            long timeCost = 0;
            if (executeInfo.getStartTime() != null && executeInfo.getEndTime() != null) {
                timeCost = executeInfo.getEndTime() - executeInfo.getStartTime();
            }

            String newStatus = convertNodeStatus(executeInfo.getStatus().name());
            NodeReport report = taskNodeReports.getOrDefault(nodeId,  new NodeReport(
                    executeInfo.getId(),
                    newStatus,
                    executeInfo.getStartTime(),
                    executeInfo.getEndTime(),
                    timeCost,
                    new ArrayList<>()
            ));
            report.setStatus(newStatus);
            report.setStartTime(executeInfo.getStartTime());
            report.setEndTime(executeInfo.getEndTime());
            report.setTimeCost(timeCost);

            taskNodeReports.put(nodeId, report);
            if (isNodeCompleted(executeInfo.getStatus())) {
                Snapshot snapshot = createSnapshot(executeInfo,report.getSnapshots());
                addSnapshotToReport(report, snapshot);
            }

            // 更新任务状态
            taskRepository.updateTask(taskId, taskInfo);

        } catch (Exception e) {
            logger.warn("更新节点状态失败, taskId: {}, nodeId: {}", taskId, nodeId, e);
        }
    }


    /**
     * 判断节点是否已完成
     *
     * @param status 节点状态
     * @return 是否已完成
     */
    private boolean isNodeCompleted(ChainNodeStatus status) {
        return status == ChainNodeStatus.FINISHED ||
                status == ChainNodeStatus.FAILED;
    }

    /**
     * 创建 snapshot 对象
     *
     * @param info      节点执行信息
     * @param snapshots
     * @return snapshot
     */
    private Snapshot createSnapshot(ChainNodeExecuteInfo info, List<Snapshot> snapshots) {
        Snapshot snapshot = new Snapshot();
        for (Snapshot temp : snapshots) {
            if (temp.getId().equals(info.getExecuteInfoId())) {
                snapshot = temp;
            }
        }
        // 使用节点ID和时间戳创建唯一ID
        snapshot.setId(info.getExecuteInfoId());
        snapshot.setNodeID(info.getId());

        // 处理 inputs
        if (info.getInputsResult() != null) {
            try {
                Map<String, Object> inputs = JSONUtil.parseObj(info.getInputsResult());
                snapshot.setInputs(inputs);
            } catch (Exception e) {
                logger.debug("解析节点输入失败: {}", info.getId(), e);
            }
        }

        // 处理 outputs
        if (info.getOutputResult() != null) {
            try {
                Map<String, Object> outputs = JSONUtil.parseObj(info.getOutputResult());
                snapshot.setOutputs(outputs);
            } catch (Exception e) {
                logger.debug("解析节点输出失败: {}", info.getId(), e);
            }
        }

        // 处理 data
        if (info.getExecuteResult() != null) {
            try {
                Object data = JSONUtil.parse(info.getExecuteResult());
                snapshot.setData(data);
            } catch (Exception e) {
                logger.debug("解析节点数据失败: {}", info.getId(), e);
            }
        }

        // 处理 error
        if (info.getStatus() != null && info.getStatus().name().contains("FAILED")) {
            String error = info.getException() != null ? info.getException() : "执行失败";
            snapshot.setError(error);
        }

        snapshot.setBranch(info.getBranch());
        return snapshot;
    }

    /**
     * 将 snapshot 添加到节点报告中
     * 对于循环节点，每次执行都添加新的 snapshot
     * 对于普通节点，只保留最新的 snapshot
     *
     * @param report   节点报告
     * @param snapshot 新的 snapshot
     */
    private void addSnapshotToReport(NodeReport report, Snapshot snapshot) {
        List<Snapshot> existingSnapshots = report.getSnapshots();
        if (existingSnapshots == null) {
            existingSnapshots = new ArrayList<>();
            report.setSnapshots(existingSnapshots);
        }

        // 直接添加新的 snapshot
        // 这样循环节点的每次执行都会被记录
        // 而普通节点也会在每次完成时添加（符合预期）
        for (Snapshot existingSnapshot : existingSnapshots) {
            if (snapshot.getId().equals(existingSnapshot.getId())) {
                return;
            }
        }
        existingSnapshots.add(snapshot);
    }

    /**
     * 处理工作流执行完成
     *
     * @param taskId    任务ID
     * @param taskInfo  任务信息
     * @param workflow  工作流实例
     * @param input     输入参数
     * @param result    执行结果
     * @param exception 异常信息
     * @param startTime 开始时间
     */
    private void handleExecutionComplete(String taskId, TaskInfo taskInfo, GaiaWorkflow workflow,
                                         TaskRunInput input, Map<String, Object> result, Exception exception, long startTime) {
        try {
            long costTime = System.currentTimeMillis() - startTime;

            // 处理节点执行报告
            processNodeReports(taskId, taskInfo, workflow);

            // 根据是否有异常设置工作流状态
            if (exception == null) {
                // 没有异常，设置为成功状态
                taskInfo.getWorkflowStatus().setStatus(NodeStatus.SUCCESS.getValue());
            } else {
                // 有异常，设置为失败状态
                taskInfo.getWorkflowStatus().setStatus(NodeStatus.FAIL.getValue());

                // 记录错误信息
                Messages messages = taskInfo.getMessages();
                if (messages == null) {
                    messages = new Messages();
                    taskInfo.setMessages(messages);
                }
                messages.getError().add(new ErrorMessage("workflow", exception.getMessage()));
            }

            taskInfo.getWorkflowStatus().setTerminated(true);

            // 设置输出结果
            taskInfo.setOutputs(result);

            // 记录测试调用日志
            recordTestCallLog(taskId, taskInfo, input, result, costTime, exception);

            // 更新任务信息
            taskRepository.updateTask(taskId, taskInfo);

        } catch (Exception e) {
            logger.error("处理工作流完成回调失败, taskId: {}", taskId, e);
        }
    }

    /**
     * 更新任务状态
     *
     * @param taskId   任务ID
     * @param taskInfo 任务信息
     * @param status   状态
     */
    private void updateTaskStatus(String taskId, TaskInfo taskInfo, NodeStatus status) {
        taskInfo.getWorkflowStatus().setStatus(status.getValue());
        taskRepository.updateTask(taskId, taskInfo);
    }

}
