package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.app.domain.testrun.input.TaskRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskRunOutput;
import cn.boommanpro.gaia.workflow.app.executor.AsyncWorkflowExecutor;
import cn.boommanpro.gaia.workflow.app.executor.SingleNodeExecutor;
import cn.boommanpro.gaia.workflow.app.service.impl.WorkflowTaskServiceImpl;
import cn.boommanpro.gaia.workflow.app.service.TaskRepository;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * api/task/run 运行前预检：直调方没有前端 validate 挡在前面，
 * 带未知类型（如 multi-condition）或空 schema 的请求必须在入口被结构化拒绝，
 * 不能进执行器后 NPE。
 */
class WorkflowTaskRunPreValidateTest {

    private WorkflowTaskServiceImpl newService(AsyncWorkflowExecutor executor) {
        return new WorkflowTaskServiceImpl(mock(TaskRepository.class), executor, mock(SingleNodeExecutor.class));
    }

    @Test
    void emptySchemaShouldBeRejectedBeforeExecution() {
        AsyncWorkflowExecutor executor = mock(AsyncWorkflowExecutor.class);
        TaskRunInput input = new TaskRunInput();
        input.setSchema("");

        TaskRunOutput output = newService(executor).runWorkflow(input);

        assertNull(output.getTaskID());
        assertNotNull(output.getErrors());
        assertFalse(output.getErrors().isEmpty());
        verify(executor, never()).executeAsync(anyString(), any(), any());
    }

    @Test
    void unknownNodeTypeShouldBeRejectedWithStructuredErrors() {
        AsyncWorkflowExecutor executor = mock(AsyncWorkflowExecutor.class);
        TaskRunInput input = new TaskRunInput();
        input.setSchema("{\"nodes\":[{\"id\":\"start_1\",\"type\":\"start\"},"
                + "{\"id\":\"bad_1\",\"type\":\"multi-condition\"}],"
                + "\"edges\":[{\"sourceNodeID\":\"start_1\",\"targetNodeID\":\"bad_1\"}]}");

        TaskRunOutput output = newService(executor).runWorkflow(input);

        assertNull(output.getTaskID());
        assertNotNull(output.getErrors());
        assertTrue(output.getErrors().stream().anyMatch(e -> e.contains("multi-condition")));
        // 结构化 issues 必须带回（前端按 nodeId 定位画布节点）
        assertNotNull(output.getIssues());
        assertTrue(output.getIssues().stream().anyMatch(i -> "bad_1".equals(i.getNodeId())));
        verify(executor, never()).executeAsync(anyString(), any(), any());
    }

    @Test
    void nullSchemaShouldBeRejected() {
        AsyncWorkflowExecutor executor = mock(AsyncWorkflowExecutor.class);
        TaskRunInput input = new TaskRunInput();
        input.setSchema(null);

        TaskRunOutput output = newService(executor).runWorkflow(input);

        assertNull(output.getTaskID());
        assertFalse(output.getErrors().isEmpty());
        verify(executor, never()).executeAsync(anyString(), any(), any());
    }

    /** 最小合法图（start→end 连通、无未知类型）应通过预检并启动任务 */
    @Test
    void minimalValidSchemaShouldPassPreValidate() {
        AsyncWorkflowExecutor executor = mock(AsyncWorkflowExecutor.class);
        TaskRunInput input = new TaskRunInput();
        input.setSchema("{\"nodes\":["
                + "{\"id\":\"start_1\",\"type\":\"start\",\"data\":{\"outputs\":{\"type\":\"object\",\"properties\":{\"q\":{\"type\":\"string\",\"title\":\"问题\"}}}}},"
                + "{\"id\":\"end_1\",\"type\":\"end\",\"data\":{\"inputsValues\":{\"answer\":{\"type\":\"ref\",\"content\":[\"start_1\",\"q\"]}}}}"
                + "],\"edges\":[{\"sourceNodeID\":\"start_1\",\"targetNodeID\":\"end_1\"}]}");

        TaskRunOutput output = newService(executor).runWorkflow(input);

        assertNull(output.getErrors());
        assertNotNull(output.getTaskID());
        verify(executor).executeAsync(anyString(), any(), any());
    }
}
