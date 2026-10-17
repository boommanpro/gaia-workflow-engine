package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.app.node.AbstractNodeTest;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

/**
 * run(target=workflow) 的执行底座：必须真正跑整图并给出节点级报告——
 * 2026-10-17 回归钉子（此前该工具只做字段预检就返回"验证通过"）。
 */
@DisplayName("DraftRunService：会话草稿整流试跑")
class DraftRunServiceTest extends AbstractNodeTest {

    private final DraftRunService service = new DraftRunService(mock(AgentModelConfigService.class));

    @Test
    @DisplayName("真执行：正例跑出 result=命中，每个节点都有状态，无失败节点")
    void executesDraftAndReportsNodes() {
        JSONObject draft = JSONUtil.parseObj(loadWorkflowJson("condition-code-flow"));
        DraftRunService.RunReport report = service.run(draft, new JSONObject().set("input_text", "hello gaia world"));

        assertTrue(report.success, "报告: " + report.toJson());
        assertNotNull(report.outputs);
        assertEquals("命中", report.outputs.get("result"));
        assertTrue(report.failedNodes.isEmpty(), "不应有失败节点: " + report.failedNodes);
        for (String id : new String[]{"start_1", "condition_2", "code_3", "end_4"}) {
            assertTrue(report.nodes.containsKey(id), "缺节点报告: " + id);
        }
        assertTrue(report.timeCostMs >= 0);
    }

    @Test
    @DisplayName("反例同样真跑：result=未命中")
    void negativeInputGoesThroughElseBranch() {
        JSONObject draft = JSONUtil.parseObj(loadWorkflowJson("condition-code-flow"));
        DraftRunService.RunReport report = service.run(draft, new JSONObject().set("input_text", "hello world"));
        assertTrue(report.success, "报告: " + report.toJson());
        assertEquals("未命中", report.outputs.get("result"));
    }

    @Test
    @DisplayName("业务字段预检不过直接打回：不执行、issues 非空")
    void precheckBlocksBrokenDraft() {
        JSONObject draft = JSONUtil.parseObj(loadWorkflowJson("condition-code-flow"));
        // 把 code 节点脚本抹掉 → 预检必须拦住
        for (Object n : draft.getJSONArray("nodes")) {
            JSONObject node = (JSONObject) n;
            if ("code".equals(node.getStr("type"))) {
                node.getJSONObject("data").remove("script");
            }
        }
        DraftRunService.RunReport report = service.run(draft, new JSONObject().set("input_text", "x"));
        assertFalse(report.success);
        assertNotNull(report.issues);
        assertFalse(report.issues.isEmpty());
        assertTrue(report.nodes.isEmpty(), "预检失败不应进入执行");
    }

    @Test
    @DisplayName("空画布与 null 直接失败，不抛异常")
    void emptyDraftFailsGracefully() {
        assertFalse(service.run(null, null).success);
        assertFalse(service.run(new JSONObject(), null).success);
    }
}
