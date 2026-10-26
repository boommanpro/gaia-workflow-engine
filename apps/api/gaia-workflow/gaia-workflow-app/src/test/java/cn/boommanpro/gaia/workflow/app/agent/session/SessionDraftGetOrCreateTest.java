package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentArtifactService;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 回归（2026-10-17 E2E 实证）：空会话首个变更操作（add_node）改的是孤儿空文档、
 * 改动静默丢失——get_canvas 永远为空。getOrCreate 修复后必须可见。
 */
class SessionDraftGetOrCreateTest {

    @Test
    @DisplayName("空会话首个 add_node 后，get/getNode/get_canvas 视角必须可见")
    void firstAddNodeIsVisible() {
        SessionWorkflowDraftService service = new SessionWorkflowDraftService(new SessionArtifactStore(org.mockito.Mockito.mock(AgentArtifactService.class), null), org.mockito.Mockito.mock(SessionWorkflowStore.class), new SessionEventBus());
        JSONObject result = service.addNode("s-orphan", new JSONObject()
            .set("type", "start")
            .set("title", "开始"));
        assertTrue(result.getBool("success", false));

        assertEquals(1, service.get("s-orphan").getJSONArray("nodes").size(),
            "add_node 后草稿必须包含节点");
        assertNotNull(service.getNode("s-orphan", result.getStr("nodeId")),
            "get_node 必须能看到刚加的节点");
    }

    @Test
    @DisplayName("后续 connect/remove 等操作在同一草稿上持续生效")
    void subsequentOpsShareDraft() {
        SessionWorkflowDraftService service = new SessionWorkflowDraftService(new SessionArtifactStore(org.mockito.Mockito.mock(AgentArtifactService.class), null), org.mockito.Mockito.mock(SessionWorkflowStore.class), new SessionEventBus());
        JSONObject n1 = service.addNode("s-share", new JSONObject().set("type", "start"));
        JSONObject n2 = service.addNode("s-share", new JSONObject().set("type", "end"));
        service.connect("s-share", new JSONObject()
            .set("from", n1.getStr("nodeId")).set("to", n2.getStr("nodeId")));
        assertEquals(1, service.get("s-share").getJSONArray("edges").size());
        service.deleteNode("s-share", n2.getStr("nodeId"));
        assertEquals(0, service.get("s-share").getJSONArray("edges").size(),
            "deleteNode 必须级联删除连线");
    }
}
