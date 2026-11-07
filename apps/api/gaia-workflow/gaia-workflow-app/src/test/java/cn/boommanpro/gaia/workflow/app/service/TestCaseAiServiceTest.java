package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowTestCase;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowTestRun;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowTestCaseService;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowTestRunService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 测试用例 AI 辅助的解析与边界（2026-11-06）：
 * 围栏剥离、字段收敛（op 白名单/无断言跳过/条数封顶）、画布摘要零配置值、
 * 未运行用例的补断言前置条件、LLM 失败不吞语义。
 */
class TestCaseAiServiceTest {

    private static String canvasJson() {
        JSONObject llmData = new JSONObject()
            .set("title", "生成点评")
            .set("apiKey", "sk-secret-should-not-leak");
        JSONObject startData = new JSONObject().set("outputs", new JSONObject()
            .set("properties", new JSONObject()
                .set("text", new JSONObject().set("type", "string"))
                .set("score", new JSONObject().set("type", "integer"))));
        JSONObject endData = new JSONObject().set("inputs", new JSONObject()
            .set("properties", new JSONObject()
                .set("comment", new JSONObject().set("type", "string"))));
        JSONArray nodes = new JSONArray();
        nodes.add(new JSONObject().set("id", "start_0").set("type", "start").set("data", startData));
        nodes.add(new JSONObject().set("id", "llm_1").set("type", "llm").set("data", llmData));
        nodes.add(new JSONObject().set("id", "end_1").set("type", "end").set("data", endData));
        return new JSONObject().set("nodes", nodes).set("edges", new JSONArray()).toString();
    }

    private static LlmCompletionService llmReturning(String content) throws Exception {
        LlmCompletionService llm = mock(LlmCompletionService.class);
        when(llm.complete(anyString(), anyString(), anyDouble(), anyInt())).thenReturn(content);
        return llm;
    }

    @Test
    @DisplayName("生成：围栏 JSON 剥离 + 字段收敛（非法 op 丢行、无断言跳过、nodeId null 归一）")
    void generateParsesFencedJsonAndNormalizesRows() throws Exception {
        LlmCompletionService llm = llmReturning("```json\n" + "["
            + "{\"name\":\"空输入兜底\",\"nodeId\":null,\"inputs\":{},"
            + "\"expected\":[{\"field\":\"comment\",\"op\":\"equals\",\"value\":\"未填写\"},"
            + "{\"field\":\"comment\",\"op\":\"regex\",\"value\":\"x\"}]},"
            + "{\"name\":\"无断言应被跳过\",\"expected\":[]},"
            + "{\"name\":\"节点级\",\"nodeId\":\"llm_1\",\"inputs\":{\"start_0\":{\"text\":\"a\"}},"
            + "\"expected\":[{\"field\":\"result\",\"op\":\"exists\"}]}"
            + "]\n```");
        TestCaseAiService service = new TestCaseAiService(mock(WorkflowTestCaseService.class),
            mock(WorkflowTestRunService.class), llm);

        List<JSONObject> drafts = service.generate("wf_x", "空输入场景", canvasJson());

        assertEquals(2, drafts.size());
        JSONObject first = drafts.get(0);
        assertEquals("空输入兜底", first.getStr("name"));
        assertNull(first.get("nodeId"));
        assertEquals(1, first.getJSONArray("expected").size(), "非法 op（regex）的断言行必须被丢弃");
        assertEquals("equals", first.getJSONArray("expected").getJSONObject(0).getStr("op"));
        assertEquals("llm_1", drafts.get(1).getStr("nodeId"));
    }

    @Test
    @DisplayName("生成：prompt 为空也要把场景占位与画布摘要带给模型（定向生成的兜底语义）")
    void generateSendsCanvasSummaryEvenWithoutPrompt() throws Exception {
        LlmCompletionService llm = llmReturning("[{\"name\":\"边界\",\"expected\":[{\"field\":\"comment\",\"op\":\"exists\"}]}]");
        TestCaseAiService service = new TestCaseAiService(mock(WorkflowTestCaseService.class),
            mock(WorkflowTestRunService.class), llm);

        service.generate("wf_x", null, canvasJson());

        ArgumentCaptor<String> userText = ArgumentCaptor.forClass(String.class);
        verify(llm).complete(anyString(), userText.capture(), anyDouble(), anyInt());
        String user = userText.getValue();
        assertTrue(user.contains("生成点评"), "画布摘要应带节点标题：" + user);
        assertTrue(user.contains("comment"), "画布摘要应带 end 输出字段：" + user);
        assertFalse(user.contains("sk-secret"), "画布摘要不得包含节点配置值（凭证零暴露）：" + user);
    }

    @Test
    @DisplayName("生成：缺 schema 直接拒绝；AI 输出不可解析报可读错误")
    void generateRejectsMissingSchemaAndBadOutput() throws Exception {
        TestCaseAiService service = new TestCaseAiService(mock(WorkflowTestCaseService.class),
            mock(WorkflowTestRunService.class), llmReturning("我认为你应该手工写用例"));
        assertThrows(IllegalArgumentException.class, () -> service.generate("wf_x", null, null));
        assertThrows(IllegalArgumentException.class, () -> service.generate("wf_x", null, canvasJson()));
    }

