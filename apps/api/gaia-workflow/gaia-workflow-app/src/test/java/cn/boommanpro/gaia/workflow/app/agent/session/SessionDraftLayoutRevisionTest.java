package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.infra.manage.service.AgentArtifactService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 修订语义与自动布局回归（2026-10-25 用户定义）：
 * · 节点增删/属性修改 = 实质变更（draftRevision +1）；仅坐标变化 = layout 变更
 *   （revision 不动，但记 _meta.layoutUserTouched）；
 * · run 结束的自动分层布局只对「用户从未摆过」的草稿生效；摆过一次永久让位；
 * · 一字长蛇阵（宽高比 > 6）才重排，接近分层的布局不折腾（防每次小改后节点跳动）。
 */
@DisplayName("会话草稿：layout-only 修订语义 + 自动分层布局门控")
class SessionDraftLayoutRevisionTest {

    private static SessionWorkflowDraftService newService() {
        return new SessionWorkflowDraftService(
            new SessionArtifactStore(org.mockito.Mockito.mock(AgentArtifactService.class), null),
            org.mockito.Mockito.mock(SessionWorkflowStore.class),
            new SessionEventBus());
    }

    /** 构建一条 6 节点一字长蛇（全部同一行，间距 320） */
    private JSONObject snakeDsl(int count) {
        JSONObject doc = new JSONObject();
        JSONArray nodes = new JSONArray();
        JSONArray edges = new JSONArray();
        String prev = null;
        for (int i = 0; i < count; i++) {
            String id = "n" + i;
            nodes.set(new JSONObject().set("id", id).set("type", i == 0 ? "start" : (i == count - 1 ? "end" : "code"))
                .set("meta", new JSONObject().set("position", new JSONObject().set("x", 137 + i * 999).set("y", 431)))
                .set("data", new JSONObject().set("title", "节点" + i)));
            if (prev != null) {
                edges.set(new JSONObject().set("sourceNodeID", prev).set("targetNodeID", id));
            }
            prev = id;
        }
        return doc.set("nodes", nodes).set("edges", edges);
    }

    @Test
    @DisplayName("push 仅改坐标：revision 不变，layoutUserTouched 置位")
    void layoutOnlyPushKeepsRevision() {
        SessionWorkflowDraftService service = newService();
        service.push("s", snakeDsl(4), null, null);
        int revAfterFirst = service.getDraftRevision("s");

        // 同内容、仅挪一个节点坐标
        JSONObject moved = snakeDsl(4);
        moved.getJSONArray("nodes").getJSONObject(2).getJSONObject("meta")
            .set("position", new JSONObject().set("x", 999).set("y", 888));
        service.push("s", moved, null, null);

        assertEquals(revAfterFirst, service.getDraftRevision("s"), "仅坐标变化不得 bump revision");
        assertTrue(service.getMeta("s").getBool("layoutUserTouched", false),
            "用户摆过布局必须置位（自动布局让位依据）");
    }

    @Test
    @DisplayName("push 改属性：revision +1（内容变更照旧记账）")
    void contentPushBumpsRevision() {
        SessionWorkflowDraftService service = newService();
        service.push("s", snakeDsl(4), null, null);
        int rev = service.getDraftRevision("s");

        JSONObject edited = snakeDsl(4);
        edited.getJSONArray("nodes").getJSONObject(1).getJSONObject("data").set("title", "改了标题");
        service.push("s", edited, null, null);

        assertEquals(rev + 1, service.getDraftRevision("s"), "属性修改必须 +1");
    }

    @Test
    @DisplayName("蛇形草稿在 run 结束被重排为分层；分层后再跑不折腾；用户摆过后永久让位")
    void autoLayoutGating() {
        SessionWorkflowDraftService service = newService();
        service.push("s", snakeDsl(6), null, null);

        // 首节点常为布局基点（x 不动），以末节点坐标收敛验证重排
        long xBefore = service.get("s").getJSONArray("nodes").getJSONObject(5)
            .getJSONObject("meta").getJSONObject("position").getLong("x");
        service.autoLayoutIfUntouched("s");
        long xAfter = service.get("s").getJSONArray("nodes").getJSONObject(5)
            .getJSONObject("meta").getJSONObject("position").getLong("x");
        assertTrue(xAfter != xBefore, "蛇形（宽高比>6）必须被重排");
        assertFalse(service.getMeta("s").containsKey("layoutUserTouched"),
            "自动布局不得置位用户标记");

        // 已分层（宽高比 < 6）后再跑：位置不动
        JSONObject laid = new JSONObject(service.get("s").toString());
        service.autoLayoutIfUntouched("s");
        JSONObject again = service.get("s");
        assertEquals(laid.getJSONArray("nodes").getJSONObject(1).getJSONObject("meta").getJSONObject("position").getLong("x"),
            again.getJSONArray("nodes").getJSONObject(1).getJSONObject("meta").getJSONObject("position").getLong("x"),
            "接近分层的布局不得重排（防节点跳动）");

        // 用户手动摆一次后：即使摆成蛇形也不再自动布局
        JSONObject snakeAgain = snakeDsl(6);
        service.push("s", snakeAgain, null, null); // 坐标变化 → layoutUserTouched
        JSONObject before = new JSONObject(service.get("s").toString());
        service.autoLayoutIfUntouched("s");
        assertEquals(before.getJSONArray("nodes").getJSONObject(3).getJSONObject("meta").getJSONObject("position").getLong("x"),
            service.get("s").getJSONArray("nodes").getJSONObject(3).getJSONObject("meta").getJSONObject("position").getLong("x"),
            "用户摆过后自动布局必须让位");
    }
}
