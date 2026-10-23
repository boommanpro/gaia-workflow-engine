package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.executor.SingleNodeExecutor;
import cn.boommanpro.gaia.workflow.app.service.DraftRunService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowTestCaseOrchestrator;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * run(target=workflow) 每次整流试跑必须落一条 test_report 产物（第一档 H2）：
 * 该类型在产物面板里定义了却从无写入方，对话内试跑历史无处可查。
 */
class RunToolExecutorTestReportTest {

    @Test
    void workflowRunShouldAppendTestReportArtifact() {
        SessionWorkflowDraftService draftService = mock(SessionWorkflowDraftService.class);
        DraftRunService draftRunService = mock(DraftRunService.class);
        SessionArtifactStore artifactStore = mock(SessionArtifactStore.class);
        when(draftService.publicDoc("sess_1")).thenReturn(new JSONObject());

        DraftRunService.RunReport report = new DraftRunService.RunReport();
        report.success = true;
        report.timeCostMs = 42L;
        report.outputs = java.util.Map.of("answer", "ok");
        when(draftRunService.run(any(), any())).thenReturn(report);

        RunToolExecutor executor = new RunToolExecutor(
            draftService, mock(SingleNodeExecutor.class), draftRunService,
            mock(WorkflowTestCaseOrchestrator.class), artifactStore);

        AgentRunContext ctx = new AgentRunContext(
            AgentRequest.of("sess_1", "跑一下", "zh-CN", "{}"), null, null);
        executor.execute(new JSONObject().set("target", "workflow"), ctx);

        ArgumentCaptor<String> type = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> status = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<JSONObject> payload = ArgumentCaptor.forClass(JSONObject.class);
        verify(artifactStore, times(1)).appendArtifact(
            eq("sess_1"), isNull(), type.capture(), status.capture(),
            anyString(), anyString(), payload.capture());
        assertEquals(SessionArtifactStore.TYPE_TEST_REPORT, type.getValue());
        assertEquals("passed", status.getValue());
        assertTrue(payload.getValue().getBool("success"));
        assertEquals("passed", payload.getValue().getStr("status"), "payload.status 供前端失败样式判定");
    }

    @Test
    void failedRunShouldAppendFailedTestReport() {
        SessionWorkflowDraftService draftService = mock(SessionWorkflowDraftService.class);
        DraftRunService draftRunService = mock(DraftRunService.class);
        SessionArtifactStore artifactStore = mock(SessionArtifactStore.class);
        when(draftService.publicDoc("sess_1")).thenReturn(new JSONObject());

        DraftRunService.RunReport report = new DraftRunService.RunReport();
        report.success = false;
        report.error = "节点 llm_1 调用失败";
        when(draftRunService.run(any(), any())).thenReturn(report);

        RunToolExecutor executor = new RunToolExecutor(
            draftService, mock(SingleNodeExecutor.class), draftRunService,
            mock(WorkflowTestCaseOrchestrator.class), artifactStore);

        AgentRunContext ctx = new AgentRunContext(
            AgentRequest.of("sess_1", "跑一下", "zh-CN", "{}"), null, null);
        executor.execute(new JSONObject().set("target", "workflow"), ctx);

        ArgumentCaptor<String> status = ArgumentCaptor.forClass(String.class);
        verify(artifactStore).appendArtifact(anyString(), isNull(),
            eq(SessionArtifactStore.TYPE_TEST_REPORT), status.capture(),
            anyString(), anyString(), any(JSONObject.class));
        assertEquals("failed", status.getValue());
    }
}
