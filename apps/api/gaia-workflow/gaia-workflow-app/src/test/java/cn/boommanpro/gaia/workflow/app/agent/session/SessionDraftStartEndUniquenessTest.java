package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.infra.manage.service.AgentArtifactService;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * AI 画布工具写入口的 start/end 唯一性（与 WorkflowDslValidator 的 MULTI_START/MULTI_END 同口径）：
 * 第二个 start/end 在 node(action=add) 当场拒绝，而不是攒到落版才被校验打回。
 */
class SessionDraftStartEndUniquenessTest {

    private static SessionWorkflowDraftService service() {
        return new SessionWorkflowDraftService(
            new SessionArtifactStore(Mockito.mock(AgentArtifactService.class), null),
            Mockito.mock(SessionWorkflowStore.class),
            new SessionEventBus());
    }

    @Test
    @DisplayName("第二个 end 被拒绝：回执点名已有 end 并指引汇合，草稿里仍只有一个 end")
    void secondEndIsRejected() {
        SessionWorkflowDraftService service = service();
        String key = "s-end-unique";
        assertTrue(service.addNode(key, new JSONObject().set("type", "start")).getBool("success", false));
        JSONObject first = service.addNode(key, new JSONObject().set("type", "end").set("id", "end_1"));
        assertTrue(first.getBool("success", false));

        JSONObject second = service.addNode(key, new JSONObject().set("type", "end").set("id", "end_2"));

        assertFalse(second.getBool("success", true), "第二个 end 必须被拒绝: " + second);
        String error = second.getStr("error");
        assertTrue(error.contains("end_1"), "回执要点名已有 end 的 id: " + error);
        assertTrue(error.contains("connect"), "回执要指引改接已有 end: " + error);
        long ends = service.get(key).getJSONArray("nodes").stream()
            .filter(n -> "end".equals(((JSONObject) n).getStr("type"))).count();
        assertEquals(1, ends);
    }

    @Test
    @DisplayName("第二个 start 同样被拒绝")
    void secondStartIsRejected() {
        SessionWorkflowDraftService service = service();
        String key = "s-start-unique";
        assertTrue(service.addNode(key, new JSONObject().set("type", "start").set("id", "start_1")).getBool("success", false));

        JSONObject second = service.addNode(key, new JSONObject().set("type", "start"));

        assertFalse(second.getBool("success", true));
        assertTrue(second.getStr("error").contains("start_1"));
    }

    @Test
    @DisplayName("删掉旧 end 后可以再加一个：唯一性是「同时只能有一个」，不是「一次性」")
    void endCanBeReAddedAfterDelete() {
        SessionWorkflowDraftService service = service();
        String key = "s-end-readd";
        service.addNode(key, new JSONObject().set("type", "start"));
        JSONObject first = service.addNode(key, new JSONObject().set("type", "end"));
        service.deleteNode(key, first.getStr("nodeId"));

        JSONObject again = service.addNode(key, new JSONObject().set("type", "end"));

        assertTrue(again.getBool("success", false), "删除后重新添加 end 必须成功: " + again);
    }

    @Test
    @DisplayName("非 start/end 类型不受影响：同类型节点可以多个")
    void otherTypesAreNotLimited() {
        SessionWorkflowDraftService service = service();
        String key = "s-other";
        assertTrue(service.addNode(key, new JSONObject().set("type", "llm")).getBool("success", false));
        assertTrue(service.addNode(key, new JSONObject().set("type", "llm")).getBool("success", false));
        assertEquals(2, service.get(key).getJSONArray("nodes").size());
    }
}