    private static WorkflowTestRun runOf(Long caseId, String status, String actualJson, String assertJson) {
        WorkflowTestRun run = new WorkflowTestRun();
        run.setCaseId(caseId);
        run.setStatus(status);
        run.setActualJson(actualJson);
        run.setAssertResultsJson(assertJson);
        return run;
    }

    @Test
    @DisplayName("补断言：未运行且无 schema 拒绝；有实际输出则提示词带 actual 与已有断言")
    void suggestAssertionsRequiresRunOrSchema() throws Exception {
        WorkflowTestCaseService caseService = mock(WorkflowTestCaseService.class);
        WorkflowTestRunService runService = mock(WorkflowTestRunService.class);
        WorkflowTestCase testCase = new WorkflowTestCase();
        testCase.setId(7L);
        testCase.setName("空输入兜底");
        testCase.setExpectedJson("[{\"field\":\"comment\",\"op\":\"exists\"}]");
        when(caseService.getById(7L)).thenReturn(testCase);
        when(runService.list(any())).thenReturn(List.of());
        LlmCompletionService llm = llmReturning("[{\"field\":\"comment\",\"op\":\"equals\",\"value\":\"未填写\"}]");
        TestCaseAiService service = new TestCaseAiService(caseService, runService, llm);

        assertThrows(IllegalArgumentException.class, () -> service.suggestAssertions(7L, null));

        when(runService.list(any())).thenReturn(List.of(
            runOf(7L, "passed", "{\"comment\":\"未填写\"}", "[]")));
        java.util.Map<String, Object> out = service.suggestAssertions(7L, null);
        List<JSONObject> rows = toList(out.get("assertions"));
        assertEquals(1, rows.size());
        assertEquals("equals", rows.get(0).getStr("op"));

        ArgumentCaptor<String> userText = ArgumentCaptor.forClass(String.class);
        verify(llm).complete(anyString(), userText.capture(), anyDouble(), anyInt());
        assertTrue(userText.getValue().contains("空输入兜底"), "提示词应带用例名");
        assertTrue(userText.getValue().contains("未填写"), "提示词应带实际输出值");
    }

    private static List<JSONObject> toList(Object jsonArray) {
        JSONArray arr = (JSONArray) jsonArray;
        List<JSONObject> out = new java.util.ArrayList<>();
        for (Object o : arr) {
            out.add((JSONObject) o);
        }
        return out;
    }

    @Test
    @DisplayName("诊断：未失败拒绝；fix 里的字段收敛后透出")
    void diagnoseOnlyForFailedRuns() throws Exception {
        WorkflowTestCaseService caseService = mock(WorkflowTestCaseService.class);
        WorkflowTestRunService runService = mock(WorkflowTestRunService.class);
        WorkflowTestCase testCase = new WorkflowTestCase();
        testCase.setId(9L);
        testCase.setName("长文本截断");
        when(caseService.getById(9L)).thenReturn(testCase);
        when(runService.list(any())).thenReturn(List.of(runOf(9L, "passed", null, "[]")));
        TestCaseAiService service = new TestCaseAiService(caseService, runService,
            llmReturning("{\"diagnosis\":\"x\",\"fix\":null}"));

        assertThrows(IllegalArgumentException.class, () -> service.diagnose(9L));

        when(runService.list(any())).thenReturn(List.of(runOf(9L, "failed", null,
            "[{\"field\":\"comment\",\"op\":\"equals\",\"expected\":\"a\",\"actual\":\"b\",\"pass\":false}]")));
        LlmCompletionService llm = llmReturning("{\"diagnosis\":\"期望写错\",\"fix\":{\"field\":\"comment\",\"op\":\"equals\",\"value\":\"b\"}}");
        TestCaseAiService fixed = new TestCaseAiService(caseService, runService, llm);
        java.util.Map<String, Object> out = fixed.diagnose(9L);
        assertEquals("期望写错", out.get("diagnosis"));
        JSONObject fix = (JSONObject) out.get("fix");
        assertEquals("comment", fix.getStr("field"));
        assertEquals("b", fix.getStr("value"));
    }

    @Test
    @DisplayName("断言规范化：equals 缺 value 丢行；条数封顶 8")
    void normalizeExpectedDropsMissingValueAndClamps() {
        JSONArray raw = new JSONArray();
        raw.add(new JSONObject().set("field", "a").set("op", "equals")); // 缺 value → 丢
        raw.add(new JSONObject().set("field", "b").set("op", "contains").set("value", "x"));
        for (int i = 0; i < 12; i++) {
            raw.add(new JSONObject().set("field", "f" + i).set("op", "exists"));
        }
        JSONArray out = TestCaseAiService.normalizeExpected(raw);
        assertEquals(8, out.size(), "条数封顶");
        assertEquals("contains", out.getJSONObject(0).getStr("op"));
    }
}
