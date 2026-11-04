package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.app.service.LlmCompletionService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDiffService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 版本说明建议的三层语义：LLM 可用时用模型一句话；超时/失败回退确定性 diff 摘要；
 * 无结构变更不花模型调用。任何路径都返回可用文本，不阻断保存弹窗。
 */
class VersionDescSuggestionServiceTest {

    private static JSONObject draftDoc() {
        cn.hutool.json.JSONArray nodes = new cn.hutool.json.JSONArray();
        nodes.add(new JSONObject().set("id", "start_0").set("type", "start").set("data", new JSONObject()));
        nodes.add(new JSONObject().set("id", "llm_2").set("type", "llm")
            .set("data", new JSONObject().set("title", "查询订单")));
        return new JSONObject()
            .set("nodes", nodes)
            .set("edges", new cn.hutool.json.JSONArray());
    }

    private SessionWorkflowDraftService draftServiceReturning(JSONObject doc, String boundCode) {
        SessionWorkflowDraftService draftService = mock(SessionWorkflowDraftService.class);
        when(draftService.publicDoc("s-1")).thenReturn(doc);
        when(draftService.getBoundCode("s-1")).thenReturn(boundCode);
        return draftService;
    }

    @Test
    @DisplayName("LLM 可用：返回模型一句话，source=ai，提示词带节点标题")
    void llmSuggestionUsedWhenAvailable() throws Exception {
        SessionWorkflowDraftService draftService = draftServiceReturning(draftDoc(), null);
        GaiaWorkflowVersionService versionService = mock(GaiaWorkflowVersionService.class);
        when(versionService.getOne(any())).thenReturn(null);
        LlmCompletionService llm = mock(LlmCompletionService.class);
        when(llm.complete(anyString(), anyString(), anyDouble(), anyInt())).thenReturn("新增查询订单节点");

        VersionDescSuggestionService service = new VersionDescSuggestionService(
            draftService, versionService, new WorkflowDiffService(), llm);
        VersionDescSuggestionService.Suggestion suggestion = service.suggest("s-1", null);

        assertTrue(suggestion.success);
        assertEquals("新增查询订单节点", suggestion.desc);
        assertEquals("ai", suggestion.source);

        ArgumentCaptor<String> userText = ArgumentCaptor.forClass(String.class);
        verify(llm).complete(anyString(), userText.capture(), anyDouble(), anyInt());
        assertTrue(userText.getValue().contains("查询订单"), "提示词必须带变更节点标题：" + userText.getValue());
        assertTrue(userText.getValue().contains("首版"));
    }

    @Test
    @DisplayName("LLM 失败：回退确定性摘要（首版=新建文案），source=diff")
    void fallsBackToDeterministicWhenLlmFails() throws Exception {
        SessionWorkflowDraftService draftService = draftServiceReturning(draftDoc(), "wf_a");
        GaiaWorkflowVersionService versionService = mock(GaiaWorkflowVersionService.class);
        when(versionService.getOne(any())).thenReturn(null);
        LlmCompletionService llm = mock(LlmCompletionService.class);
        when(llm.complete(anyString(), anyString(), anyDouble(), anyInt()))
            .thenThrow(new RuntimeException("model down"));

        VersionDescSuggestionService service = new VersionDescSuggestionService(
            draftService, versionService, new WorkflowDiffService(), llm);
        VersionDescSuggestionService.Suggestion suggestion = service.suggest("s-1", null);

        assertTrue(suggestion.success);
        assertEquals("diff", suggestion.source);
        assertEquals("新建工作流 · 2 节点", suggestion.desc);
    }

    @Test
    @DisplayName("更新场景：确定性回退含 diff 计数；LLM 文本优先于计数")
    void updateScenarioPrefersLlmTextOverCounts() throws Exception {
        cn.hutool.json.JSONArray prevNodes = new cn.hutool.json.JSONArray();
        prevNodes.add(new JSONObject().set("id", "start_0").set("type", "start").set("data", new JSONObject()));
        prevNodes.add(new JSONObject().set("id", "llm_1").set("type", "llm")
            .set("data", new JSONObject().set("title", "生成回复")));
        String previousJson = new JSONObject()
            .set("nodes", prevNodes)
            .set("edges", new cn.hutool.json.JSONArray()).toString();
        GaiaWorkflowVersion current = new GaiaWorkflowVersion();
        current.setWorkflowCode("wf_a");
        current.setWorkflowData(previousJson);
        GaiaWorkflowVersionService versionService = mock(GaiaWorkflowVersionService.class);
        when(versionService.getOne(any())).thenReturn(current);
        LlmCompletionService llm = mock(LlmCompletionService.class);
        when(llm.complete(anyString(), anyString(), anyDouble(), anyInt())).thenReturn("调整生成提示词并新增订单查询");

        VersionDescSuggestionService service = new VersionDescSuggestionService(
            draftServiceReturning(draftDoc(), "wf_a"), versionService, new WorkflowDiffService(), llm);
        VersionDescSuggestionService.Suggestion suggestion = service.suggest("s-1", null);

        assertEquals("ai", suggestion.source);
        assertEquals("调整生成提示词并新增订单查询", suggestion.desc);

        // 同一场景拿掉 LLM：确定性回退必须是 diff 计数摘要（与版本列表同源）
        LlmCompletionService brokenLlm = mock(LlmCompletionService.class);
        when(brokenLlm.complete(anyString(), anyString(), anyDouble(), anyInt()))
            .thenThrow(new RuntimeException("down"));
        VersionDescSuggestionService fallbackService = new VersionDescSuggestionService(
            draftServiceReturning(draftDoc(), "wf_a"), versionService, new WorkflowDiffService(), brokenLlm);
        VersionDescSuggestionService.Suggestion fallback = fallbackService.suggest("s-1", null);
        assertEquals("diff", fallback.source);
        assertTrue(fallback.desc.contains("+1节点"), "回退文案须含新增计数：" + fallback.desc);
    }

    @Test
    @DisplayName("无结构变更：固定文案直达，不调用 LLM")
    void noChangeSkipsLlm() throws Exception {
        String sameJson = draftDoc().toString();
        GaiaWorkflowVersion current = new GaiaWorkflowVersion();
        current.setWorkflowCode("wf_a");
        current.setWorkflowData(sameJson);
        GaiaWorkflowVersionService versionService = mock(GaiaWorkflowVersionService.class);
        when(versionService.getOne(any())).thenReturn(current);
        LlmCompletionService llm = mock(LlmCompletionService.class);

        VersionDescSuggestionService service = new VersionDescSuggestionService(
            draftServiceReturning(draftDoc(), "wf_a"), versionService, new WorkflowDiffService(), llm);
        VersionDescSuggestionService.Suggestion suggestion = service.suggest("s-1", null);

        assertTrue(suggestion.success);
        assertEquals("同步保存 · 无结构变更", suggestion.desc);
        assertEquals("diff", suggestion.source);
        verify(llm, never()).complete(anyString(), anyString(), anyDouble(), anyInt());
    }

    @Test
    @DisplayName("空草稿：明确报错不生成")
    void emptyDraftReportsError() {
        SessionWorkflowDraftService draftService = draftServiceReturning(
            new JSONObject().set("nodes", new cn.hutool.json.JSONArray()), null);
        VersionDescSuggestionService service = new VersionDescSuggestionService(
            draftService, mock(GaiaWorkflowVersionService.class), new WorkflowDiffService(),
            mock(LlmCompletionService.class));
        VersionDescSuggestionService.Suggestion suggestion = service.suggest("s-1", null);

        assertFalse(suggestion.success);
        assertNotNull(suggestion.error);
    }
}
